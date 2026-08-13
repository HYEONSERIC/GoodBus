import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { issueBillingKey, chargeBillingKey } from '../utils/toss';
import {
    MEMBERSHIP_PRICES_WON,
    MIN_BID_ADDON_PRICE_WON,
} from '../utils/paymentPricing';

const router = express.Router();

function addOneMonth(date: Date): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    return next;
}

router.get(
    '/billing-key',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const billingKey = await prisma.billingKey.findUnique({
            where: { userId: req.user!.userId },
            select: { cardBrand: true, cardLast4: true },
        });

        if (!billingKey) {
            return res.json({ registered: false });
        }

        res.json({
            registered: true,
            cardBrand: billingKey.cardBrand,
            cardLast4: billingKey.cardLast4,
        });
    },
);

router.delete(
    '/billing-key',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const subscription = await prisma.membershipSubscription.findUnique({
            where: { userId: req.user!.userId },
        });
        if (subscription?.status === 'active') {
            return res.status(400).json({
                error: '멤버십 구독을 먼저 해지해야 카드를 삭제할 수 있습니다',
            });
        }

        await prisma.billingKey.deleteMany({
            where: { userId: req.user!.userId },
        });
        res.json({ deleted: true });
    },
);

const billingKeyConfirmSchema = z.object({
    authKey: z.string().min(1),
});

router.post(
    '/billing-key/confirm',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const { authKey } = billingKeyConfirmSchema.parse(req.body);
            const customerKey = req.user!.userId;

            const result = await issueBillingKey(authKey, customerKey);
            if (!result.ok) {
                return res.status(400).json({ error: result.errorText });
            }

            await prisma.billingKey.upsert({
                where: { userId: req.user!.userId },
                create: {
                    userId: req.user!.userId,
                    tossBillingKey: result.data.billingKey,
                    customerKey,
                    cardBrand: result.data.card?.company,
                    cardLast4: result.data.card?.number?.slice(-4),
                },
                update: {
                    tossBillingKey: result.data.billingKey,
                    cardBrand: result.data.card?.company,
                    cardLast4: result.data.card?.number?.slice(-4),
                },
            });

            res.json({ registered: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            console.error('Billing key confirm error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

const subscribeSchema = z.object({
    plan: z.enum(['Plus', 'Premium', 'Business']),
    acknowledgedPlanChange: z.boolean().optional().default(false),
});

router.post(
    '/subscribe',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const { plan, acknowledgedPlanChange } = subscribeSchema.parse(
                req.body,
            );

            const billingKey = await prisma.billingKey.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!billingKey) {
                return res
                    .status(400)
                    .json({ error: '등록된 결제 카드가 없습니다' });
            }

            const existingSubscription =
                await prisma.membershipSubscription.findUnique({
                    where: { userId: req.user!.userId },
                });
            const isPlanChange =
                existingSubscription?.status === 'active' &&
                existingSubscription.plan !== plan;
            const isDowngrade =
                isPlanChange &&
                MEMBERSHIP_PRICES_WON[plan] <
                    MEMBERSHIP_PRICES_WON[existingSubscription!.plan];

            if (isPlanChange && !acknowledgedPlanChange) {
                return res.status(400).json({
                    error: '플랜 변경 안내를 확인해주세요',
                    requiresAcknowledgement: true,
                });
            }

            // 다운그레이드는 지금 결제하지 않고, 현재 결제 주기가 끝나는
            // nextBillingAt에 정기결제 크론이 새 플랜으로 전환+과금한다.
            if (isDowngrade) {
                const updated = await prisma.membershipSubscription.update({
                    where: { userId: req.user!.userId },
                    data: { pendingPlan: plan },
                });
                return res.json({ subscription: updated });
            }

            const metadata = isPlanChange
                ? {
                      changeType: 'plan_change',
                      previousPlan: existingSubscription!.plan,
                      acknowledgedPlanChange: true,
                  }
                : undefined;

            const amount = MEMBERSHIP_PRICES_WON[plan];
            const orderId = crypto.randomUUID();
            const result = await chargeBillingKey(
                billingKey.tossBillingKey,
                billingKey.customerKey,
                amount,
                orderId,
                `GoodBus 멤버십 ${plan}`,
            );

            if (!result.ok) {
                await prisma.paymentTransaction.create({
                    data: {
                        userId: req.user!.userId,
                        kind: 'membership_subscription',
                        status: 'failed',
                        amount,
                        tossOrderId: orderId,
                        failReason: result.errorText,
                        metadata,
                    },
                });
                return res.status(400).json({ error: result.errorText });
            }

            const [, , subscription] = await prisma.$transaction([
                prisma.paymentTransaction.create({
                    data: {
                        userId: req.user!.userId,
                        kind: 'membership_subscription',
                        status: 'succeeded',
                        amount,
                        tossOrderId: orderId,
                        tossPaymentKey: result.data.paymentKey,
                        metadata,
                    },
                }),
                prisma.user.update({
                    where: { id: req.user!.userId },
                    data: { membershipPlan: plan },
                }),
                prisma.membershipSubscription.upsert({
                    where: { userId: req.user!.userId },
                    create: {
                        userId: req.user!.userId,
                        plan,
                        status: 'active',
                        nextBillingAt: addOneMonth(new Date()),
                    },
                    update: {
                        plan,
                        pendingPlan: null,
                        status: 'active',
                        nextBillingAt: addOneMonth(new Date()),
                        cancelledAt: null,
                    },
                }),
            ]);

            res.json({ subscription });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            console.error('Subscribe error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.post(
    '/subscribe/cancel',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const subscription = await prisma.membershipSubscription.findUnique({
            where: { userId: req.user!.userId },
        });
        if (!subscription || subscription.status !== 'active') {
            return res.status(404).json({ error: 'Active subscription not found' });
        }

        const updated = await prisma.membershipSubscription.update({
            where: { userId: req.user!.userId },
            data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                pendingPlan: null,
            },
        });

        res.json({ subscription: updated });
    },
);

router.post(
    '/subscribe/downgrade/cancel',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const subscription = await prisma.membershipSubscription.findUnique({
            where: { userId: req.user!.userId },
        });
        if (!subscription?.pendingPlan) {
            return res
                .status(404)
                .json({ error: 'Pending downgrade not found' });
        }

        const updated = await prisma.membershipSubscription.update({
            where: { userId: req.user!.userId },
            data: { pendingPlan: null },
        });

        res.json({ subscription: updated });
    },
);

router.get(
    '/subscribe/status',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const subscription = await prisma.membershipSubscription.findUnique({
            where: { userId: req.user!.userId },
        });
        res.json({ subscription });
    },
);

