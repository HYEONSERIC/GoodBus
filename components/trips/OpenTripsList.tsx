'use client';

import { useMemo } from 'react';
import { OpenTripCard, type TripBidTierBadge } from '@/components/trips/OpenTripCard';
import {
    countOpenBids,
    biddingTripKm,
} from '@/lib/tripDisplay';
import {
    getRoundPartnerTrip,
    groupTripCardsForDisplay,
    type RoundPartnerOptions,
} from '@/lib/tripGroups';
import { TRIP_BID_CAP_BY_TIER } from '@/lib/membershipLimits';
import type { OpenTripLike } from '@/types/trip';

/** 여정당 입찰 건수로 배지·입찰 가능 여부를 판정(승객 지정 아님, 시스템 자동). */
function tripBidTierBadge(bidCount: number): TripBidTierBadge {
    if (bidCount >= TRIP_BID_CAP_BY_TIER.Business) return 'closed';
    if (bidCount >= TRIP_BID_CAP_BY_TIER.Premium) return 'business';
    if (bidCount >= TRIP_BID_CAP_BY_TIER.Basic) return 'membership';
    return null;
}

export function OpenTripsList<T extends OpenTripLike>({
    trips,
    allTrips,
    filteredTrips,
    distanceByTripId = {},
    onBid,
    emptyWhenNoTrips,
    emptyWhenFiltered,
    roundOptions,
    showKm = true,
    myMembershipPlan,
}: {
    trips: T[];
    allTrips: T[];
    filteredTrips: T[];
    distanceByTripId?: Record<string, number | null>;
    onBid: (trip: T) => void;
    emptyWhenNoTrips: string;
    emptyWhenFiltered: string;
    roundOptions?: RoundPartnerOptions;
    showKm?: boolean;
    /** 로그인한 기사·회사의 현재 멤버십 등급 — 여정당 입찰 문턱 판정용 */
    myMembershipPlan?: string | null;
}) {
    const myTripBidCap =
        TRIP_BID_CAP_BY_TIER[myMembershipPlan || 'Basic'] ??
        TRIP_BID_CAP_BY_TIER.Basic;
    // groupTripCardsForDisplay의 왕복 매칭이 O(n^2)라 매 렌더 재계산을 피한다
    // (다른 대시보드 훅의 동일 계열 호출은 전부 useMemo로 감싸져 있음).
    const cardTrips = useMemo(
        () => groupTripCardsForDisplay(filteredTrips, allTrips, roundOptions),
        [filteredTrips, allTrips, roundOptions],
    );

    if (cardTrips.length === 0) {
        return (
            <p className="px-4 py-12 text-center text-sm text-gray-500">
                {trips.length === 0 ? emptyWhenNoTrips : emptyWhenFiltered}
            </p>
        );
    }

    return (
        <>
            {cardTrips.map((trip) => {
                const partner = getRoundPartnerTrip(trip, allTrips, roundOptions);
                const isRound = Boolean(partner);
                const km = showKm
                    ? biddingTripKm(trip, partner, distanceByTripId)
                    : null;
                const bidCount = countOpenBids(trip, partner);
                const tierBadge = tripBidTierBadge(bidCount);
                const blockedForMe = bidCount >= myTripBidCap;

                return (
                    <OpenTripCard
                        key={trip.id}
                        trip={trip}
                        isRound={isRound}
                        km={km}
                        bidCount={bidCount}
                        tierBadge={tierBadge}
                        blockedForMe={blockedForMe}
                        onBid={() => onBid(trip)}
                    />
                );
            })}
        </>
    );
}
