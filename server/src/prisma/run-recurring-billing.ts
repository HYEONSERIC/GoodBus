import crypto from 'crypto';
import { MembershipPlan } from '@prisma/client';
import prisma from '../utils/db';
import { chargeBillingKey } from '../utils/nicepay';
import { MEMBERSHIP_PRICES_WON, MIN_BID_ADDON_PRICE_WON } from '../utils/paymentPricing';
import { sendAlimtalk, formatKstDateTime } from '../utils/alimtalk';

async function notifyRecurringPaymentFailed(
    userId: string,
    orderId: string,
    paymentLabel: string,
    amount: number,
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, companyName: true, email: true, phoneNumber: true },
    });
    if (!user) return;
    // 이 스크립트는 일회성 CLI라 main()이 끝나면 바로 Prisma 연결을 닫는다
    // (라우트처럼 프로세스가 계속 떠 있지 않음) — fire-and-forget하면 발송이
    // 끝나기 전에 연결이 닫힐 수 있어 반드시 await한다.
    await sendAlimtalk({
        templateKey: 'RECURRING_PAYMENT_FAILED',
        receiverUserId: userId,
        receiverPhone: user.phoneNumber,
        // orderId는 시도마다 새로 생기므로, 이 키는 "같은 결제 시도"에 대한
        // 중복 발송만 막고 다음 날 재시도 실패는 다시 보낸다.
        dedupeKey: `RECURRING_PAYMENT_FAILED:${orderId}`,
        variables: {
            기사명: user.displayName || user.companyName || user.email || '기사',
            결제항목: paymentLabel,
            결제금액: `${amount.toLocaleString('ko-KR')}원`,
            실패일시: formatKstDateTime(new Date()),
        },
    });
}

async function notifyMembershipPaymentCompleted(
    userId: string,
    orderId: string,
    paymentLabel: string,
    amount: number,
    nextBillingAt: Date,
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, companyName: true, email: true, phoneNumber: true },
    });
    if (!user) return;
    await sendAlimtalk({
        templateKey: 'MEMBERSHIP_PAYMENT_COMPLETED',
        receiverUserId: userId,
        receiverPhone: user.phoneNumber,
        dedupeKey: `MEMBERSHIP_PAYMENT_COMPLETED:${orderId}`,
        variables: {
            기사명: user.displayName || user.companyName || user.email || '기사',
            결제항목: paymentLabel,
            결제금액: `${amount.toLocaleString('ko-KR')}원`,
            결제일시: formatKstDateTime(new Date()),
            다음결제일: formatKstDateTime(nextBillingAt).split(' ')[0],
        },
    });
}

function addOneMonth(date: Date): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    return next;
}

async function chargeWithRetry(
    userId: string,
    amount: number,
    orderName: string,
    billingKey: { nicepayBillingKey: string },
) {
    for (let attempt = 1; attempt <= 2; attempt++) {
        const orderId = crypto.randomUUID();
        const result = await chargeBillingKey(
            billingKey.nicepayBillingKey,
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
                        orderId,
                        tid: result.data.tid,
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
            await notifyMembershipPaymentCompleted(
                subscription.userId,
                orderId,
                `멤버십(${billedPlan})`,
                amount,
                addOneMonth(subscription.nextBillingAt),
            );
        } else {
            await prisma.$transaction([
                prisma.paymentTransaction.create({
                    data: {
                        userId: subscription.userId,
                        kind: 'membership_subscription',
                        status: 'failed',
                        amount,
                        orderId,
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
            await notifyRecurringPaymentFailed(
                subscription.userId,
                orderId,
                `멤버십(${billedPlan})`,
                amount,
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
                        orderId,
                        tid: result.data.tid,
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
                        orderId,
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
            await notifyRecurringPaymentFailed(
                subscription.userId,
                orderId,
                '최저입찰금액 확인 애드온',
                amount,
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
