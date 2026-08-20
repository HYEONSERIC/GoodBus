import express from 'express';
import path from 'path';
import prisma from '../utils/db';
import { requireAuth, requireRole, requireAdminRole, canViewRevenue } from '../middleware/auth';
import {
    UserRole,
    UserStatus,
    VerificationStatus,
    BidStatus,
    AdminRole,
    SupportPostKind,
    TripStatus,
    NotificationType,
    Prisma,
} from '@prisma/client';
import {
    formatSupportAuthorLabel,
    parseSupportPostKind,
} from '../utils/supportPost';
import { formatSupportInquiryCategory } from '../utils/supportInquiry';
import {
    groupTripsForDisplay,
    summarizePassengerTrips,
} from '../utils/tripGroups';
import {
    attachNotificationHistoryDetails,
    buildReadAtFilter,
    deleteExpiredNotificationHistory,
    parseNotificationType,
    parsePagination,
} from '../utils/notificationHistory';
import {
    computeAdminRevenueStats,
    listRevenueAwardsForMonth,
    listRevenueAwardsInRange,
    monthRangeBounds,
    parseYearMonth,
} from '../utils/adminRevenue';
import { getAdminOverviewExtras } from '../utils/adminOverview';
import {
    computeBidderAwardStats,
    computeReviewSummaryForUser,
} from '../utils/adminUserStats';
import {
    listAdminSupportInquiries,
    parseSupportInquiryListSort,
    parseSupportInquiryListStatus,
} from '../utils/adminSupportInquiryList';
import { recordAdminAudit } from '../utils/adminAuditLog';

const router = express.Router();

/**
 * Query-string values are attacker-controlled. Prisma throws PrismaClientValidationError
 * for enum values outside the schema, which — with no try/catch on these routes and no
 * unhandledRejection handler — crashes the whole process (Express 4 doesn't auto-catch
 * async rejections). Always parse untrusted enum input through this instead of `as any`.
 */
function parseEnumQuery<T extends Record<string, string>>(
    enumObj: T,
    value: unknown,
): T[keyof T] | undefined {
    if (typeof value !== 'string') return undefined;
    return (Object.values(enumObj) as string[]).includes(value)
        ? (value as T[keyof T])
        : undefined;
}

router.get('/overview', requireAuth, requireRole(UserRole.Admin), async (req, res) => {
    const activeTripWhere = { status: { not: TripStatus.cancelled } };

    const [userCount, tripCount, bidCount, extras, canSeeRevenue] = await Promise.all([
        prisma.user.count(),
        prisma.trip.count({ where: activeTripWhere }),
        prisma.bid.count(),
        getAdminOverviewExtras(),
        canViewRevenue(req.user!.userId),
    ]);

    const recentTrips = await prisma.trip.findMany({
        where: activeTripWhere,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
            passenger: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    displayName: true,
                    companyName: true,
                },
            },
        },
    });

    const recentBids = await prisma.bid.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
            trip: {
                select: {
                    id: true,
                    origin: true,
                    destination: true,
                },
            },
            bidder: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    displayName: true,
                    companyName: true,
                    role: true,
                },
            },
        },
    });

    res.json({
        counts: {
            users: userCount,
            trips: tripCount,
            bids: bidCount,
        },
        awardsToday: canSeeRevenue
            ? extras.awardsToday
            : { ...extras.awardsToday, gmvManWon: 0 },
        awardsThisWeek: canSeeRevenue
            ? extras.awardsThisWeek
            : { ...extras.awardsThisWeek, gmvManWon: 0 },
        pendingInquiries: extras.pendingInquiries,
        pendingVerifications: extras.pendingVerifications,
        navBadges: extras.navBadges,
        recentTrips,
        recentBids: canSeeRevenue
            ? recentBids
            : recentBids.map((bid) => ({ ...bid, price: 0 })),
    });
});

