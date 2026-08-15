import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { requireAuth, requireRole, canViewRevenue } from '../middleware/auth';
import { BusSize, TripStatus, UserRole, NotificationType } from '@prisma/client';
import { sendBidAwardedEmail } from '../utils/email';
import { expireExpiredOpenTripsForPassenger } from '../utils/expireOpenTrips';
import { chargeBillingKey, cancelPayment } from '../utils/toss';
import { DEFAULT_PLATFORM_COMMISSION_RATE } from '../utils/adminRevenue';
import { withPaymentLock, acquireAdvisoryLock } from '../utils/paymentLock';
import { getRoundPartnerTrip } from '../utils/tripGroupsCore';

// 프론트 components/passenger/dialogs/PassengerCancelTripDialog.tsx의
// PASSENGER_CANCEL_REASONS 문구와 동기화 유지 — 이 사유만 수수료 미환불.
const DRIVER_FAULT_CANCEL_REASON = '기사님 사유로 취소';

const router = express.Router();

const createTripSchema = z.object({
    origin: z.string().min(1),
    originX: z.number().finite().optional(),
    originY: z.number().finite().optional(),
    destination: z.string().min(1),
    destinationX: z.number().finite().optional(),
    destinationY: z.number().finite().optional(),
    dateTime: z.string().datetime(),
    paxCount: z.number().int().positive(),
    busSize: z.enum(['small', 'medium', 'large']),
    stopoverDetail: z.string().optional(),
    companionType: z
        .enum(['depart_return', 'with_schedule'])
        .optional(),
    itineraryDetail: z.string().optional(),
    servicePurpose: z.string().optional(),
    paymentMethod: z.enum(['cash', 'card']).optional(),
    additionalRequest: z.string().optional(),
});

router.get('/', requireAuth, async (req, res) => {
    const { status } = req.query;

    // 스키마에 없는 값은 Prisma가 런타임에 던지는데, 이 핸들러엔 try/catch가
    // 없어(Express 4는 async 핸들러의 reject를 자동으로 안 잡음) 그대로 두면
    // 응답 없이 요청이 무한 대기한다 — 관리자 전용도 아닌 모든 로그인 사용자가
    // 트리거할 수 있어 admin.ts의 같은 패턴보다 노출 범위가 넓다.
    if (
        status !== undefined &&
        !Object.values(TripStatus).includes(status as TripStatus)
    ) {
        return res.status(400).json({ error: 'Invalid status filter' });
    }

    if (req.user!.role === UserRole.Passenger) {
        await expireExpiredOpenTripsForPassenger(req.user!.userId);
    }

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
                            displayName: true,
                            companyName: true,
                            phoneNumber: true,
                            profileImageUrl: true,
                            vehicleImageUrls: true,
                            busType: true,
                            busYear: true,
                            capacity: true,
                            driverComment: true,
                            driverLicenseStatus: true,
                            companyRegistrationStatus: true,
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

    // Admin sub-roles like CustomerSupport can see trips (for support/
    // moderation) but not revenue — mask bid prices the same way the
    // /admin/* revenue views do, without changing behavior for the
    // Passenger/Driver/BusCompany callers this route also serves.
    const maskRevenue =
        req.user!.role === UserRole.Admin &&
        !(await canViewRevenue(req.user!.userId));

    // Drivers/companies must not see other bidders' prices or contact info
    // (own bid stays intact). Currently applied to everyone in that role —
    // there's no real paid-membership tier yet to gate this by, see
    // PROJECT_STATUS.md. When one exists, branch here on the requester's
    // membership before masking.
    const isBidderRole =
        req.user!.role === UserRole.Driver ||
        req.user!.role === UserRole.BusCompany;
    const tripsWithBidderMasking = isBidderRole
        ? tripsWithMinBid.map((trip) => ({
              ...trip,
              bids: trip.bids.map((bid) =>
                  bid.bidderId === req.user!.userId
                      ? bid
                      : {
                            ...bid,
                            price: 0,
                            bidder: {
                                ...bid.bidder,
                                email: '',
                                phoneNumber: null,
                                displayName: null,
                                companyName: null,
                                profileImageUrl: null,
                                vehicleImageUrls: [],
                            },
                        },
              ),
          }))
        : tripsWithMinBid;

    res.json({
        trips: maskRevenue
            ? tripsWithBidderMasking.map((trip) => ({
                  ...trip,
                  minBidPrice: null,
                  bids: trip.bids.map((bid) => ({ ...bid, price: 0 })),
              }))
            : tripsWithBidderMasking,
    });
});

