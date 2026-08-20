'use client';

import { useMemo } from 'react';
import { OpenTripCard } from '@/components/trips/OpenTripCard';
import {
    countOpenBids,
    biddingTripKm,
} from '@/lib/tripDisplay';
import {
    getRoundPartnerTrip,
    groupTripCardsForDisplay,
    type RoundPartnerOptions,
} from '@/lib/tripGroups';
import type { OpenTripLike } from '@/types/trip';

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
}) {
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

                return (
                    <OpenTripCard
                        key={trip.id}
                        trip={trip}
                        isRound={isRound}
                        km={km}
                        bidCount={bidCount}
                        onBid={() => onBid(trip)}
                    />
                );
            })}
        </>
    );
}