router.get('/users', requireAuth, requireRole(UserRole.Admin), async (req, res) => {
    const { role, status, search } = req.query;

    const users = await prisma.user.findMany({
        where: {
            role: role ? parseEnumQuery(UserRole, role) : undefined,
            status: status ? parseEnumQuery(UserStatus, status) : undefined,
            // 전화 전용 가입자는 email이 없어서 email만으로 검색하면 못 찾음 —
            // phoneNumber/displayName/companyName도 같이 검색되게 OR로 확장.
            ...(search
                ? {
                      OR: [
                          {
                              email: {
                                  contains: String(search),
                                  mode: 'insensitive',
                              },
                          },
                          {
                              phoneNumber: {
                                  contains: String(search),
                              },
                          },
                          {
                              displayName: {
                                  contains: String(search),
                                  mode: 'insensitive',
                              },
                          },
                          {
                              companyName: {
                                  contains: String(search),
                                  mode: 'insensitive',
                              },
                          },
                      ],
                  }
                : {}),
        },
        select: {
            id: true,
            email: true,
            phoneNumber: true,
            displayName: true,
            companyName: true,
            role: true,
            status: true,
            adminRole: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        // 프론트(AdminUsersPanel)가 전량 배열을 기대하는 구조라 페이지네이션
        // UI 개편은 이번 범위에서 보류 — 대신 사용자 수가 늘어도 쿼리가
        // 무제한으로 커지지 않도록 안전 상한만 둔다.
        take: 1000,
    });

    res.json({ users });
});

router.get(
    '/notification-history',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        try {
            await deleteExpiredNotificationHistory();

            const canSeeRevenue = await canViewRevenue(req.user!.userId);

            const { page, pageSize, skip, take } = parsePagination(req.query);
            const search = String(req.query.search || '').trim();
            const userId = String(req.query.userId || '').trim();
            const type = parseNotificationType(req.query.type);
            const readAt = buildReadAtFilter(
                req.query.startDate,
                req.query.endDate
            );

            // message embeds bid prices for BID_RECEIVED/BID_AWARDED rows —
            // dropping it from the search OR-clause for revenue-restricted
            // admins closes an enumerate-by-price side channel (?search=$777).
            const where = {
                type,
                readAt,
                userId: userId || undefined,
                ...(search
                    ? {
                          OR: [
                              {
                                  user: {
                                      email: {
                                          contains: search,
                                          mode: 'insensitive' as const,
                                      },
                                  },
                              },
                              {
                                  user: {
                                      phoneNumber: { contains: search },
                                  },
                              },
                              {
                                  user: {
                                      displayName: {
                                          contains: search,
                                          mode: 'insensitive' as const,
                                      },
                                  },
                              },
                              {
                                  user: {
                                      companyName: {
                                          contains: search,
                                          mode: 'insensitive' as const,
                                      },
                                  },
                              },
                              {
                                  title: {
                                      contains: search,
                                      mode: 'insensitive' as const,
                                  },
                              },
                              ...(canSeeRevenue
                                  ? [
                                        {
                                            message: {
                                                contains: search,
                                                mode: 'insensitive' as const,
                                            },
                                        },
                                    ]
                                  : []),
                          ],
                      }
                    : {}),
            };

            const [rows, total] = await Promise.all([
                prisma.notificationHistory.findMany({
                    where,
                    orderBy: { readAt: 'desc' },
                    skip,
                    take,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                phoneNumber: true,
                                displayName: true,
                                companyName: true,
                                role: true,
                            },
                        },
                    },
                }),
                prisma.notificationHistory.count({ where }),
            ]);

            const history = await attachNotificationHistoryDetails(rows);
            const isRevenueType = (t: NotificationType) =>
                t === NotificationType.BID_RECEIVED ||
                t === NotificationType.BID_AWARDED;

            res.json({
                history: canSeeRevenue
                    ? history
                    : history.map((row) => ({
                          ...row,
                          bid: row.bid ? { ...row.bid, price: 0 } : row.bid,
                          message: isRevenueType(row.type)
                              ? '[금액 정보 비공개]'
                              : row.message,
                      })),
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            });
        } catch (error) {
            console.error('Get admin notification history error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.patch(
    '/users/:id/status',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const { status } = req.body as { status?: 'Active' | 'Blocked' };

        if (!status || !['Active', 'Blocked'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const target = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { role: true, adminRole: true, status: true },
        });

        if (!target) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (target.role === UserRole.Admin) {
            const actor = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: { adminRole: true },
            });

            if (actor?.adminRole !== AdminRole.Super) {
                return res
                    .status(403)
                    .json({ error: 'Only super admins can modify admin accounts' });
            }
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { status },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                adminRole: true,
                createdAt: true,
            },
        });

        void recordAdminAudit({
            actorId: req.user!.userId,
            action: 'user.status.update',
            targetType: 'User',
            targetId: user.id,
            metadata: { from: target.status, to: status, email: user.email },
        });

        res.json({ user });
    }
);

