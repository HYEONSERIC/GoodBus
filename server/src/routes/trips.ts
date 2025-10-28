import express from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { BusSize, TripStatus, UserRole } from '@prisma/client';

const router = express.Router();

const createTripSchema = z.object({
    origin: z.string().min(1),
    destination: z.string().min(1),
    dateTime: z.string().datetime(),
    paxCount: z.number().int().positive(),
    busSize: z.enum(['small', 'medium', 'large']),
});

router.get('/', requireAuth, async (req, res) => {
    const { status } = req.query;

    const trips = await prisma.trip.findMany({
        where: status ? { status: status as TripStatus } : undefined,
        include: {
            passenger: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                },
            },
            bids: {
                include: {
                    bidder: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    res.json({ trips });
});

router.post(
    '/',
    requireAuth,
    requireRole(UserRole.Passenger),
    async (req, res) => {
        try {
            const { origin, destination, dateTime, paxCount, busSize } =
                createTripSchema.parse(req.body);

            const trip = await prisma.trip.create({
                data: {
                    passengerId: req.user!.userId,
                    origin,
                    destination,
                    dateTime: new Date(dateTime),
                    paxCount,
                    busSize: busSize as BusSize,
                },
                include: {
                    passenger: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                        },
                    },
                    bids: true,
                },
            });

            res.status(201).json({ trip });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            console.error('Create trip error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.get('/:id', requireAuth, async (req, res) => {
    const trip = await prisma.trip.findUnique({
        where: { id: req.params.id },
        include: {
            passenger: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                },
            },
            bids: {
                include: {
                    bidder: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            },
        },
    });

    if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({ trip });
});

router.post(
    '/:id/award',
    requireAuth,
    requireRole(UserRole.Passenger),
    async (req, res) => {
        try {
            const { bidId } = req.body;

            if (!bidId) {
                return res.status(400).json({ error: 'bidId is required' });
            }

            const trip = await prisma.trip.findUnique({
                where: { id: req.params.id },
                include: { bids: true },
            });

            if (!trip) {
                return res.status(404).json({ error: 'Trip not found' });
            }

            if (trip.passengerId !== req.user!.userId) {
                return res.status(403).json({ error: 'Not your trip' });
            }

            if (trip.status !== 'open') {
                return res
                    .status(400)
                    .json({ error: 'Trip is not open for awarding' });
            }

            const bid = trip.bids.find((b) => b.id === bidId);

            if (!bid) {
                return res.status(404).json({ error: 'Bid not found' });
            }

            if (bid.status !== 'open') {
                return res.status(400).json({ error: 'Bid is not open' });
            }

            // Use a transaction to ensure atomicity
            await prisma.$transaction([
                // Award the winning bid
                prisma.bid.update({
                    where: { id: bidId },
                    data: { status: 'awarded' },
                }),
                // Mark other bids as lost
                prisma.bid.updateMany({
                    where: {
                        tripId: trip.id,
                        id: { not: bidId },
                        status: 'open',
                    },
                    data: { status: 'lost' },
                }),
                // Update trip status
                prisma.trip.update({
                    where: { id: trip.id },
                    data: { status: 'awarded' },
                }),
            ]);

            res.json({ message: 'Trip awarded successfully' });
        } catch (error) {
            console.error('Award trip error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.patch(
    '/:id/cancel',
    requireAuth,
    requireRole(UserRole.Passenger),
    async (req, res) => {
        try {
            const trip = await prisma.trip.findUnique({
                where: { id: req.params.id },
            });

            if (!trip) {
                return res.status(404).json({ error: 'Trip not found' });
            }

            if (trip.passengerId !== req.user!.userId) {
                return res.status(403).json({ error: 'Not your trip' });
            }

            if (trip.status !== 'open') {
                return res
                    .status(400)
                    .json({ error: 'Only open trips can be cancelled' });
            }

            // Cancel the trip and all related bids
            await prisma.$transaction([
                prisma.trip.update({
                    where: { id: trip.id },
                    data: { status: 'cancelled' },
                }),
                prisma.bid.updateMany({
                    where: {
                        tripId: trip.id,
                        status: 'open',
                    },
                    data: { status: 'withdrawn' },
                }),
            ]);

            res.json({ message: 'Trip cancelled successfully' });
        } catch (error) {
            console.error('Cancel trip error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
