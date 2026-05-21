'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    TripReviewSection,
    type TripReviewRecord,
} from '@/components/TripReviewSection';
import { PassengerTripRouteBadges } from '@/components/passenger/PassengerTripRouteBadges';
import { TripRouteTypeColumn } from '@/components/trips/TripRouteTypeColumn';
import { bidderDisplayName } from '@/lib/passengerQuoteBids';
import {
    biddingCompanionSubtitle,
    formatTripDateLine,
    formatTripTime,
    getBusLabel,
    getServicePurposeLabel,
    paymentMethodLabel,
} from '@/lib/tripDisplay';
import type { OpenTripLike } from '@/types/trip';
import type { PassengerTrip } from '@/types/passenger';

export type AwardedTripBidderLayoutProps = {
    layout: 'bidder';
    trip: OpenTripLike & { status?: string; paxCount: number };
    isRound: boolean;
    distanceKm?: number | null;
    priceManwon: number;
    vehicleLabel: string;
    showStatusBadge?: boolean;
    interactive?: boolean;
    onPress?: () => void;
};

export type AwardedTripPassengerLayoutProps = {
    layout: 'passenger';
    trip: PassengerTrip;
    isRound: boolean;
    distanceKm?: number | null;
    variant: 'upcoming' | 'completed';
    existingReview?: TripReviewRecord;
    onCancelAward: () => void;
    onOpenChat: () => void;
    onReviewSubmitted: () => void;
    resolveImageUrl: (url?: string | null) => string | null;
};

export type AwardedTripCardProps =
    | AwardedTripBidderLayoutProps
    | AwardedTripPassengerLayoutProps;

function AwardedTripPriceBanner({
    variant,
    priceManwon,
}: {
    variant: 'upcoming' | 'completed' | 'bidder-reservation' | 'bidder-completed';
    priceManwon?: number;
}) {
    const label =
        variant === 'completed' || variant === 'bidder-completed'
            ? variant === 'bidder-completed'
                ? null
                : '이용 완료'
            : variant === 'bidder-reservation'
              ? null
              : '낙찰 완료';

    if (variant === 'bidder-completed' || variant === 'bidder-reservation') {
        return null;
    }

    return (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-center">
            {label ? (
                <p className="text-lg font-semibold text-green-800">{label}</p>
            ) : null}
            {priceManwon != null ? (
                <p className="mt-1 text-sm font-medium text-green-900">
                    낙찰가{' '}
                    <span className="tabular-nums">
                        {Number(priceManwon).toLocaleString()}만원
                    </span>
                </p>
            ) : null}
        </div>
    );
}

function BidderAwardedTripCardBody({
    trip,
    isRound,
    distanceKm,
    priceManwon,
    vehicleLabel,
    showStatusBadge,
    interactive,
    onPress,
}: Omit<AwardedTripBidderLayoutProps, 'layout'>) {
    const isCancelled = trip.status === 'cancelled';
    const companion = biddingCompanionSubtitle(trip);

    const inner = (
        <>
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                <p className="text-sm font-semibold leading-snug text-gray-900">
                    {formatTripDateLine(trip.dateTime)}
                    {companion ? (
                        <span className="font-normal text-gray-600">
                            {' '}
                            {companion}
                        </span>
                    ) : null}
                </p>
                <span className="shrink-0 text-sm font-semibold text-gray-900">
                    {trip.paxCount}명
                </span>
            </div>
            <div className="flex gap-3 py-3">
                <TripRouteTypeColumn isRound={isRound} km={distanceKm ?? null} />
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                    <p className="flex items-start gap-2 leading-snug text-gray-900">
                        <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                            출발지
                        </span>
                        <span className="min-w-0 font-medium">{trip.origin}</span>
                    </p>
                    <p className="flex items-start gap-2 leading-snug text-gray-900">
                        <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                            도착지
                        </span>
                        <span className="min-w-0 font-medium">
                            {trip.destination}
                        </span>
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                        {Number(priceManwon).toLocaleString()}만원
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                        {vehicleLabel}
                    </span>
                </div>
                {showStatusBadge ? (
                    isCancelled ? (
                        <span className="shrink-0 rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600">
                            승객취소
                        </span>
                    ) : (
                        <span className="shrink-0 rounded-full border border-green-500 bg-white px-2.5 py-1 text-xs font-medium text-green-600">
                            낙찰완료
                        </span>
                    )
                ) : null}
            </div>
        </>
    );

    if (interactive && onPress) {
        return (
            <div
                role="button"
                tabIndex={0}
                className="cursor-pointer p-4 transition-colors hover:bg-gray-50/80 active:bg-gray-50"
                onClick={onPress}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPress();
                    }
                }}
            >
                {inner}
            </div>
        );
    }

    return <div className="p-4">{inner}</div>;
}

