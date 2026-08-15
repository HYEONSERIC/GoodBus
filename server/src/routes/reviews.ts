import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { getStorageService } from '../services/storage';
import { imageFileFilter, InvalidImageError } from '../utils/uploadFileFilter';

const router = express.Router();
const storage = getStorageService();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
});

const MAX_REVIEW_PHOTOS = 4;

const createReviewSchema = z.object({
    tripId: z.string().min(1),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
});

function tripSelectForReview() {
    return {
        origin: true,
        destination: true,
        dateTime: true,
        servicePurpose: true,
    } as const;
}

function reviewSelect() {
    return {
        id: true,
        tripId: true,
        rating: true,
        comment: true,
        imageUrls: true,
        createdAt: true,
        passenger: {
            select: {
                id: true,
                displayName: true,
                email: true,
            },
        },
    } as const;
}

function computeDriverReviewStats(reviews: { rating: number }[]) {
    const count = reviews.length;
    const avgRating =
        count > 0
            ? reviews.reduce((s, r) => s + r.rating, 0) / count
            : null;
    return { avgRating, count };
}

const BIDDER_ROLES = [UserRole.Driver, UserRole.BusCompany] as const;

async function findBidderUser(driverId: string) {
    return prisma.user.findFirst({
        where: { id: driverId, role: { in: [...BIDDER_ROLES] } },
        select: { id: true },
    });
}

/** 승객: 내 완료 여정 리뷰 목록 (tripId 목록으로 조회) */
router.get('/', requireAuth, async (req, res) => {
    const tripIdsRaw = req.query.tripIds;
    const tripIds =
        typeof tripIdsRaw === 'string'
            ? tripIdsRaw.split(',').filter(Boolean)
            : [];

    if (tripIds.length === 0) {
        return res.json({ reviews: [] });
    }

    const reviews = await prisma.tripReview.findMany({
        where: {
            tripId: { in: tripIds },
            ...(req.user!.role === UserRole.Passenger
                ? { passengerId: req.user!.userId }
                : {}),
        },
        select: {
            ...reviewSelect(),
            trip: { select: tripSelectForReview() },
        },
    });

    res.json({ reviews });
});

/** 기사: 내 프로필 후기 + 평균 별점 */
router.get('/driver/me', requireAuth, requireRole(UserRole.Driver, UserRole.BusCompany), async (req, res) => {
    const reviews = await prisma.tripReview.findMany({
        where: { driverId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        select: {
            ...reviewSelect(),
            trip: { select: tripSelectForReview() },
        },
    });

    const { avgRating, count } = computeDriverReviewStats(reviews);
    res.json({ reviews, avgRating, count });
});

/** 승객 등: 입찰자(기사·회사)별 평균 별점 요약 (목록용) */
router.get('/drivers/summary', requireAuth, async (req, res) => {
    const raw = req.query.driverIds;
    const driverIds =
        typeof raw === 'string'
            ? [...new Set(raw.split(',').filter(Boolean))]
            : [];

    if (driverIds.length === 0) {
        return res.json({ byDriverId: {} });
    }

    const bidders = await prisma.user.findMany({
        where: { id: { in: driverIds }, role: { in: [...BIDDER_ROLES] } },
        select: { id: true },
    });
    const validIds = bidders.map((u) => u.id);

    const byDriverId: Record<
        string,
        { avgRating: number | null; count: number }
    > = {};
    for (const id of validIds) {
        byDriverId[id] = { avgRating: null, count: 0 };
    }

    if (validIds.length === 0) {
        return res.json({ byDriverId });
    }

    const grouped = await prisma.tripReview.groupBy({
        by: ['driverId'],
        where: { driverId: { in: validIds } },
        _avg: { rating: true },
        _count: { _all: true },
    });

    for (const row of grouped) {
        byDriverId[row.driverId] = {
            avgRating: row._avg.rating,
            count: row._count._all,
        };
    }

    res.json({ byDriverId });
});

/** 승객 등: 입찰자 프로필용 후기 목록 + 평균 별점 */
router.get('/drivers/:driverId', requireAuth, async (req, res) => {
    const driverId = req.params.driverId;
    const bidder = await findBidderUser(driverId);
    if (!bidder) {
        return res.status(404).json({ error: '입찰자를 찾을 수 없습니다.' });
    }

    const reviews = await prisma.tripReview.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
        select: {
            ...reviewSelect(),
            trip: { select: tripSelectForReview() },
        },
    });

    const { avgRating, count } = computeDriverReviewStats(reviews);
    res.json({ reviews, avgRating, count });
});

/** 승객: 운행 완료 여정에 리뷰 등록 */
function normalizeUploadedPhotos(
    files: Express.Multer.File[] | Express.Multer.File | undefined,
): Express.Multer.File[] {
    if (!files) return [];
    return Array.isArray(files) ? files : [files];
}

router.post(
    '/',
    requireAuth,
    requireRole(UserRole.Passenger),
    upload.array('photos', MAX_REVIEW_PHOTOS),
    async (req, res) => {
        try {
            const { tripId, rating, comment } = createReviewSchema.parse(
                req.body,
            );

            const trip = await prisma.trip.findUnique({
                where: { id: tripId },
                include: {
                    bids: {
                        where: { status: 'awarded' },
                        take: 1,
                    },
                    review: true,
                },
            });

            if (!trip) {
                return res.status(404).json({ error: '여정을 찾을 수 없습니다.' });
            }
            if (trip.passengerId !== req.user!.userId) {
                return res.status(403).json({ error: '본인 여정만 리뷰할 수 있습니다.' });
            }
            if (trip.status !== 'awarded') {
                return res.status(400).json({ error: '낙찰된 여정만 리뷰할 수 있습니다.' });
            }
            if (new Date(trip.dateTime).getTime() >= Date.now()) {
                return res.status(400).json({ error: '출발 후에 리뷰를 남길 수 있습니다.' });
            }
            if (trip.review) {
                return res.status(400).json({ error: '이미 리뷰를 등록했습니다.' });
            }

            const awardedBid = trip.bids[0];
            if (!awardedBid) {
                return res.status(400).json({ error: '낙찰된 기사 정보가 없습니다.' });
            }

            const photos = normalizeUploadedPhotos(
                req.files as Express.Multer.File[] | undefined,
            );

            if (photos.length > MAX_REVIEW_PHOTOS) {
                return res.status(400).json({
                    error: `사진은 최대 ${MAX_REVIEW_PHOTOS}장까지 등록할 수 있습니다.`,
                });
            }

            const imageUrls: string[] = [];
            for (const [index, file] of photos.entries()) {
                if (!file.mimetype.startsWith('image/')) {
                    return res.status(400).json({ error: '이미지 파일만 업로드할 수 있습니다.' });
                }
                const url = await storage.saveFile({
                    buffer: file.buffer,
                    mimetype: file.mimetype,
                    folder: 'trip-reviews',
                    filePrefix: `${req.user!.userId}-${tripId}-${index}`,
                });
                imageUrls.push(url);
            }

            const review = await prisma.tripReview.create({
                data: {
                    tripId,
                    passengerId: req.user!.userId,
                    driverId: awardedBid.bidderId,
                    rating,
                    comment: comment?.trim() || null,
                    imageUrls,
                },
                select: reviewSelect(),
            });

            res.status(201).json({ review });
        } catch (e) {
            if (e instanceof z.ZodError) {
                return res.status(400).json({ error: e.errors[0]?.message || 'Invalid input' });
            }
            if (e instanceof InvalidImageError) {
                return res.status(400).json({ error: e.message });
            }
            console.error('Create review error:', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

export default router;
