import express from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

function roomInclude(userId: string) {
    return {
        trip: {
            select: {
                id: true,
                origin: true,
                destination: true,
                dateTime: true,
                status: true,
            },
        },
        passenger: {
            select: {
                id: true,
                email: true,
                role: true,
            },
        },
        bidder: {
            select: {
                id: true,
                email: true,
                role: true,
            },
        },
        messages: {
            orderBy: { createdAt: 'desc' as const },
            take: 1,
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        },
        _count: {
            select: {
                messages: {
                    where: {
                        senderId: { not: userId },
                        readAt: null,
                    },
                },
            },
        },
    };
}

async function ensureAwardedRooms(userId: string, role: UserRole) {
    if (role === UserRole.Passenger) {
        const trips = await prisma.trip.findMany({
            where: {
                passengerId: userId,
                status: 'awarded',
            },
            include: {
                bids: {
                    where: { status: 'awarded' },
                    take: 1,
                },
            },
        });

        await Promise.all(
            trips
                .filter((trip) => trip.bids[0])
                .map((trip) =>
                    prisma.chatRoom.upsert({
                        where: { tripId: trip.id },
                        update: {},
                        create: {
                            tripId: trip.id,
                            passengerId: trip.passengerId,
                            bidderId: trip.bids[0].bidderId,
                        },
                    })
                )
        );
        return;
    }

    if (role === UserRole.Driver || role === UserRole.BusCompany) {
        const bids = await prisma.bid.findMany({
            where: {
                bidderId: userId,
                status: 'awarded',
                trip: { status: 'awarded' },
            },
            include: {
                trip: true,
            },
        });

        await Promise.all(
            bids.map((bid) =>
                prisma.chatRoom.upsert({
                    where: { tripId: bid.tripId },
                    update: {},
                    create: {
                        tripId: bid.tripId,
                        passengerId: bid.trip.passengerId,
                        bidderId: bid.bidderId,
                    },
                })
            )
        );
    }
}

async function findParticipantRoom(roomId: string, userId: string) {
    return prisma.chatRoom.findFirst({
        where: {
            id: roomId,
            OR: [{ passengerId: userId }, { bidderId: userId }],
        },
    });
}

router.get('/rooms', requireAuth, async (req, res) => {
    try {
        await ensureAwardedRooms(req.user!.userId, req.user!.role);

        const rooms = await prisma.chatRoom.findMany({
            where: {
                OR: [
                    { passengerId: req.user!.userId },
                    { bidderId: req.user!.userId },
                ],
            },
            orderBy: { updatedAt: 'desc' },
            include: roomInclude(req.user!.userId),
        });

        res.json({
            rooms: rooms.map((room) => ({
                ...room,
                unreadCount: room._count.messages,
                lastMessage: room.messages[0] || null,
                messages: undefined,
                _count: undefined,
            })),
        });
    } catch (error) {
        console.error('Get chat rooms error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/rooms/:roomId/messages', requireAuth, async (req, res) => {
    try {
        const room = await findParticipantRoom(
            req.params.roomId,
            req.user!.userId
        );

        if (!room) {
            return res.status(404).json({ error: 'Chat room not found' });
        }

        const after = String(req.query.after || '').trim();
        const where = {
            roomId: room.id,
            ...(after ? { createdAt: { gt: new Date(after) } } : {}),
        };

        const messages = await prisma.chatMessage.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: 100,
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        res.json({
            messages: messages.map((message) => ({
                ...message,
                isMine: message.senderId === req.user!.userId,
            })),
        });
    } catch (error) {
        console.error('Get chat messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/rooms/:roomId/messages', requireAuth, async (req, res) => {
    try {
        const message = String(req.body?.message || '').trim();

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (message.length > 1000) {
            return res.status(400).json({ error: 'Message is too long' });
        }

        const room = await findParticipantRoom(
            req.params.roomId,
            req.user!.userId
        );

        if (!room) {
            return res.status(404).json({ error: 'Chat room not found' });
        }

        const chatMessage = await prisma.chatMessage.create({
            data: {
                roomId: room.id,
                senderId: req.user!.userId,
                message,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        await prisma.chatRoom.update({
            where: { id: room.id },
            data: { updatedAt: new Date() },
        });

        res.status(201).json({
            message: {
                ...chatMessage,
                isMine: true,
            },
        });
    } catch (error) {
        console.error('Create chat message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/rooms/:roomId/read', requireAuth, async (req, res) => {
    try {
        const room = await findParticipantRoom(
            req.params.roomId,
            req.user!.userId
        );

        if (!room) {
            return res.status(404).json({ error: 'Chat room not found' });
        }

        const result = await prisma.chatMessage.updateMany({
            where: {
                roomId: room.id,
                senderId: { not: req.user!.userId },
                readAt: null,
            },
            data: {
                readAt: new Date(),
            },
        });

        res.json({ count: result.count });
    } catch (error) {
        console.error('Mark chat room read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
