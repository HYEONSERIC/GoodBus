import express from 'express';
import prisma from '../utils/db';
import { requireAuth } from '../middleware/auth';
import {
    attachNotificationHistoryDetails,
    buildReadAtFilter,
    deleteExpiredNotificationHistory,
    parseNotificationType,
    parsePagination,
} from '../utils/notificationHistory';

const router = express.Router();

// Get all notifications for the current user
router.get('/', requireAuth, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.user!.userId,
                read: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });

        res.json({ notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get archived notification history for the current user
router.get('/history', requireAuth, async (req, res) => {
    try {
        await deleteExpiredNotificationHistory();

        const { page, pageSize, skip, take } = parsePagination(req.query);
        const type = parseNotificationType(req.query.type);
        const readAt = buildReadAtFilter(req.query.startDate, req.query.endDate);
        const where = {
            userId: req.user!.userId,
            type,
            readAt,
        };

        const [rows, total] = await Promise.all([
            prisma.notificationHistory.findMany({
                where,
                orderBy: {
                    readAt: 'desc',
                },
                skip,
                take,
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
        console.error('Get notification history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete one archived notification history row for the current user
router.delete('/history/:id', requireAuth, async (req, res) => {
    try {
        const history = await prisma.notificationHistory.findUnique({
            where: { id: req.params.id },
            select: { id: true, userId: true },
        });

        if (!history) {
            return res.json({ message: 'Notification history already deleted' });
        }

        if (history.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Not your notification history' });
        }

        await prisma.notificationHistory.delete({
            where: { id: req.params.id },
        });

        res.json({ message: 'Notification history deleted' });
    } catch (error) {
        console.error('Delete notification history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete all archived notification history rows for the current user
router.delete('/history', requireAuth, async (req, res) => {
    try {
        const result = await prisma.notificationHistory.deleteMany({
            where: {
                userId: req.user!.userId,
            },
        });

        res.json({
            message: 'Notification history cleared',
            count: result.count,
        });
    } catch (error) {
        console.error('Clear notification history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get unread notification count
router.get('/unread-count', requireAuth, async (req, res) => {
    try {
        const count = await prisma.notification.count({
            where: {
                userId: req.user!.userId,
                read: false,
            },
        });

        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
    try {
        const notification = await prisma.notification.findUnique({
            where: { id: req.params.id },
        });

        if (!notification) {
            return res.json({ message: 'Notification already archived' });
        }

        if (notification.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Not your notification' });
        }

        await prisma.$transaction(async (tx) => {
            await deleteExpiredNotificationHistory(tx);

            await tx.notificationHistory.create({
                data: {
                    userId: notification.userId,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    tripId: notification.tripId,
                    bidId: notification.bidId,
                    notificationCreatedAt: notification.createdAt,
                },
            });

            await tx.notification.delete({
                where: { id: req.params.id },
            });
        });

        res.json({ message: 'Notification archived' });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark all notifications as read
router.patch('/read-all', requireAuth, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.user!.userId,
                read: false,
            },
        });

        if (notifications.length === 0) {
            return res.json({ message: 'No unread notifications' });
        }

        await prisma.$transaction(async (tx) => {
            await deleteExpiredNotificationHistory(tx);

            await tx.notificationHistory.createMany({
                data: notifications.map((notification) => ({
                    userId: notification.userId,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    tripId: notification.tripId,
                    bidId: notification.bidId,
                    notificationCreatedAt: notification.createdAt,
                })),
            });

            await tx.notification.deleteMany({
                where: {
                    id: {
                        in: notifications.map((notification) => notification.id),
                    },
                },
            });
        });

        res.json({ message: 'All notifications archived' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;