router.post(
    '/',
    requireAuth,
    requireRole(UserRole.Passenger),
    async (req, res) => {
        try {
            const {
                origin,
                originX,
                originY,
                destination,
                destinationX,
                destinationY,
                dateTime,
                paxCount,
                busSize,
                stopoverDetail,
                companionType,
                itineraryDetail,
                servicePurpose,
                paymentMethod,
                additionalRequest,
            } = createTripSchema.parse(req.body);

            if (
                companionType === 'with_schedule' &&
                (!itineraryDetail || !itineraryDetail.trim())
            ) {
                return res.status(400).json({
                    error: 'itineraryDetail is required when companionType is with_schedule',
                });
            }

            const trip = await prisma.trip.create({
                data: {
                    passengerId: req.user!.userId,
                    origin,
                    originX,
                    originY,
                    destination,
                    destinationX,
                    destinationY,
                    dateTime: new Date(dateTime),
                    paxCount,
                    busSize: busSize as BusSize,
                    stopoverDetail: stopoverDetail || undefined,
                    companionType: companionType || undefined,
                    itineraryDetail: itineraryDetail || undefined,
                    servicePurpose: servicePurpose || undefined,
                    paymentMethod: paymentMethod || undefined,
                    additionalRequest:
                        additionalRequest && additionalRequest.trim()
                            ? additionalRequest.trim()
                            : undefined,
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
                            displayName: true,
                            companyName: true,
                            phoneNumber: true,
                            profileImageUrl: true,
                            vehicleImageUrls: true,
                            busType: true,
                            busYear: true,
                            capacity: true,
                            driverComment: true,
                            driverLicenseStatus: true,
                            companyRegistrationStatus: true,
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

    const maskRevenue =
        req.user!.role === UserRole.Admin &&
        !(await canViewRevenue(req.user!.userId));

    res.json({
        trip: maskRevenue
            ? {
                  ...tripWithMinBid,
                  minBidPrice: null,
                  bids: tripWithMinBid.bids.map((bid) => ({ ...bid, price: 0 })),
              }
            : tripWithMinBid,
    });
});

const updateTripSchema = z.object({
    origin: z.string().min(1).optional(),
    originX: z.number().finite().optional(),
    originY: z.number().finite().optional(),
    destination: z.string().min(1).optional(),
    destinationX: z.number().finite().optional(),
    destinationY: z.number().finite().optional(),
    dateTime: z.string().datetime().optional(),
    paxCount: z.number().int().positive().optional(),
    busSize: z.enum(['small', 'medium', 'large']).optional(),
    stopoverDetail: z.string().optional(),
    companionType: z.enum(['depart_return', 'with_schedule']).optional(),
    itineraryDetail: z.string().optional(),
    servicePurpose: z.string().optional(),
    paymentMethod: z.enum(['cash', 'card']).optional(),
    additionalRequest: z.string().optional(),
});

const cancelTripSchema = z.object({
    reason: z.string().trim().min(1).max(200),
});

router.patch(
    '/:id',
    requireAuth,
    requireRole(UserRole.Passenger),
    async (req, res) => {
        try {
            const updateData = updateTripSchema.parse(req.body);
            if (
                updateData.companionType === 'with_schedule' &&
                (!updateData.itineraryDetail ||
                    !updateData.itineraryDetail.trim())
            ) {
                return res.status(400).json({
                    error: 'itineraryDetail is required when companionType is with_schedule',
                });
            }

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
            if (updateData.originX !== undefined)
                dataToUpdate.originX = updateData.originX;
            if (updateData.originY !== undefined)
                dataToUpdate.originY = updateData.originY;
            if (updateData.destination)
                dataToUpdate.destination = updateData.destination;
            if (updateData.destinationX !== undefined)
                dataToUpdate.destinationX = updateData.destinationX;
            if (updateData.destinationY !== undefined)
                dataToUpdate.destinationY = updateData.destinationY;
            if (updateData.dateTime)
                dataToUpdate.dateTime = new Date(updateData.dateTime);
            if (updateData.paxCount) dataToUpdate.paxCount = updateData.paxCount;
            if (updateData.busSize)
                dataToUpdate.busSize = updateData.busSize as BusSize;
            if (updateData.stopoverDetail !== undefined) {
                dataToUpdate.stopoverDetail = updateData.stopoverDetail.trim()
                    ? updateData.stopoverDetail.trim()
                    : null;
            }
            if (updateData.companionType !== undefined) {
                dataToUpdate.companionType = updateData.companionType || null;
            }
            if (updateData.itineraryDetail !== undefined) {
                dataToUpdate.itineraryDetail =
                    updateData.itineraryDetail.trim()
                        ? updateData.itineraryDetail.trim()
                        : null;
            }
            if (updateData.servicePurpose !== undefined) {
                dataToUpdate.servicePurpose = updateData.servicePurpose.trim()
                    ? updateData.servicePurpose.trim()
                    : null;
            }
            if (updateData.paymentMethod !== undefined) {
                dataToUpdate.paymentMethod = updateData.paymentMethod || null;
            }
            if (updateData.additionalRequest !== undefined) {
                dataToUpdate.additionalRequest =
                    updateData.additionalRequest.trim()
                        ? updateData.additionalRequest.trim()
                        : null;
            }

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

            // 동일 여정에 대한 낙찰 요청이 동시에 들어오면(더블클릭 등) 수수료가
            // 중복 청구될 수 있어, 여정 단위 락으로 조회~결제~상태갱신을 직렬화한다.
            const outcome = await withPaymentLock(
                req.params.id,
                'trip_award',
                async (tx) => {
                    const trip = await tx.trip.findUnique({
                        where: { id: req.params.id },
                        include: { bids: true },
                    });

                    if (!trip) {
                        return {
                            ok: false as const,
                            status: 404,
                            body: { error: 'Trip not found' },
                        };
                    }

                    if (trip.passengerId !== req.user!.userId) {
                        return {
                            ok: false as const,
                            status: 403,
                            body: { error: 'Not your trip' },
                        };
                    }

                    if (trip.status !== 'open') {
                        return {
                            ok: false as const,
                            status: 400,
                            body: { error: 'Trip is not open for awarding' },
                        };
                    }

                    const bid = trip.bids.find((b) => b.id === bidId);

                    if (!bid) {
                        return {
                            ok: false as const,
                            status: 404,
                            body: { error: 'Bid not found' },
                        };
                    }

                    if (bid.status !== 'open') {
                        return {
                            ok: false as const,
                            status: 400,
                            body: { error: 'Bid is not open' },
                        };
                    }

                    // Get trip and bid details for notifications
                    const tripWithDetails = await tx.trip.findUnique({
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

                    const awardedBid = await tx.bid.findUnique({
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

                    if (!awardedBid || !tripWithDetails) {
                        return {
                            ok: false as const,
                            status: 404,
                            body: { error: 'Trip or bid not found' },
                        };
                    }

                    // 낙찰 확정에 실패했을 때(카드 미등록/결제 실패) 승객·기사 양쪽에 알린다.
                    const notifyAwardPaymentFailed = () =>
                        tx.notification.createMany({
                            data: [
                                {
                                    userId: tripWithDetails.passenger.id,
                                    type: NotificationType.AWARD_PAYMENT_FAILED,
                                    title: '낙찰 처리 실패',
                                    message: `선택하신 입찰(${awardedBid.price}만원)의 수수료 결제가 실패하여 낙찰이 확정되지 않았습니다. 다른 입찰을 선택해주세요.`,
                                    tripId: trip.id,
                                    bidId: awardedBid.id,
                                },
                                {
                                    userId: awardedBid.bidder.id,
                                    type: NotificationType.AWARD_PAYMENT_FAILED,
                                    title: '낙찰 처리 실패',
                                    message: `낙찰 확정 중 수수료 결제에 실패하여 낙찰이 취소되었습니다. 등록된 카드 정보를 확인해주세요.`,
                                    tripId: trip.id,
                                    bidId: awardedBid.id,
                                },
                            ],
                        });

                    // 낙찰 수수료(10%) 선결제 — 결제가 성공해야 낙찰을 확정한다.
                    const commissionWon = Math.round(
                        Number(awardedBid.price) *
                            10000 *
                            DEFAULT_PLATFORM_COMMISSION_RATE,
                    );
                    const billingKey = await tx.billingKey.findUnique({
                        where: { userId: awardedBid.bidder.id },
                    });

                    if (!billingKey) {
                        await notifyAwardPaymentFailed();
                        return {
                            ok: false as const,
                            status: 400,
                            body: {
                                error: '낙찰자의 결제 카드가 등록되어 있지 않아 낙찰할 수 없습니다',
                            },
                        };
                    }

                    const commissionOrderId = crypto.randomUUID();
                    const commissionResult = await chargeBillingKey(
                        billingKey.tossBillingKey,
                        billingKey.customerKey,
                        commissionWon,
                        commissionOrderId,
                        'GoodBus 낙찰 수수료 (10%)',
                    );

                    if (!commissionResult.ok) {
                        await tx.paymentTransaction.create({
                            data: {
                                userId: awardedBid.bidder.id,
                                kind: 'platform_commission',
                                status: 'failed',
                                amount: commissionWon,
                                tossOrderId: commissionOrderId,
                                tripId: trip.id,
                                bidId: awardedBid.id,
                                failReason: commissionResult.errorText,
                            },
                        });
                        await notifyAwardPaymentFailed();
                        return {
                            ok: false as const,
                            status: 400,
                            body: { error: '수수료 결제에 실패하여 낙찰할 수 없습니다' },
                        };
                    }

                    // Award the winning bid
                    await tx.bid.update({
                        where: { id: bidId },
                        data: { status: 'awarded' },
                    });
                    // Mark other bids as lost
                    await tx.bid.updateMany({
                        where: {
                            tripId: trip.id,
                            id: { not: bidId },
                            status: 'open',
                        },
                        data: { status: 'lost' },
                    });
                    // Update trip status
                    await tx.trip.update({
                        where: { id: trip.id },
                        data: { status: 'awarded', awardedAt: new Date() },
                    });
                    // Record the commission charge
                    await tx.paymentTransaction.create({
                        data: {
                            userId: awardedBid.bidder.id,
                            kind: 'platform_commission',
                            status: 'succeeded',
                            amount: commissionWon,
                            tossOrderId: commissionOrderId,
                            tossPaymentKey: commissionResult.data.paymentKey,
                            tripId: trip.id,
                            bidId: awardedBid.id,
                        },
                    });

                    // 왕복 여정(가는 편/오는 편이 별개 Trip)은 기사가 왕복 총액으로
                    // 입찰해도 실제 Bid는 이 편(가는 편)에만 걸린다 — 그대로 두면
                    // 오는 편은 입찰이 하나도 없는 채로 영원히 열려 있어, 승객
                    // 견적 탭에 이미 낙찰된 여정의 반대편이 "아직 견적 받는 중"으로
                    // 계속 보이는 버그가 있었다(2026-08-15 사용자 리포트). 왕복
                    // 총액이 이미 이 낙찰가에 포함돼 있으므로 오는 편은 수수료
                    // 재청구 없이 같은 기사로 자동 낙찰한다.
                    let partnerAward: {
                        trip: NonNullable<
                            Awaited<ReturnType<typeof tx.trip.findUnique>>
                        >;
                        awardedBid: Awaited<ReturnType<typeof tx.bid.create>>;
                    } | null = null;

                    const partnerCandidates = await tx.trip.findMany({
                        where: {
                            passengerId: trip.passengerId,
                            status: 'open',
                            id: { not: trip.id },
                        },
                    });
                    const partnerCandidate = getRoundPartnerTrip(
                        trip,
                        partnerCandidates,
                    );

                    if (partnerCandidate) {
                        await acquireAdvisoryLock(
                            tx,
                            `trip_award:${partnerCandidate.id}`,
                        );
                        // 락을 받는 사이 다른 요청이 먼저 처리했을 수 있어 재조회한다.
                        const partner = await tx.trip.findUnique({
                            where: { id: partnerCandidate.id },
                        });

                        if (partner && partner.status === 'open') {
                            await tx.bid.updateMany({
                                where: {
                                    tripId: partner.id,
                                    status: 'open',
                                },
                                data: { status: 'lost' },
                            });
                            const partnerBid = await tx.bid.create({
                                data: {
                                    tripId: partner.id,
                                    bidderId: awardedBid.bidder.id,
                                    price: 0,
                                    note: '왕복 여정 자동 낙찰 — 요금은 반대편 낙찰가에 포함되어 있습니다.',
                                    status: 'awarded',
                                },
                            });
                            await tx.trip.update({
                                where: { id: partner.id },
                                data: { status: 'awarded', awardedAt: new Date() },
                            });
                            partnerAward = {
                                trip: partner,
                                awardedBid: partnerBid,
                            };
                        }
                    }

                    return {
                        ok: true as const,
                        trip,
                        tripWithDetails,
                        awardedBid,
                        partnerAward,
                    };
                },
            );

            if (!outcome.ok) {
                return res.status(outcome.status).json(outcome.body);
            }

            const { trip, tripWithDetails, awardedBid, partnerAward } = outcome;

            // Create notification for the bidder
            await prisma.chatRoom.upsert({
                where: {
                    tripId_bidderId: {
                        tripId: trip.id,
                        bidderId: awardedBid.bidder.id,
                    },
                },
                update: {},
                create: {
                    tripId: trip.id,
                    passengerId: tripWithDetails.passenger.id,
                    bidderId: awardedBid.bidder.id,
                },
            });

            await prisma.notification.create({
                data: {
                    userId: awardedBid.bidder.id,
                    type: NotificationType.BID_AWARDED,
                    title: 'Bid Awarded',
                    message: `Congratulations! Your bid of ${awardedBid.price}만원 has been awarded for the trip from ${tripWithDetails.origin} to ${tripWithDetails.destination}`,
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

            // 왕복 반대편이 자동 낙찰됐다면 같은 후속 처리(채팅방·알림·메일)를 반복한다.
            if (partnerAward) {
                await prisma.chatRoom.upsert({
                    where: {
                        tripId_bidderId: {
                            tripId: partnerAward.trip.id,
                            bidderId: awardedBid.bidder.id,
                        },
                    },
                    update: {},
                    create: {
                        tripId: partnerAward.trip.id,
                        passengerId: tripWithDetails.passenger.id,
                        bidderId: awardedBid.bidder.id,
                    },
                });

                await prisma.notification.create({
                    data: {
                        userId: awardedBid.bidder.id,
                        type: NotificationType.BID_AWARDED,
                        title: 'Bid Awarded',
                        message: `왕복 여정의 반대편(${partnerAward.trip.origin} → ${partnerAward.trip.destination})도 함께 낙찰 확정되었습니다.`,
                        tripId: partnerAward.trip.id,
                        bidId: partnerAward.awardedBid.id,
                    },
                });

                sendBidAwardedEmail(
                    awardedBid.bidder.email,
                    partnerAward.trip.origin,
                    partnerAward.trip.destination,
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
            const { reason } = cancelTripSchema.parse(req.body);

            const trip = await prisma.trip.findUnique({
                where: { id: req.params.id },
            });

            if (!trip) {
                return res.status(404).json({ error: 'Trip not found' });
            }

            if (trip.passengerId !== req.user!.userId) {
                return res.status(403).json({ error: 'Not your trip' });
            }

            if (!['open', 'awarded'].includes(trip.status)) {
                return res
                    .status(400)
                    .json({ error: 'Only open or awarded trips can be cancelled' });
            }

            // 낙찰된 여정이 취소되면 이미 청구한 수수료를 환불한다 — 단,
            // "기사님 사유로 취소"는 미환불(프론트 PASSENGER_CANCEL_REASONS와 문구 동기화 유지).
            if (trip.status === 'awarded' && reason !== DRIVER_FAULT_CANCEL_REASON) {
                const commissionCharge = await prisma.paymentTransaction.findFirst({
                    where: {
                        tripId: trip.id,
                        kind: 'platform_commission',
                        status: 'succeeded',
                    },
                });

                if (commissionCharge?.tossPaymentKey) {
                    const refundResult = await cancelPayment(
                        commissionCharge.tossPaymentKey,
                        `여정 취소 (${reason})`,
                    );
                    if (refundResult.ok) {
                        await prisma.paymentTransaction.update({
                            where: { id: commissionCharge.id },
                            data: { status: 'cancelled' },
                        });
                    } else {
                        console.error(
                            'Commission refund failed:',
                            refundResult.errorText,
                        );
                    }
                }
            }

            // Soft-cancel: keep the trip row (and its bids/chats/review) so the
            // driver's UI can show a "취소됨" status instead of the trip just
            // disappearing. `npm run db:purge-cancelled-trips` hard-deletes
            // cancelled trips after the fact.
            await prisma.trip.update({
                where: { id: trip.id },
                data: {
                    status: TripStatus.cancelled,
                    cancelReason: reason,
                    cancelledAt: new Date(),
                },
            });

            res.json({ message: 'Trip cancelled successfully' });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.issues[0].message });
            }
            console.error('Cancel trip error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