function PassengerAwardedTripCardBody(props: AwardedTripPassengerLayoutProps) {
    const {
        trip,
        isRound,
        distanceKm,
        variant,
        existingReview,
        onCancelAward,
        onOpenChat,
        onReviewSubmitted,
        resolveImageUrl,
    } = props;
    const awardedBid = (trip.bids || []).find((b) => b.status === 'awarded');
    const bidder = awardedBid?.bidder;
    const showCancel = variant === 'upcoming' && trip.status === 'awarded';
    const paymentLabel = paymentMethodLabel(trip.paymentMethod);

    const actions: ReactNode = awardedBid ? (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Button
                    className="h-10 flex-1 rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-black/90"
                    onClick={onOpenChat}
                >
                    기사와 채팅하기
                </Button>
                {showCancel ? (
                    <Button
                        type="button"
                        className="h-10 flex-1 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                        onClick={onCancelAward}
                    >
                        낙찰 취소
                    </Button>
                ) : null}
            </div>
            {variant === 'completed' ? (
                <TripReviewSection
                    tripId={trip.id}
                    existing={existingReview}
                    servicePurpose={trip.servicePurpose}
                    onSubmitted={onReviewSubmitted}
                    resolveImageUrl={(url) => resolveImageUrl(url) ?? url}
                />
            ) : null}
        </div>
    ) : showCancel ? (
        <Button
            type="button"
            className="h-11 w-full rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
            onClick={onCancelAward}
        >
            낙찰 취소
        </Button>
    ) : null;

    return (
        <Card className="rounded-none border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
                <div className="space-y-1">
                    <PassengerTripRouteBadges
                        isRound={isRound}
                        distanceKm={distanceKm}
                    />
                    <CardTitle className="text-[16px] font-semibold leading-snug">
                        {trip.origin}
                    </CardTitle>
                    <CardTitle className="text-[16px] font-semibold leading-snug">
                        {trip.destination}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            출발
                        </span>
                        <span>
                            {formatTripDateLine(trip.dateTime)}{' '}
                            {formatTripTime(trip.dateTime)} 탑승
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-3 text-xs">
                    <span className="rounded border px-2 py-1">
                        {trip.companionType === 'with_schedule'
                            ? '일정 동행'
                            : '출발/귀환 운송만'}
                    </span>
                    <span className="rounded border px-2 py-1">
                        {trip.paxCount}명
                    </span>
                    <span className="rounded border px-2 py-1">
                        {getBusLabel(trip.busSize)}
                    </span>
                    {getServicePurposeLabel(trip.servicePurpose) ? (
                        <span className="rounded border px-2 py-1">
                            {getServicePurposeLabel(trip.servicePurpose)}
                        </span>
                    ) : null}
                    {paymentLabel ? (
                        <span className="rounded border px-2 py-1">
                            {paymentLabel === '카드 결제'
                                ? '카드결제'
                                : paymentLabel}
                        </span>
                    ) : null}
                </div>

                <div className="rounded-md border border-sky-400 bg-sky-50/50 p-3">
                    <p className="mb-1 text-sm font-semibold text-gray-800">
                        경유지 및 세부사항
                    </p>
                    <p className="text-sm text-gray-700">
                        {trip.stopoverDetail?.trim() || '없음'}
                    </p>
                </div>

                <AwardedTripPriceBanner
                    variant={variant}
                    priceManwon={awardedBid?.price}
                />

                <div className="rounded-md border bg-gray-50 px-3 py-3 text-sm">
                    <p className="font-semibold text-gray-900">담당 기사 정보</p>
                    <p className="mt-1 text-gray-700">
                        {bidder ? bidderDisplayName(bidder) : '확인 중'}
                    </p>
                    <p className="mt-0.5 text-gray-700">
                        전화번호: {bidder?.phoneNumber?.trim() || '미등록'}
                    </p>
                </div>

                {actions}
            </CardContent>
        </Card>
    );
}

/** 낙찰·예약 여정 카드 (승객 상세 / 기사·회사 컴팩트) */
export function AwardedTripCard(props: AwardedTripCardProps) {
    if (props.layout === 'passenger') {
        return <PassengerAwardedTripCardBody {...props} />;
    }
    return <BidderAwardedTripCardBody {...props} />;
}
