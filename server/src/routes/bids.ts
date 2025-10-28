import express from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

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

            const bid = await prisma.bid.create({
                data: {
                    tripId,
                    bidderId: req.user!.userId,
                    price,
                    note,
                },
                include: {
                    trip: true,
                    bidder: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });

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