router.post(
    '/subscribe/reactivate',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const subscription = await prisma.membershipSubscription.findUnique({
            where: { userId: req.user!.userId },
        });
        if (
            !subscription ||
            subscription.status !== 'cancelled' ||
            subscription.nextBillingAt <= new Date()
        ) {
            return res.status(400).json({
                error: '재구독 가능한 기간이 지났습니다. 새로 구독해주세요.',
            });
        }

        const [, updated] = await prisma.$transaction([
            prisma.user.update({
                where: { id: req.user!.userId },
                data: { membershipPlan: subscription.plan },
            }),
            prisma.membershipSubscription.update({
                where: { userId: req.user!.userId },
                data: { status: 'active', cancelledAt: null },
            }),
        ]);

        res.json({ subscription: updated });
    },
);

router.post(
    '/addon/min-bid/subscribe',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const billingKey = await prisma.billingKey.findUnique({
            where: { userId: req.user!.userId },
        });
        if (!billingKey) {
            return res
                .status(400)
                .json({ error: '등록된 결제 카드가 없습니다' });
        }

        const amount = MIN_BID_ADDON_PRICE_WON;
        const orderId = crypto.randomUUID();
        const result = await chargeBillingKey(
            billingKey.tossBillingKey,
            billingKey.customerKey,
            amount,
            orderId,
            'GoodBus 차량별 최저입찰금액 확인',
        );

        if (!result.ok) {
            await prisma.paymentTransaction.create({
                data: {
                    userId: req.user!.userId,
                    kind: 'min_bid_addon',
                    status: 'failed',
                    amount,
                    tossOrderId: orderId,
                    failReason: result.errorText,
                },
            });
            return res.status(400).json({ error: result.errorText });
        }

        const [, , subscription] = await prisma.$transaction([
            prisma.paymentTransaction.create({
                data: {
                    userId: req.user!.userId,
                    kind: 'min_bid_addon',
                    status: 'succeeded',
                    amount,
                    tossOrderId: orderId,
                    tossPaymentKey: result.data.paymentKey,
                },
            }),
            prisma.user.update({
                where: { id: req.user!.userId },
                data: { minBidAddonPurchased: true },
            }),
            prisma.minBidAddonSubscription.upsert({
                where: { userId: req.user!.userId },
                create: {
                    userId: req.user!.userId,
                    status: 'active',
                    nextBillingAt: addOneMonth(new Date()),
                },
                update: {
                    status: 'active',
                    nextBillingAt: addOneMonth(new Date()),
                    cancelledAt: null,
                },
            }),
        ]);

        res.json({ subscription });
    },
);

router.post(
    '/addon/min-bid/cancel',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const subscription = await prisma.minBidAddonSubscription.findUnique({
            where: { userId: req.user!.userId },
        });
        if (!subscription || subscription.status !== 'active') {
            return res
                .status(404)
                .json({ error: 'Active subscription not found' });
        }

        const updated = await prisma.minBidAddonSubscription.update({
            where: { userId: req.user!.userId },
            data: { status: 'cancelled', cancelledAt: new Date() },
        });

        res.json({ subscription: updated });
    },
);

router.get(
    '/addon/min-bid/status',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const subscription = await prisma.minBidAddonSubscription.findUnique({
            where: { userId: req.user!.userId },
        });
        res.json({ subscription });
    },
);

router.post(
    '/addon/min-bid/reactivate',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const subscription = await prisma.minBidAddonSubscription.findUnique({
            where: { userId: req.user!.userId },
        });
        if (
            !subscription ||
            subscription.status !== 'cancelled' ||
            subscription.nextBillingAt <= new Date()
        ) {
            return res.status(400).json({
                error: '재구독 가능한 기간이 지났습니다. 새로 구독해주세요.',
            });
        }

        const [, updated] = await prisma.$transaction([
            prisma.user.update({
                where: { id: req.user!.userId },
                data: { minBidAddonPurchased: true },
            }),
            prisma.minBidAddonSubscription.update({
                where: { userId: req.user!.userId },
                data: { status: 'active', cancelledAt: null },
            }),
        ]);

        res.json({ subscription: updated });
    },
);

export default router;
