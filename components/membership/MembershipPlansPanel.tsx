'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BIDDER_MEMBERSHIP_PLANS } from '@/lib/membershipPlans';
import { MEMBERSHIP_PRICES_WON, MIN_BID_ADDON_PRICE_WON } from '@/lib/paymentPricing';
import { paymentsAPI, bidsAPI } from '@/lib/api';

type SubscriptionStatus = {
    plan?: string;
    pendingPlan?: string | null;
    status: 'active' | 'past_due' | 'cancelled';
    nextBillingAt: string;
} | null;

const PLAN_ID_TO_ENUM: Record<string, 'Plus' | 'Premium' | 'Business'> = {
    plus: 'Plus',
    premium: 'Premium',
    business: 'Business',
};

function formatDate(value: string) {
    return new Date(value).toLocaleDateString();
}

export function MembershipPlansPanel({
    userId,
    currentPlanName,
}: {
    userId?: string;
    currentPlanName?: string | null;
}) {
    const [openMembership, setOpenMembership] = useState<string | null>(null);
    const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionStatus>(null);
    const [acknowledgedChange, setAcknowledgedChange] = useState(false);

    const currentPlanId = (currentPlanName || 'Basic').toLowerCase();
    const currentPlanCard = BIDDER_MEMBERSHIP_PLANS.find(
        (p) => p.id === currentPlanId,
    );
    const currentPriceWon = MEMBERSHIP_PRICES_WON[currentPlanName || 'Basic'];
    const pendingPlanId = subscription?.pendingPlan?.toLowerCase() || null;
    const pendingPlanCard = pendingPlanId
        ? BIDDER_MEMBERSHIP_PLANS.find((p) => p.id === pendingPlanId)
        : null;

    function loadSubscriptionStatus() {
        paymentsAPI
            .getSubscriptionStatus()
            .then((res: { subscription: SubscriptionStatus }) =>
                setSubscription(res.subscription),
            )
            .catch(() => setSubscription(null));
    }

    useEffect(() => {
        loadSubscriptionStatus();
    }, []);

    useEffect(() => {
        setAcknowledgedChange(false);
    }, [openMembership]);

    async function handleSelectPlan(planId: string, isPlanChange: boolean) {
        if (planId === 'basic') {
            alert('베이직은 별도 결제 없이 기본 제공됩니다.');
            return;
        }
        const planEnum = PLAN_ID_TO_ENUM[planId];
        if (!planEnum || !userId) return;
        if (isPlanChange && !acknowledgedChange) return;

        setBusyPlanId(planId);
        try {
            const res = await paymentsAPI.subscribe(planEnum, isPlanChange);
            if (res?.subscription?.pendingPlan) {
                alert(
                    `다운그레이드가 예약되었습니다. ${formatDate(res.subscription.nextBillingAt)}부터 적용됩니다. 그 전까지는 현재 플랜 혜택이 유지됩니다.`,
                );
            } else {
                alert('멤버십 구독이 완료되었습니다.');
            }
            window.location.reload();
        } catch (e) {
            alert(
                e instanceof Error
                    ? e.message
                    : '구독에 실패했습니다. 카드가 등록되어 있는지 확인해주세요.',
            );
        } finally {
            setBusyPlanId(null);
        }
    }

    async function handleCancelPlan(planId: string) {
        if (!confirm('멤버십을 해지하시겠습니까?')) return;

        setBusyPlanId(planId);
        try {
            const res = await paymentsAPI.cancelSubscription();
            const nextBillingAt = res?.subscription?.nextBillingAt;
            alert(
                nextBillingAt
                    ? `해지되었습니다. ${formatDate(nextBillingAt)}까지는 계속 이용 가능합니다.`
                    : '해지되었습니다.',
            );
            window.location.reload();
        } catch (e) {
            alert(e instanceof Error ? e.message : '해지에 실패했습니다.');
        } finally {
            setBusyPlanId(null);
        }
    }

    async function handleReactivatePlan(planId: string) {
        setBusyPlanId(planId);
        try {
            await paymentsAPI.reactivateSubscription();
            alert('다시 구독되었습니다.');
            window.location.reload();
        } catch (e) {
            alert(e instanceof Error ? e.message : '재구독에 실패했습니다.');
        } finally {
            setBusyPlanId(null);
        }
    }

    async function handleCancelPendingDowngrade(planId: string) {
        if (!confirm('예약된 다운그레이드를 취소하시겠습니까?')) return;

        setBusyPlanId(planId);
        try {
            await paymentsAPI.cancelPendingDowngrade();
            alert('예약이 취소되었습니다.');
            window.location.reload();
        } catch (e) {
            alert(e instanceof Error ? e.message : '예약 취소에 실패했습니다.');
        } finally {
            setBusyPlanId(null);
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold">버스대절 멤버십</h2>
                <p className="text-sm text-gray-600">뿌린대로 거두리라</p>
            </div>
            <div className="space-y-3">
                {BIDDER_MEMBERSHIP_PLANS.map((plan) => {
                    const isActive = plan.id === currentPlanId;
                    const isCancelledGracePeriod =
                        isActive && subscription?.status === 'cancelled';
                    const isPendingTarget =
                        !isActive && plan.id === pendingPlanId;
                    const planEnum = PLAN_ID_TO_ENUM[plan.id];
                    const isDowngradeTarget =
                        planEnum != null &&
                        MEMBERSHIP_PRICES_WON[planEnum] < currentPriceWon;
                    return (
                        <div
                            key={plan.id}
                            className={`rounded-lg border bg-white ${
                                isActive || isPendingTarget
                                    ? 'border-black ring-1 ring-black'
                                    : ''
                            }`}
                        >
                            <button
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-3"
                                onClick={() =>
                                    setOpenMembership(
                                        openMembership === plan.id
                                            ? null
                                            : plan.id,
                                    )
                                }
                            >
                                <span className="flex items-center gap-2 font-semibold">
                                    {plan.name}
                                    {isActive && (
                                        <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                                            {isCancelledGracePeriod
                                                ? '해지 예정'
                                                : pendingPlanId
                                                  ? '전환 예정 있음'
                                                  : '이용중'}
                                        </span>
                                    )}
                                    {isPendingTarget && (
                                        <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-medium text-white">
                                            전환 예정
                                        </span>
                                    )}
                                </span>
                                <span className="text-sm text-gray-600">
                                    {plan.price}
                                </span>
                            </button>
                            {openMembership === plan.id && (
                                <div className="space-y-3 border-t px-4 py-4">
                                    <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                                        {plan.features.map((feature) => (
                                            <li key={feature}>{feature}</li>
                                        ))}
                                    </ul>
                                    {isCancelledGracePeriod ? (
                                        <div className="space-y-2">
                                            <p className="rounded-md bg-gray-100 py-3 text-center text-sm font-medium text-gray-700">
                                                구독 해지되었습니다.{' '}
                                                {formatDate(
                                                    subscription!.nextBillingAt,
                                                )}
                                                까지 이용 가능합니다.
                                            </p>
                                            <Button
                                                className="w-full"
                                                disabled={
                                                    busyPlanId === plan.id
                                                }
                                                onClick={() =>
                                                    handleReactivatePlan(
                                                        plan.id,
                                                    )
                                                }
                                            >
                                                {busyPlanId === plan.id
                                                    ? '처리 중…'
                                                    : '다시 구독하기'}
                                            </Button>
                                        </div>
                                    ) : isActive ? (
                                        <div className="space-y-2">
                                            <p className="rounded-md bg-gray-100 py-3 text-center text-sm font-medium text-gray-700">
                                                현재 이용 중인 멤버십입니다
                                            </p>
                                            {pendingPlanCard && (
                                                <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                                                    <p className="text-xs text-gray-700">
                                                        다음 결제일(
                                                        {formatDate(
                                                            subscription!
                                                                .nextBillingAt,
                                                        )}
                                                        )부터{' '}
                                                        {pendingPlanCard.name}
                                                        으로 전환 예정입니다.
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full"
                                                        disabled={
                                                            busyPlanId ===
                                                            plan.id
                                                        }
                                                        onClick={() =>
                                                            handleCancelPendingDowngrade(
                                                                plan.id,
                                                            )
                                                        }
                                                    >
                                                        {busyPlanId ===
                                                        plan.id
                                                            ? '처리 중…'
                                                            : '전환 예약 취소'}
                                                    </Button>
                                                </div>
                                            )}
                                            {plan.id !== 'basic' && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    disabled={
                                                        busyPlanId === plan.id
                                                    }
                                                    onClick={() =>
                                                        handleCancelPlan(
                                                            plan.id,
                                                        )
                                                    }
                                                >
                                                    {busyPlanId === plan.id
                                                        ? '처리 중…'
                                                        : '구독 해지'}
                                                </Button>
                                            )}
                                        </div>
                                    ) : isPendingTarget ? (
                                        <p className="rounded-md bg-gray-100 py-3 text-center text-sm font-medium text-gray-700">
                                            다음 결제일(
                                            {formatDate(
                                                subscription!.nextBillingAt,
                                            )}
                                            )부터 이 플랜으로 전환됩니다
                                        </p>
                                    ) : currentPlanId !== 'basic' &&
                                      plan.id !== 'basic' ? (
                                        <div className="space-y-2">
                                            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                                                {isDowngradeTarget ? (
                                                    <>
                                                        이미{' '}
                                                        {currentPlanCard?.name}{' '}
                                                        멤버십을 이용 중입니다.
                                                        지금 신청하면 지금
                                                        결제되지 않고, 현재
                                                        결제 주기가 끝난 뒤
                                                        {plan.name} 요금(
                                                        {plan.price})으로
                                                        전환됩니다. 그 전까지는{' '}
                                                        {currentPlanCard?.name}{' '}
                                                        혜택이 그대로
                                                        유지됩니다.
                                                    </>
                                                ) : (
                                                    <>
                                                        이미{' '}
                                                        {currentPlanCard?.name}{' '}
                                                        멤버십을 이용 중입니다.
                                                        지금 변경하면 남은
                                                        기간 요금은 환불되지
                                                        않고, {plan.name} 요금(
                                                        {plan.price})이 즉시
                                                        전액 청구됩니다.
                                                    </>
                                                )}
                                            </p>
                                            <label className="flex items-center gap-2 text-xs text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={acknowledgedChange}
                                                    onChange={(e) =>
                                                        setAcknowledgedChange(
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                                위 내용을 확인했습니다
                                            </label>
                                            <Button
                                                className="w-full"
                                                disabled={
                                                    busyPlanId === plan.id ||
                                                    !acknowledgedChange
                                                }
                                                onClick={() =>
                                                    handleSelectPlan(
                                                        plan.id,
                                                        true,
                                                    )
                                                }
                                            >
                                                {busyPlanId === plan.id
                                                    ? '처리 중…'
                                                    : '멤버십 변경'}
                                            </Button>
                                        </div>
                                    ) : plan.id === 'basic' ? null : (
                                        <Button
                                            className="w-full"
                                            disabled={busyPlanId === plan.id}
                                            onClick={() =>
                                                handleSelectPlan(
                                                    plan.id,
                                                    false,
                                                )
                                            }
                                        >
                                            {busyPlanId === plan.id
                                                ? '처리 중…'
                                                : '멤버십 선택'}
                                        </Button>
                                    )}
                                    {plan.id !== 'basic' && (
                                        <p className="text-center text-xs text-gray-500">
                                            월 정기결제 상품이며 언제든 취소
                                            가능합니다.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                <MinBidAddonSubscriptionCard
                    open={openMembership === 'min-bid-addon'}
                    onToggle={() =>
                        setOpenMembership(
                            openMembership === 'min-bid-addon'
                                ? null
                                : 'min-bid-addon',
                        )
                    }
                />
            </div>
        </div>
    );
}

function MinBidAddonSubscriptionCard({
    open,
    onToggle,
}: {
    open: boolean;
    onToggle: () => void;
}) {
    const [purchased, setPurchased] = useState<boolean | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionStatus>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        bidsAPI
            .getMinByVehicleType()
            .then((res: { purchased: boolean }) => setPurchased(res.purchased))
            .catch(() => setPurchased(false));
        paymentsAPI
            .getMinBidAddonSubscriptionStatus()
            .then((res: { subscription: SubscriptionStatus }) =>
                setSubscription(res.subscription),
            )
            .catch(() => setSubscription(null));
    }, []);

    async function handleSubscribe() {
        setBusy(true);
        try {
            await paymentsAPI.subscribeMinBidAddon();
            alert('구독이 완료되었습니다.');
            window.location.reload();
        } catch (e) {
            alert(
                e instanceof Error
                    ? e.message
                    : '구독에 실패했습니다. 카드가 등록되어 있는지 확인해주세요.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function handleCancel() {
        if (!confirm('구독을 해지하시겠습니까?')) return;

        setBusy(true);
        try {
            const res = await paymentsAPI.cancelMinBidAddonSubscription();
            const nextBillingAt = res?.subscription?.nextBillingAt;
            alert(
                nextBillingAt
                    ? `해지되었습니다. ${formatDate(nextBillingAt)}까지는 계속 이용 가능합니다.`
                    : '해지되었습니다.',
            );
            window.location.reload();
        } catch (e) {
            alert(e instanceof Error ? e.message : '해지에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    }

    async function handleReactivate() {
        setBusy(true);
        try {
            await paymentsAPI.reactivateMinBidAddonSubscription();
            alert('다시 구독되었습니다.');
            window.location.reload();
        } catch (e) {
            alert(e instanceof Error ? e.message : '재구독에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    }

    const isActive = purchased === true;
    const isCancelledGracePeriod =
        isActive && subscription?.status === 'cancelled';

    return (
        <div
            className={`rounded-lg border bg-white ${
                isActive ? 'border-black ring-1 ring-black' : ''
            }`}
        >
            <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3"
                onClick={onToggle}
            >
                <span className="flex items-center gap-2 font-semibold">
                    차량별 최저입찰금액 확인
                    {isActive && (
                        <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                            {isCancelledGracePeriod ? '해지 예정' : '이용중'}
                        </span>
                    )}
                </span>
                <span className="text-sm text-gray-600">
                    {MIN_BID_ADDON_PRICE_WON.toLocaleString()}원/월
                </span>
            </button>
            {open && (
                <div className="space-y-3 border-t px-4 py-4">
                    <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                        <li>차량별(미니버스/밴·우등버스·대형버스) 최근 낙찰 최저금액 열람 가능</li>
                        <li>멤버십 티어와 무관하게 별도로 구독 가능</li>
                    </ul>
                    {isCancelledGracePeriod ? (
                        <div className="space-y-2">
                            <p className="rounded-md bg-gray-100 py-3 text-center text-sm font-medium text-gray-700">
                                구독 해지되었습니다.{' '}
                                {formatDate(subscription!.nextBillingAt)}까지
                                이용 가능합니다.
                            </p>
                            <Button
                                className="w-full"
                                disabled={busy}
                                onClick={() => void handleReactivate()}
                            >
                                {busy ? '처리 중…' : '다시 구독하기'}
                            </Button>
                        </div>
                    ) : isActive ? (
                        <div className="space-y-2">
                            <p className="rounded-md bg-gray-100 py-3 text-center text-sm font-medium text-gray-700">
                                현재 이용 중인 구독입니다
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                disabled={busy}
                                onClick={() => void handleCancel()}
                            >
                                {busy ? '처리 중…' : '구독 해지'}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            className="w-full"
                            disabled={busy}
                            onClick={() => void handleSubscribe()}
                        >
                            {busy ? '처리 중…' : '구독하기'}
                        </Button>
                    )}
                    <p className="text-center text-xs text-gray-500">
                        월 정기결제 상품이며 언제든 취소 가능합니다.
                    </p>
                </div>
            )}
        </div>
    );
}
