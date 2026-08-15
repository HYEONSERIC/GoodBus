import crypto from 'crypto';
import { MembershipPlan } from '@prisma/client';
import prisma from '../utils/db';
import { chargeBillingKey } from '../utils/toss';
import { MEMBERSHIP_PRICES_WON, MIN_BID_ADDON_PRICE_WON } from '../utils/paymentPricing';

function addOneMonth(date: Date): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    return next;
}

async function chargeWithRetry(
    userId: string,
    amount: number,
    orderName: string,
    billingKey: { tossBillingKey: string; customerKey: string },
) {
    for (let attempt = 1; attempt <= 2; attempt++) {
        const orderId = crypto.randomUUID();
        const result = await chargeBillingKey(
            billingKey.tossBillingKey,
            billingKey.customerKey,
            amount,
            orderId,
            orderName,
        );
        if (result.ok || attempt === 2) {
            return { result, orderId };
        }
        console.warn(
            `[${userId}] ${attempt}차 과금 실패, 재시도: ${result.errorText}`,
        );
    }
    throw new Error('unreachable');
}

async function processMembershipSubscriptions() {
    const due = await prisma.membershipSubscription.findMany({
        where: { status: 'active', nextBillingAt: { lte: new Date() } },
    });

    if (due.length === 0) {
        console.log('멤버십 정기결제 대상이 없습니다.');
        return;
    }

    console.log(`멤버십 정기결제 대상 ${due.length}건 처리 중…`);

    for (const subscription of due) {
        const billingKey = await prisma.billingKey.findUnique({
            where: { userId: subscription.userId },
        });

        if (!billingKey) {
            console.error(
                `[${subscription.userId}] 빌링키 없음 — Basic으로 강등`,
            );
            await prisma.$transaction([
                prisma.membershipSubscription.update({
                    where: { userId: subscription.userId },
                    data: { status: 'past_due' },
                }),
                prisma.user.update({
                    where: { id: subscription.userId },
                    data: { membershipPlan: 'Basic' },
                }),
            ]);
            continue;
        }

        // 예약된 다운그레이드(pendingPlan)가 있으면 이번 갱신부터 그 플랜으로 과금·전환한다.
        const billedPlan = (subscription.pendingPlan ??
            subscription.plan) as MembershipPlan;
        const amount = MEMBERSHIP_PRICES_WON[billedPlan];
        const { result, orderId } = await chargeWithRetry(
            subscription.userId,
            amount,
            `GoodBus 멤버십 ${billedPlan} 정기결제`,
            billingKey,
        );

        if (result.ok) {
            await prisma.$transaction([
                prisma.paymentTransaction.create({
                    data: {
                        userId: subscription.userId,
                        kind: 'membership_subscription',
                        status: 'succeeded',
                        amount,
                        tossOrderId: orderId,
                        tossPaymentKey: result.data.paymentKey,
                        metadata: subscription.pendingPlan
                            ? {
                                  changeType: 'scheduled_downgrade_applied',
                                  previousPlan: subscription.plan,
                              }
                            : undefined,
                    },
                }),
                prisma.user.update({
                    where: { id: subscription.userId },
                    data: { membershipPlan: billedPlan },
                }),
                prisma.membershipSubscription.update({
                    where: { userId: subscription.userId },
                    data: {
                        plan: billedPlan,
                        pendingPlan: null,
                        nextBillingAt: addOneMonth(subscription.nextBillingAt),
                    },
                }),
            ]);
            console.log(
                `[${subscription.userId}] 멤버십 과금 성공 (${billedPlan}, ${amount}원)`,
            );
        } else {
            await prisma.$transaction([
                prisma.paymentTransaction.create({
                    data: {
                        userId: subscription.userId,
                        kind: 'membership_subscription',
                        status: 'failed',
                        amount,
                        tossOrderId: orderId,
                        failReason: result.errorText,
                    },
                }),
                prisma.membershipSubscription.update({
                    where: { userId: subscription.userId },
                    data: { status: 'past_due' },
                }),
                prisma.user.update({
                    where: { id: subscription.userId },
                    data: { membershipPlan: 'Basic' },
                }),
            ]);
            console.error(
                `[${subscription.userId}] 멤버십 과금 최종 실패, Basic으로 강등: ${result.errorText}`,
            );
        }
    }
}

async function processMinBidAddonSubscriptions() {
    const due = await prisma.minBidAddonSubscription.findMany({
        where: { status: 'active', nextBillingAt: { lte: new Date() } },
    });

    if (due.length === 0) {
        console.log('최저입찰금액 애드온 정기결제 대상이 없습니다.');
        return;
    }

    console.log(`최저입찰금액 애드온 정기결제 대상 ${due.length}건 처리 중…`);

    for (const subscription of due) {
        const billingKey = await prisma.billingKey.findUnique({
            where: { userId: subscription.userId },
        });

        if (!billingKey) {
            console.error(
                `[${subscription.userId}] 빌링키 없음 — 애드온 해지`,
            );
            await prisma.$transaction([
                prisma.minBidAddonSubscription.update({
                    where: { userId: subscription.userId },
                    data: { status: 'past_due' },
                }),
                prisma.user.update({
                    where: { id: subscription.userId },
                    data: { minBidAddonPurchased: false },
                }),
            ]);
            continue;
        }

        const amount = MIN_BID_ADDON_PRICE_WON;
        const { result, orderId } = await chargeWithRetry(
            subscription.userId,
            amount,
            'GoodBus 차량별 최저입찰금액 확인 정기결제',
            billingKey,
        );

        if (result.ok) {
            await prisma.$transaction([
                prisma.paymentTransaction.create({
                    data: {
                        userId: subscription.userId,
                        kind: 'min_bid_addon',
                        status: 'succeeded',
                        amount,
                        tossOrderId: orderId,
                        tossPaymentKey: result.data.paymentKey,
                    },
                }),
                prisma.minBidAddonSubscription.update({
                    where: { userId: subscription.userId },
                    data: { nextBillingAt: addOneMonth(subscription.nextBillingAt) },
                }),
            ]);
            console.log(`[${subscription.userId}] 애드온 과금 성공 (${amount}원)`);
        } else {
            await prisma.$transaction([
                prisma.paymentTransaction.create({
                    data: {
                        userId: subscription.userId,
                        kind: 'min_bid_addon',
                        status: 'failed',
                        amount,
                        tossOrderId: orderId,
                        failReason: result.errorText,
                    },
                }),
                prisma.minBidAddonSubscription.update({
                    where: { userId: subscription.userId },
                    data: { status: 'past_due' },
                }),
                prisma.user.update({
                    where: { id: subscription.userId },
                    data: { minBidAddonPurchased: false },
                }),
            ]);
            console.error(
                `[${subscription.userId}] 애드온 과금 최종 실패, 해지: ${result.errorText}`,
            );
        }
    }
}

async function main() {
    await processMembershipSubscriptions();
    await processMinBidAddonSubscriptions();
    console.log('정기결제 처리 완료.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