router.get(
    '/users/:id',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                adminRole: true,
                displayName: true,
                companyName: true,
                phoneNumber: true,
                garageAddress: true,
                busNumber: true,
                busType: true,
                busYear: true,
                capacity: true,
                profileImageUrl: true,
                vehicleImageUrls: true,
                driverLicenseUrl: true,
                driverLicenseStatus: true,
                driverLicenseNote: true,
                companyRegistrationUrl: true,
                companyRegistrationStatus: true,
                companyRegistrationNote: true,
                createdAt: true,
                _count: {
                    select: {
                        tripsAsPassenger: {
                            where: { status: { not: TripStatus.cancelled } },
                        },
                        bids: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let tripSummary: ReturnType<typeof summarizePassengerTrips> | null =
            null;
        if (user.role === UserRole.Passenger) {
            const passengerTrips = await prisma.trip.findMany({
                where: {
                    passengerId: user.id,
                    status: { not: TripStatus.cancelled },
                },
                select: {
                    id: true,
                    origin: true,
                    destination: true,
                    dateTime: true,
                    status: true,
                },
            });
            tripSummary = summarizePassengerTrips(passengerTrips);
        }

        let bidderStats = null;
        if (
            user.role === UserRole.Driver ||
            user.role === UserRole.BusCompany
        ) {
            bidderStats = await computeBidderAwardStats(user.id);
        }

        const reviewSummary = await computeReviewSummaryForUser(
            user.id,
            user.role,
        );

        const canSeeRevenue = await canViewRevenue(req.user!.userId);
        res.json({
            user,
            tripSummary,
            bidderStats:
                bidderStats && !canSeeRevenue
                    ? { ...bidderStats, gmvManWon: 0 }
                    : bidderStats,
            reviewSummary,
        });
    }
);

router.get(
    '/users/:id/activity',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const userId = req.params.id;
        const take = Math.min(Number(req.query.take) || 10, 50);

        const now = new Date();
        const tripRows = await prisma.trip.findMany({
            where: {
                passengerId: userId,
                status: { not: TripStatus.cancelled },
                OR: [
                    { status: { not: TripStatus.open } },
                    { dateTime: { gte: now } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                origin: true,
                destination: true,
                dateTime: true,
                status: true,
                createdAt: true,
            },
        });

        const trips = groupTripsForDisplay(tripRows).slice(0, take);

        const bids = await prisma.bid.findMany({
            where: { bidderId: userId },
            orderBy: { createdAt: 'desc' },
            take,
            include: {
                trip: {
                    select: {
                        id: true,
                        origin: true,
                        destination: true,
                        status: true,
                    },
                },
            },
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        let reviews: Array<{
            id: string;
            rating: number;
            comment: string | null;
            createdAt: Date;
            trip: { id: string; origin: string; destination: string };
            counterpartyEmail: string;
        }> = [];

        if (user) {
            if (
                user.role === UserRole.Driver ||
                user.role === UserRole.BusCompany
            ) {
                const rows = await prisma.tripReview.findMany({
                    where: { driverId: userId },
                    orderBy: { createdAt: 'desc' },
                    take,
                    select: {
                        id: true,
                        rating: true,
                        comment: true,
                        createdAt: true,
                        trip: {
                            select: {
                                id: true,
                                origin: true,
                                destination: true,
                            },
                        },
                        passenger: {
                            select: {
                                email: true,
                                displayName: true,
                                companyName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                });
                reviews = rows.map((r) => ({
                    id: r.id,
                    rating: r.rating,
                    comment: r.comment,
                    createdAt: r.createdAt,
                    trip: r.trip,
                    counterpartyEmail:
                        r.passenger.displayName ||
                        r.passenger.companyName ||
                        r.passenger.email ||
                        r.passenger.phoneNumber ||
                        '알 수 없음',
                }));
            } else if (user.role === UserRole.Passenger) {
                const rows = await prisma.tripReview.findMany({
                    where: { passengerId: userId },
                    orderBy: { createdAt: 'desc' },
                    take,
                    select: {
                        id: true,
                        rating: true,
                        comment: true,
                        createdAt: true,
                        trip: {
                            select: {
                                id: true,
                                origin: true,
                                destination: true,
                            },
                        },
                        driver: {
                            select: {
                                email: true,
                                displayName: true,
                                companyName: true,
                                phoneNumber: true,
                            },
                        },
                    },
                });
                reviews = rows.map((r) => ({
                    id: r.id,
                    rating: r.rating,
                    comment: r.comment,
                    createdAt: r.createdAt,
                    trip: r.trip,
                    counterpartyEmail:
                        r.driver.displayName ||
                        r.driver.companyName ||
                        r.driver.email ||
                        r.driver.phoneNumber ||
                        '알 수 없음',
                }));
            }
        }

        const canSeeRevenue = await canViewRevenue(req.user!.userId);
        res.json({
            trips,
            bids: canSeeRevenue
                ? bids
                : bids.map((bid) => ({ ...bid, price: 0 })),
            reviews,
        });
    }
);

const verificationUserSelect = {
    id: true,
    email: true,
    phoneNumber: true,
    displayName: true,
    companyName: true,
    role: true,
    driverLicenseUrl: true,
    driverLicenseStatus: true,
    driverLicenseNote: true,
    companyRegistrationUrl: true,
    companyRegistrationStatus: true,
    companyRegistrationNote: true,
    createdAt: true,
} as const;

router.get(
    '/verifications',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const type = String(req.query.type || 'all');
        const status =
            req.query.status === undefined
                ? VerificationStatus.pending
                : parseEnumQuery(VerificationStatus, req.query.status);

        if (!status) {
            return res.status(400).json({ error: 'Invalid status filter' });
        }

        // AdminVerificationPanel도 전량 배열을 기대해 페이지네이션 UI 개편은
        // 보류 — 무제한 조회만 막는 안전 상한.
        const VERIFICATIONS_TAKE_CAP = 1000;

        if (type === 'all') {
            const [drivers, companies] = await Promise.all([
                prisma.user.findMany({
                    where: {
                        role: UserRole.Driver,
                        driverLicenseStatus: status,
                    },
                    select: verificationUserSelect,
                    orderBy: { createdAt: 'desc' },
                    take: VERIFICATIONS_TAKE_CAP,
                }),
                prisma.user.findMany({
                    where: {
                        role: UserRole.BusCompany,
                        companyRegistrationStatus: status,
                    },
                    select: verificationUserSelect,
                    orderBy: { createdAt: 'desc' },
                    take: VERIFICATIONS_TAKE_CAP,
                }),
            ]);
            const users = [...drivers, ...companies].sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            );
            return res.json({ users });
        }

        const isDriver = type === 'driver';
        const roleFilter = isDriver ? UserRole.Driver : UserRole.BusCompany;

        const users = await prisma.user.findMany({
            where: {
                role: roleFilter,
                ...(isDriver
                    ? { driverLicenseStatus: status }
                    : { companyRegistrationStatus: status }),
            },
            select: verificationUserSelect,
            orderBy: { createdAt: 'desc' },
            take: VERIFICATIONS_TAKE_CAP,
        });

        res.json({ users });
    }
);

router.get(
    '/verifications/:id/download',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const type = String(req.query.type || 'driver');
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                driverLicenseUrl: true,
                companyRegistrationUrl: true,
                email: true,
                phoneNumber: true,
                displayName: true,
                companyName: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const filePath =
            type === 'company'
                ? user.companyRegistrationUrl
                : user.driverLicenseUrl;

        if (!filePath) {
            return res.status(404).json({ error: 'File not found' });
        }

        const uploadRoot = path.join(process.cwd(), 'uploads');
        const relative = filePath.replace(/^\/uploads\//, '');
        const absolutePath = path.normalize(path.join(uploadRoot, relative));

        if (!absolutePath.startsWith(uploadRoot)) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        const ext = path.extname(absolutePath) || '.jpg';
        const label =
            user.companyName || user.displayName || user.email || user.phoneNumber;
        const safeLabel = label?.replace(/[^a-zA-Z0-9가-힣.-]/g, '_') || 'user';
        return res.download(absolutePath, `${type}-${safeLabel}${ext}`);
    }
);

router.patch(
    '/verifications/:id',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const type = String(req.query.type || 'driver');
        const { status, reason } = req.body as {
            status?: 'approved' | 'rejected';
            reason?: string;
        };

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const data =
            type === 'company'
                ? {
                      companyRegistrationStatus: status,
                      companyRegistrationNote: reason || null,
                  }
                : {
                      driverLicenseStatus: status,
                      driverLicenseNote: reason || null,
                  };

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
            select: {
                id: true,
                email: true,
                phoneNumber: true,
                displayName: true,
                companyName: true,
                role: true,
                driverLicenseStatus: true,
                companyRegistrationStatus: true,
            },
        });

        await prisma.notification.create({
            data: {
                userId: user.id,
                type:
                    status === 'approved'
                        ? 'VERIFICATION_APPROVED'
                        : 'VERIFICATION_REJECTED',
                title:
                    status === 'approved'
                        ? '인증 승인 완료'
                        : '인증 반려',
                message:
                    status === 'approved'
                        ? '제출한 서류가 승인되었습니다.'
                        : `인증이 반려되었습니다. 사유: ${reason || '사유 없음'}`,
            },
        });

        void recordAdminAudit({
            actorId: req.user!.userId,
            action: 'verification.review',
            targetType: 'User',
            targetId: user.id,
            metadata: { type, status, reason: reason || null, email: user.email },
        });

        res.json({ user });
    }
);

router.get(
    '/bids',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const search = String(req.query.search || '').trim();
        const bidStatus = String(req.query.bidStatus || '').trim();
        const tripStatus = String(req.query.tripStatus || '').trim();
        const startDate = String(req.query.startDate || '').trim();
        const endDate = String(req.query.endDate || '').trim();
        const bidderId = String(req.query.bidderId || '').trim();
        const passengerId = String(req.query.passengerId || '').trim();
        const tripId = String(req.query.tripId || '').trim();

        const createdAt: { gte?: Date; lte?: Date } = {};
        if (startDate) {
            createdAt.gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            createdAt.lte = end;
        }

        const tripWhere: {
            id?: string;
            passengerId?: string;
            status?: TripStatus;
        } = {};
        if (tripId) tripWhere.id = tripId;
        if (passengerId) tripWhere.passengerId = passengerId;
        if (tripStatus) {
            const parsedTripStatus = parseEnumQuery(TripStatus, tripStatus);
            if (parsedTripStatus) tripWhere.status = parsedTripStatus;
        }

        const where: Prisma.BidWhereInput = {
            bidderId: bidderId || undefined,
            status: bidStatus ? parseEnumQuery(BidStatus, bidStatus) : undefined,
            createdAt: Object.keys(createdAt).length ? createdAt : undefined,
            ...(Object.keys(tripWhere).length ? { trip: tripWhere } : {}),
            ...(search
                ? {
                      OR: [
                          {
                              bidder: {
                                  email: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          },
                          {
                              bidder: {
                                  phoneNumber: { contains: search },
                              },
                          },
                          {
                              bidder: {
                                  displayName: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          },
                          {
                              bidder: {
                                  companyName: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          },
                          {
                              trip: {
                                  passenger: {
                                      email: {
                                          contains: search,
                                          mode: 'insensitive',
                                      },
                                  },
                              },
                          },
                          {
                              trip: {
                                  passenger: {
                                      phoneNumber: { contains: search },
                                  },
                              },
                          },
                          {
                              trip: {
                                  origin: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          },
                          {
                              trip: {
                                  destination: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          },
                      ],
                  }
                : {}),
        };

        const take = Math.min(Number(req.query.take) || 50, 200);

        const [bids, totalMatching] = await Promise.all([
            prisma.bid.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take,
                include: {
                    bidder: {
                        select: {
                            id: true,
                            email: true,
                            phoneNumber: true,
                            displayName: true,
                            companyName: true,
                            role: true,
                        },
                    },
                    trip: {
                        select: {
                            id: true,
                            origin: true,
                            destination: true,
                            status: true,
                            passenger: {
                                select: {
                                    id: true,
                                    email: true,
                                    phoneNumber: true,
                                    displayName: true,
                                    companyName: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.bid.count({ where }),
        ]);

        const canSeeRevenue = await canViewRevenue(req.user!.userId);
        res.json({
            bids: canSeeRevenue
                ? bids
                : bids.map((bid) => ({ ...bid, price: 0 })),
            meta: { totalMatching, returned: bids.length },
        });
    }
);

router.post(
    '/admins',
    requireAuth,
    requireRole(UserRole.Admin),
    requireAdminRole(AdminRole.Super),
    async (req, res) => {
        const { email, password, adminRole } = req.body as {
            email?: string;
            password?: string;
            adminRole?: 'Super' | 'CustomerSupport' | 'Operations' | 'Finance';
        };

        if (!email || !password || !adminRole) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (adminRole === 'Super') {
            return res
                .status(400)
                .json({ error: 'Creating another super admin is disabled' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.hash(password, 10);

        const admin = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: UserRole.Admin,
                status: 'Active',
                adminRole,
            },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                adminRole: true,
                createdAt: true,
            },
        });

        void recordAdminAudit({
            actorId: req.user!.userId,
            action: 'admin.create',
            targetType: 'User',
            targetId: admin.id,
            metadata: { email: admin.email, adminRole: admin.adminRole },
        });

        res.status(201).json({ admin });
    }
);

router.get(
    '/support-posts',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        try {
            const kindParam = req.query.kind;
            const kind =
                kindParam === undefined || String(kindParam).trim() === ''
                    ? undefined
                    : parseSupportPostKind(kindParam);
            if (kindParam !== undefined && String(kindParam).trim() !== '' && !kind) {
                return res.status(400).json({ error: 'Invalid kind' });
            }

            const posts = await prisma.supportPost.findMany({
                where: kind ? { kind } : {},
                orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
                take: 200,
                select: {
                    id: true,
                    kind: true,
                    title: true,
                    body: true,
                    pinned: true,
                    authorRole: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            res.json({
                posts: posts.map((p) => ({
                    id: p.id,
                    kind: p.kind,
                    title: p.title,
                    body: p.body,
                    pinned: p.pinned,
                    authorLabel: formatSupportAuthorLabel(p.authorRole),
                    authorRole: p.authorRole,
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString(),
                })),
            });
        } catch (e) {
            console.error('admin support list', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.post(
    '/support-posts',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        try {
            const adminUser = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: { role: true, adminRole: true },
            });
            if (
                adminUser?.role !== UserRole.Admin ||
                !adminUser.adminRole
            ) {
                return res
                    .status(403)
                    .json({ error: '관리자 역할이 없는 계정입니다.' });
            }

            const kind = parseSupportPostKind(req.body?.kind);
            if (!kind) {
                return res
                    .status(400)
                    .json({ error: 'kind must be notice or faq' });
            }

            const title = String(req.body?.title || '').trim();
            const body = String(req.body?.body || '').trim();
            const pinned = Boolean(req.body?.pinned);

            if (!title || !body) {
                return res
                    .status(400)
                    .json({ error: '제목과 본문을 입력하세요.' });
            }
            if (title.length > 200) {
                return res
                    .status(400)
                    .json({ error: '제목은 200자 이하입니다.' });
            }
            if (body.length > 20000) {
                return res
                    .status(400)
                    .json({ error: '본문은 20000자 이하입니다.' });
            }

            const post = await prisma.supportPost.create({
                data: {
                    kind,
                    title,
                    body,
                    pinned,
                    authorRole: adminUser.adminRole,
                    createdById: req.user!.userId,
                },
                select: {
                    id: true,
                    kind: true,
                    title: true,
                    body: true,
                    pinned: true,
                    authorRole: true,
                    createdAt: true,
                },
            });

            void recordAdminAudit({
                actorId: req.user!.userId,
                action: 'supportPost.create',
                targetType: 'SupportPost',
                targetId: post.id,
                metadata: { kind: post.kind, title: post.title },
            });

            res.status(201).json({
                post: {
                    ...post,
                    authorLabel: formatSupportAuthorLabel(post.authorRole),
                    createdAt: post.createdAt.toISOString(),
                },
            });
        } catch (e) {
            console.error('admin support create', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.patch(
    '/support-posts/:id',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        try {
            const id = String(req.params.id || '').trim();
            if (!id) return res.status(400).json({ error: 'Missing id' });

            const existing = await prisma.supportPost.findUnique({
                where: { id },
            });
            if (!existing) {
                return res.status(404).json({ error: 'Not found' });
            }

            const data: {
                kind?: SupportPostKind;
                title?: string;
                body?: string;
                pinned?: boolean;
            } = {};

            if (Object.prototype.hasOwnProperty.call(req.body, 'kind')) {
                const kind = parseSupportPostKind(req.body?.kind);
                if (!kind) {
                    return res
                        .status(400)
                        .json({ error: 'kind must be notice or faq' });
                }
                data.kind = kind;
            }
            if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
                const title = String(req.body?.title || '').trim();
                if (!title || title.length > 200) {
                    return res
                        .status(400)
                        .json({ error: '제목은 1~200자입니다.' });
                }
                data.title = title;
            }
            if (Object.prototype.hasOwnProperty.call(req.body, 'body')) {
                const body = String(req.body?.body || '').trim();
                if (!body || body.length > 20000) {
                    return res
                        .status(400)
                        .json({ error: '본문은 1~20000자입니다.' });
                }
                data.body = body;
            }
            if (Object.prototype.hasOwnProperty.call(req.body, 'pinned')) {
                data.pinned = Boolean(req.body?.pinned);
            }

            if (Object.keys(data).length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            const post = await prisma.supportPost.update({
                where: { id },
                data,
                select: {
                    id: true,
                    kind: true,
                    title: true,
                    body: true,
                    pinned: true,
                    authorRole: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            void recordAdminAudit({
                actorId: req.user!.userId,
                action: 'supportPost.update',
                targetType: 'SupportPost',
                targetId: post.id,
                metadata: { changedFields: Object.keys(data) },
            });

            res.json({
                post: {
                    ...post,
                    authorLabel: formatSupportAuthorLabel(post.authorRole),
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString(),
                },
            });
        } catch (e) {
            console.error('admin support patch', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.delete(
    '/support-posts/:id',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        try {
            const id = String(req.params.id || '').trim();
            if (!id) return res.status(400).json({ error: 'Missing id' });

            await prisma.supportPost.deleteMany({ where: { id } });

            void recordAdminAudit({
                actorId: req.user!.userId,
                action: 'supportPost.delete',
                targetType: 'SupportPost',
                targetId: id,
            });

            res.json({ ok: true });
        } catch (e) {
            console.error('admin support delete', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.get(
    '/support-inquiries',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        try {
            const result = await listAdminSupportInquiries({
                search: String(req.query.search || '').trim() || undefined,
                status: parseSupportInquiryListStatus(req.query.status),
                sort: parseSupportInquiryListSort(req.query.sort),
                take: Number(req.query.take) || undefined,
            });
            res.json(result);
        } catch (e) {
            console.error('admin support inquiries list', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.get(
    '/support-inquiries/:id',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        try {
            const id = String(req.params.id || '').trim();
            if (!id) return res.status(400).json({ error: 'Missing id' });

            const row = await prisma.supportInquiry.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    body: true,
                    category: true,
                    createdAt: true,
                    adminReply: true,
                    repliedAt: true,
                    user: {
                        select: {
                            email: true,
                            role: true,
                            displayName: true,
                            companyName: true,
                            phoneNumber: true,
                        },
                    },
                },
            });
            if (!row) {
                return res.status(404).json({ error: 'Not found' });
            }

            res.json({
                inquiry: {
                    id: row.id,
                    title: row.title,
                    body: row.body,
                    category: row.category,
                    categoryLabel: formatSupportInquiryCategory(row.category),
                    createdAt: row.createdAt.toISOString(),
                    adminReply: row.adminReply,
                    repliedAt: row.repliedAt
                        ? row.repliedAt.toISOString()
                        : null,
                    user: {
                        email: row.user.email,
                        role: row.user.role,
                        displayName: row.user.displayName,
                        companyName: row.user.companyName,
                        phoneNumber: row.user.phoneNumber,
                    },
                },
            });
        } catch (e) {
            console.error('admin support inquiry detail', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.patch(
    '/support-inquiries/:id',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        try {
            const id = String(req.params.id || '').trim();
            if (!id) return res.status(400).json({ error: 'Missing id' });

            const raw = String(req.body?.adminReply ?? '');
            const adminReply = raw.trim();
            if (adminReply.length > 20000) {
                return res.status(400).json({
                    error: '답변은 20,000자 이하로 입력해주세요.',
                });
            }
            if (!adminReply) {
                return res.status(400).json({
                    error: '답변 내용을 입력해주세요.',
                });
            }

            const existing = await prisma.supportInquiry.findUnique({
                where: { id },
                select: { id: true },
            });
            if (!existing) {
                return res.status(404).json({ error: 'Not found' });
            }

            const row = await prisma.supportInquiry.update({
                where: { id },
                data: {
                    adminReply,
                    repliedAt: new Date(),
                },
                select: {
                    id: true,
                    title: true,
                    body: true,
                    category: true,
                    createdAt: true,
                    adminReply: true,
                    repliedAt: true,
                    user: {
                        select: {
                            email: true,
                            role: true,
                            displayName: true,
                            companyName: true,
                            phoneNumber: true,
                        },
                    },
                },
            });

            void recordAdminAudit({
                actorId: req.user!.userId,
                action: 'supportInquiry.reply',
                targetType: 'SupportInquiry',
                targetId: row.id,
            });

            res.json({
                inquiry: {
                    id: row.id,
                    title: row.title,
                    body: row.body,
                    category: row.category,
                    categoryLabel: formatSupportInquiryCategory(row.category),
                    createdAt: row.createdAt.toISOString(),
                    adminReply: row.adminReply,
                    repliedAt: row.repliedAt
                        ? row.repliedAt.toISOString()
                        : null,
                    user: {
                        email: row.user.email,
                        role: row.user.role,
                        displayName: row.user.displayName,
                        companyName: row.user.companyName,
                        phoneNumber: row.user.phoneNumber,
                    },
                },
            });
        } catch (e) {
            console.error('admin support inquiry reply', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

/** 낙찰 기준 거래액·추정 플랫폼 매출 (Finance/Super/Operations 등, CustomerSupport 제외는 프론트에서) */
router.get(
    '/revenue-stats',
    requireAuth,
    requireRole(UserRole.Admin),
    requireAdminRole(AdminRole.Super, AdminRole.Operations, AdminRole.Finance),
    async (req, res) => {
        try {
            const from = parseYearMonth(req.query.from);
            const to = parseYearMonth(req.query.to);
            if (!from || !to) {
                return res.status(400).json({
                    error: 'from, to 쿼리는 YYYY-MM 형식이어야 합니다.',
                });
            }

            const stats = await computeAdminRevenueStats({
                fromYear: from.year,
                fromMonth: from.month,
                toYear: to.year,
                toMonth: to.month,
            });
            res.json(stats);
        } catch (e) {
            const message =
                e instanceof Error ? e.message : 'Internal server error';
            if (message.includes('시작 연월')) {
                return res.status(400).json({ error: message });
            }
            console.error('admin revenue-stats', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

/** 기간 또는 특정 월의 낙찰 상세 목록 */
router.get(
    '/revenue-stats/awards',
    requireAuth,
    requireRole(UserRole.Admin),
    requireAdminRole(AdminRole.Super, AdminRole.Operations, AdminRole.Finance),
    async (req, res) => {
        try {
            const year = Number(req.query.year);
            const month = Number(req.query.month);
            const from = parseYearMonth(req.query.from);
            const to = parseYearMonth(req.query.to);

            if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
                const awards = await listRevenueAwardsForMonth(year, month);
                return res.json({ year, month, awards });
            }

            if (from && to) {
                const { start, end } = monthRangeBounds(
                    from.year,
                    from.month,
                    to.year,
                    to.month,
                );
                if (start.getTime() > end.getTime()) {
                    return res.status(400).json({
                        error: '시작 연월이 종료 연월보다 늦을 수 없습니다.',
                    });
                }
                const awards = await listRevenueAwardsInRange(start, end);
                return res.json({
                    from: `${from.year}-${String(from.month).padStart(2, '0')}`,
                    to: `${to.year}-${String(to.month).padStart(2, '0')}`,
                    awards,
                });
            }

            return res.status(400).json({
                error: 'year·month 또는 from·to(YYYY-MM) 쿼리가 필요합니다.',
            });
        } catch (e) {
            console.error('admin revenue-stats awards', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

/** 관리자 행위 감사 로그 (차단/서류심사/서브관리자생성/공지-FAQ/문의답변). 다른 관리자 계정의
 *  민감한 행위 기록이라 revenue-stats와 동일하게 CustomerSupport는 제외한다. */
router.get(
    '/audit-log',
    requireAuth,
    requireRole(UserRole.Admin),
    requireAdminRole(AdminRole.Super, AdminRole.Operations),
    async (req, res) => {
        try {
            const { skip, take, page, pageSize } = parsePagination({
                page: req.query.page,
                pageSize: req.query.pageSize,
            });

            const [rows, total] = await Promise.all([
                prisma.adminAuditLog.findMany({
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take,
                    include: {
                        actor: {
                            select: { email: true, adminRole: true },
                        },
                    },
                }),
                prisma.adminAuditLog.count(),
            ]);

            res.json({
                logs: rows.map((row) => ({
                    id: row.id,
                    action: row.action,
                    targetType: row.targetType,
                    targetId: row.targetId,
                    metadata: row.metadata,
                    createdAt: row.createdAt.toISOString(),
                    actor: {
                        email: row.actor.email,
                        adminRole: row.actor.adminRole,
                    },
                })),
                meta: { page, pageSize, total },
            });
        } catch (e) {
            console.error('admin audit-log list', e);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

export default router;
