import express from 'express';
import path from 'path';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole, AdminRole } from '@prisma/client';
import {
    attachNotificationHistoryDetails,
    buildReadAtFilter,
    deleteExpiredNotificationHistory,
    parseNotificationType,
    parsePagination,
} from '../utils/notificationHistory';

const router = express.Router();

router.get('/overview', requireAuth, requireRole(UserRole.Admin), async (req, res) => {
    const [userCount, tripCount, bidCount] = await Promise.all([
        prisma.user.count(),
        prisma.trip.count(),
        prisma.bid.count(),
    ]);

    const recentTrips = await prisma.trip.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
            passenger: {
                select: {
                    id: true,
                    email: true,
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
        recentTrips,
        recentBids,
    });
});

router.get('/users', requireAuth, requireRole(UserRole.Admin), async (req, res) => {
    const { role, status, search } = req.query;

    const users = await prisma.user.findMany({
        where: {
            role: role ? (role as UserRole) : undefined,
            status: status ? (status as any) : undefined,
            email: search
                ? {
                      contains: String(search),
                      mode: 'insensitive',
                  }
                : undefined,
        },
        select: {
            id: true,
            email: true,
            role: true,
            status: true,
            adminRole: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
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

            const { page, pageSize, skip, take } = parsePagination(req.query);
            const search = String(req.query.search || '').trim();
            const userId = String(req.query.userId || '').trim();
            const type = parseNotificationType(req.query.type);
            const readAt = buildReadAtFilter(
                req.query.startDate,
                req.query.endDate
            );

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
                                  title: {
                                      contains: search,
                                      mode: 'insensitive' as const,
                                  },
                              },
                              {
                                  message: {
                                      contains: search,
                                      mode: 'insensitive' as const,
                                  },
                              },
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
                                role: true,
                            },
                        },
                    },
                }),
                prisma.notificationHistory.count({ where }),
            ]);

            const history = await attachNotificationHistoryDetails(rows);

            res.json({
                history,
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
                        tripsAsPassenger: true,
                        bids: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    }
);

router.get(
    '/users/:id/activity',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const userId = req.params.id;
        const take = Math.min(Number(req.query.take) || 10, 50);

        const trips = await prisma.trip.findMany({
            where: { passengerId: userId },
            orderBy: { createdAt: 'desc' },
            take,
            select: {
                id: true,
                origin: true,
                destination: true,
                status: true,
                createdAt: true,
            },
        });

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
                    },
                },
            },
        });

        res.json({ trips, bids });
    }
);

router.get(
    '/verifications',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const type = String(req.query.type || 'driver');
        const status = String(req.query.status || 'pending');

        const isDriver = type === 'driver';
        const roleFilter = isDriver ? UserRole.Driver : UserRole.BusCompany;

        const users = await prisma.user.findMany({
            where: {
                role: roleFilter,
                ...(isDriver
                    ? { driverLicenseStatus: status as any }
                    : { companyRegistrationStatus: status as any }),
            },
            select: {
                id: true,
                email: true,
                role: true,
                driverLicenseUrl: true,
                driverLicenseStatus: true,
                driverLicenseNote: true,
                companyRegistrationUrl: true,
                companyRegistrationStatus: true,
                companyRegistrationNote: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
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
        const safeEmail = user.email?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'user';
        return res.download(absolutePath, `${type}-${safeEmail}${ext}`);
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
                      companyRegistrationStatus: status as any,
                      companyRegistrationNote: reason || null,
                  }
                : {
                      driverLicenseStatus: status as any,
                      driverLicenseNote: reason || null,
                  };

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
            select: {
                id: true,
                email: true,
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

        const createdAt: { gte?: Date; lte?: Date } = {};
        if (startDate) {
            createdAt.gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            createdAt.lte = end;
        }

        const bids = await prisma.bid.findMany({
            where: {
                status: bidStatus ? (bidStatus as any) : undefined,
                createdAt: Object.keys(createdAt).length ? createdAt : undefined,
                trip: tripStatus
                    ? {
                          status: tripStatus as any,
                      }
                    : undefined,
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
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                bidder: {
                    select: { id: true, email: true, role: true },
                },
                trip: {
                    select: {
                        id: true,
                        origin: true,
                        destination: true,
                        status: true,
                        passenger: {
                            select: { id: true, email: true },
                        },
                    },
                },
            },
        });

        res.json({ bids });
    }
);

router.post(
    '/admins',
    requireAuth,
    requireRole(UserRole.Admin),
    async (req, res) => {
        const { email, password, adminRole } = req.body as {
            email?: string;
            password?: string;
            adminRole?: 'Super' | 'CustomerSupport' | 'Operations' | 'Finance';
        };

        if (!email || !password || !adminRole) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const creator = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { adminRole: true },
        });

        if (!creator || creator.adminRole !== AdminRole.Super) {
            return res
                .status(403)
                .json({ error: 'Only super admins can create admins' });
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

        res.status(201).json({ admin });
    }
);

export default router;
