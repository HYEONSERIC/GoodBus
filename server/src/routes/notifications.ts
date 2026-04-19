import express from 'express';
import prisma from '../utils/db';
import { requireAuth } from '../middleware/auth';

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
        const history = await prisma.notificationHistory.findMany({
            where: {
                userId: req.user!.userId,
            },
            orderBy: {
                readAt: 'desc',
            },
            take: 100,
        });

        res.json({ history });
    } catch (error) {
        console.error('Get notification history error:', error);
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
            return res.status(404).json({ error: 'Notification not found' });
        }

        if (notification.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Not your notification' });
        }

        await prisma.$transaction(async (tx) => {
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


