import express from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { BusSize, TripStatus, UserRole, NotificationType } from '@prisma/client';
import { sendBidAwardedEmail } from '../utils/email';

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

    // Calculate minimum bid price for each trip using AGGREGATE query
    const tripsWithMinBid = await Promise.all(
        trips.map(async (trip) => {
            // AGGREGATE query: Find minimum bid price for open bids
            const minBidResult = await prisma.bid.aggregate({
                where: {
                    tripId: trip.id,
                    status: 'open',
                },
                _min: {
                    price: true,
                },
            });

            return {
                ...trip,
                minBidPrice: minBidResult._min.price
                    ? Number(minBidResult._min.price)
                    : null,
            };
        })
    );

    res.json({ trips: tripsWithMinBid });
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

    // AGGREGATE query: Find minimum bid price for open bids
    const minBidResult = await prisma.bid.aggregate({
        where: {
            tripId: trip.id,
            status: 'open',
        },
        _min: {
            price: true,
        },
    });

    const tripWithMinBid = {
        ...trip,
        minBidPrice: minBidResult._min.price
            ? Number(minBidResult._min.price)
            : null,
    };

    res.json({ trip: tripWithMinBid });
});

const updateTripSchema = z.object({
    origin: z.string().min(1).optional(),
    destination: z.string().min(1).optional(),
    dateTime: z.string().datetime().optional(),
    paxCount: z.number().int().positive().optional(),
    busSize: z.enum(['small', 'medium', 'large']).optional(),
});

router.patch(
    '/:id',
    requireAuth,
    requireRole(UserRole.Passenger),
    async (req, res) => {
        try {
            const updateData = updateTripSchema.parse(req.body);

            // Get trip with bids
            const trip = await prisma.trip.findUnique({
                where: { id: req.params.id },
                include: {
                    bids: {
                        where: { status: 'open' },
                        include: {
                            bidder: {
                                select: {
                                    id: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
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
                    .json({ error: 'Only open trips can be updated' });
            }

            // Prepare update data
            const dataToUpdate: any = {};
            if (updateData.origin) dataToUpdate.origin = updateData.origin;
            if (updateData.destination)
                dataToUpdate.destination = updateData.destination;
            if (updateData.dateTime)
                dataToUpdate.dateTime = new Date(updateData.dateTime);
            if (updateData.paxCount) dataToUpdate.paxCount = updateData.paxCount;
            if (updateData.busSize)
                dataToUpdate.busSize = updateData.busSize as BusSize;

            // Use transaction to update trip and cancel all open bids
            const updatedTrip = await prisma.$transaction(async (tx) => {
                // Update trip
                const trip = await tx.trip.update({
                    where: { id: req.params.id },
                    data: dataToUpdate,
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

                // Cancel all open bids
                const openBids = trip.bids.filter((bid) => bid.status === 'open');
                if (openBids.length > 0) {
                    await tx.bid.updateMany({
                        where: {
                            tripId: trip.id,
                            status: 'open',
                        },
                        data: { status: 'withdrawn' },
                    });

                    // Create notifications for all bidders
                    const notifications = openBids.map((bid) => ({
                        userId: bid.bidder.id,
                        type: NotificationType.BID_RECEIVED, // Reusing type, but message will be different
                        title: 'Trip Updated - Bid Cancelled',
                        message: `The trip from ${trip.origin} to ${trip.destination} has been updated. Your bid has been automatically cancelled. Please place a new bid if you're still interested.`,
                        tripId: trip.id,
                        bidId: bid.id,
                    }));

                    await tx.notification.createMany({
                        data: notifications,
                    });
                }

                return trip;
            });

            // Calculate min bid price for updated trip
            const minBidResult = await prisma.bid.aggregate({
                where: {
                    tripId: updatedTrip.id,
                    status: 'open',
                },
                _min: {
                    price: true,
                },
            });

            const tripWithMinBid = {
                ...updatedTrip,
                minBidPrice: minBidResult._min.price
                    ? Number(minBidResult._min.price)
                    : null,
            };

            res.json({ trip: tripWithMinBid });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            console.error('Update trip error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

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

            // Get trip and bid details for notifications
            const tripWithDetails = await prisma.trip.findUnique({
                where: { id: trip.id },
                include: {
                    passenger: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });

            const awardedBid = await prisma.bid.findUnique({
                where: { id: bidId },
                include: {
                    bidder: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
            });

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

            // Create notification for the bidder
            if (awardedBid && tripWithDetails) {
                await prisma.notification.create({
                    data: {
                        userId: awardedBid.bidder.id,
                        type: NotificationType.BID_AWARDED,
                        title: 'Bid Awarded',
                        message: `Congratulations! Your bid of $${awardedBid.price} has been awarded for the trip from ${tripWithDetails.origin} to ${tripWithDetails.destination}`,
                        tripId: trip.id,
                        bidId: bidId,
                    },
                });

                // Send email to bidder
                sendBidAwardedEmail(
                    awardedBid.bidder.email,
                    tripWithDetails.origin,
                    tripWithDetails.destination,
                    Number(awardedBid.price),
                    tripWithDetails.passenger.email
                );
            }

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
