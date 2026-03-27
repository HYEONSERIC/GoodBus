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
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50, // Limit to 50 most recent notifications
        });

        res.json({ notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
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

        const updated = await prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true },
        });

        res.json({ notification: updated });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark all notifications as read
router.patch('/read-all', requireAuth, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.user!.userId,
                read: false,
            },
            data: { read: true },
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;


