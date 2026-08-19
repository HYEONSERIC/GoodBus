import express from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole, NotificationType, BusSize } from '@prisma/client';
import { sendBidReceivedEmail } from '../utils/email';
import { CONCURRENT_BID_LIMITS } from '../utils/membershipLimits';

const router = express.Router();

const createBidSchema = z.object({
    tripId: z.string(),
    price: z.number().positive(),
    note: z.string().optional(),
});

router.post(
    '/',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const { tripId, price, note } = createBidSchema.parse(req.body);

            const bidder = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: {
                    role: true,
                    driverLicenseStatus: true,
                    companyRegistrationStatus: true,
                    membershipPlan: true,
                },
            });

            if (!bidder) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (
                bidder.role === UserRole.Driver &&
                bidder.driverLicenseStatus !== 'approved'
            ) {
                return res.status(403).json({
                    error: 'Driver verification required',
                    status: bidder.driverLicenseStatus,
                });
            }

            if (
                bidder.role === UserRole.BusCompany &&
                bidder.companyRegistrationStatus !== 'approved'
            ) {
                return res.status(403).json({
                    error: 'Company verification required',
                    status: bidder.companyRegistrationStatus,
                });
            }

            const billingKey = await prisma.billingKey.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!billingKey) {
                return res.status(400).json({
                    error: '결제 카드 등록 후 입찰할 수 있습니다',
                    requiresBillingKey: true,
                });
            }

            const trip = await prisma.trip.findUnique({
                where: { id: tripId },
            });

            if (!trip) {
                return res.status(404).json({ error: 'Trip not found' });
            }

            if (trip.status !== 'open') {
                return res
                    .status(400)
                    .json({ error: 'Trip is not open for bidding' });
            }

            const activeBidCount = await prisma.bid.count({
                where: { bidderId: req.user!.userId, status: 'open' },
            });
            const bidLimit = CONCURRENT_BID_LIMITS[bidder.membershipPlan];

            if (activeBidCount >= bidLimit) {
                return res.status(400).json({
                    error: 'Concurrent active bid limit reached for your membership plan',
                    limit: bidLimit,
                    current: activeBidCount,
                });
            }

            const bid = await prisma.bid.create({
                data: {
                    tripId,
                    bidderId: req.user!.userId,
                    price,
                    note,
                },
                include: {
                    trip: {
                        include: {
                            passenger: {
                                select: {
                                    id: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    bidder: {
                        select: {
                            id: true,
                            email: true,
                            displayName: true,
                            role: true,
                        },
                    },
                },
            });

            const bidderLabel = bid.bidder.displayName || bid.bidder.email || '기사';

            // Create notification for passenger
            await prisma.notification.create({
                data: {
                    userId: bid.trip.passenger.id,
                    type: NotificationType.BID_RECEIVED,
                    title: 'New Bid Received',
                    message: `You received a new bid of ${price}만원 from ${bidderLabel} for your trip from ${bid.trip.origin} to ${bid.trip.destination}`,
                    tripId: tripId,
                    bidId: bid.id,
                },
            });

            // Send email to passenger
            sendBidReceivedEmail(
                bid.trip.passenger.email,
                bid.trip.origin,
                bid.trip.destination,
                Number(price),
                bid.bidder.email
            );

            res.status(201).json({ bid });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            console.error('Create bid error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.get(
    '/min-by-vehicle-type',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const bidder = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { minBidAddonPurchased: true },
        });

        if (!bidder) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!bidder.minBidAddonPurchased) {
            return res.json({ purchased: false });
        }

        const busSizes: BusSize[] = ['small', 'medium', 'large'];
        const results = await Promise.all(
            busSizes.map((busSize) =>
                prisma.bid.aggregate({
                    where: { status: 'awarded', trip: { busSize } },
                    _min: { price: true },
                })
            )
        );

        const minByVehicleType = Object.fromEntries(
            busSizes.map((busSize, i) => [
                busSize,
                results[i]._min.price !== null
                    ? Number(results[i]._min.price)
                    : null,
            ])
        );

        res.json({ purchased: true, minByVehicleType });
    }
);

router.patch('/:id/withdraw', requireAuth, async (req, res) => {
    const bid = await prisma.bid.findUnique({
        where: { id: req.params.id },
    });

    if (!bid) {
        return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.bidderId !== req.user!.userId) {
        return res.status(403).json({ error: 'Not your bid' });
    }

    if (bid.status !== 'open') {
        return res.status(400).json({ error: 'Bid cannot be withdrawn' });
    }

    const updatedBid = await prisma.bid.update({
        where: { id: req.params.id },
        data: { status: 'withdrawn' },
    });

    res.json({ bid: updatedBid });
});

export default router;
