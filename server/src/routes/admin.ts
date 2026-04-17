import express from 'express';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole, AdminRole } from '@prisma/client';

const router = express.Router();

router.get('/overview', requireAuth, requireRole(UserRole.Admin), async (req, res) => {
    const [userCount, tripCount, bidCount] = await Promise.all([
        prisma.user.count(),
        prisma.trip.count(),
        prisma.bid.count(),
    ]);

    const recentTrips = await prisma.trip.findMany({
        take: 5,
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
        take: 5,
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

        const trips = await prisma.trip.findMany({
            where: { passengerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
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
            take: 10,
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
