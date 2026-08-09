'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PassengerQuoteTripCard } from '@/components/passenger/PassengerQuoteTripCard';
import { collectOpenBidsForCard } from '@/lib/passengerQuoteBids';
import {
    getRoundPartnerTrip,
    groupTripCardsForDisplay,
    type RoundPartnerOptions,
} from '@/lib/tripGroups';
import type { PassengerBid, PassengerTrip } from '@/types/passenger';

export function PassengerQuoteTripsList({
    trips,
    distanceByTripId,
    expandedTripIds,
    quotesExpandedTripIds,
    cancelMenuTripId,
    roundOptions,
    onToggleTripDetail,
    onToggleQuotesTrip,
    onToggleCancelMenu,
    onOpenCancelDialog,
    onOpenEditDialog,
    onSelectBid,
    formatDriverRating,
    resolveMediaUrl,
}: {
    trips: PassengerTrip[];
    distanceByTripId: Record<string, number | null>;
    expandedTripIds: string[];
    quotesExpandedTripIds: string[];
    cancelMenuTripId: string | null;
    roundOptions?: RoundPartnerOptions;
    onToggleTripDetail: (tripId: string) => void;
    onToggleQuotesTrip: (tripId: string) => void;
    onToggleCancelMenu: (tripId: string) => void;
    onOpenCancelDialog: (trip: PassengerTrip) => void;
    onOpenEditDialog: (trip: PassengerTrip) => void;
    onSelectBid: (bid: PassengerBid, bidTrip: PassengerTrip) => void;
    formatDriverRating: (driverId: string) => string;
    resolveMediaUrl: (url?: string | null) => string | null;
}) {
    const nowMs = Date.now();
    const quoteTrips = trips.filter(
        (t) =>
            t.status === 'open' &&
            new Date(t.dateTime).getTime() >= nowMs,
    );
    const quoteCardTrips = groupTripCardsForDisplay(
        quoteTrips,
        quoteTrips,
        roundOptions,
    );

    if (quoteCardTrips.length === 0) {
        return (
            <Card className="rounded-none">
                <CardContent className="p-6 text-sm text-gray-600">
                    등록된 견적이 없습니다. 상단의 &apos;견적 신청&apos;으로 새
                    여정을 등록해 주세요.
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {quoteCardTrips.map((trip) => {
                const partner = getRoundPartnerTrip(
                    trip,
                    quoteTrips,
                    roundOptions,
                );
                const isRound = Boolean(partner);
                const openBidRows = collectOpenBidsForCard(trip, partner);
                const openBidCount = openBidRows.length;
                const awardedBid = (trip.bids || []).find(
                    (b) => b.status === 'awarded',
                );

                return (
                    <PassengerQuoteTripCard
                        key={trip.id}
                        trip={trip}
                        partner={partner}
                        isRound={isRound}
                        distance={distanceByTripId[trip.id] ?? null}
                        expanded={expandedTripIds.includes(trip.id)}
                        quotesExpanded={quotesExpandedTripIds.includes(
                            trip.id,
                        )}
                        cancelMenuOpen={cancelMenuTripId === trip.id}
                        openBidRows={openBidRows}
                        openBidCount={openBidCount}
                        awardedBid={awardedBid}
                        onToggleDetail={() => onToggleTripDetail(trip.id)}
                        onToggleCancelMenu={() =>
                            onToggleCancelMenu(trip.id)
                        }
                        onOpenCancelDialog={() => {
                            onOpenCancelDialog(trip);
                            onToggleCancelMenu(trip.id);
                        }}
                        onOpenEditDialog={() => {
                            onOpenEditDialog(trip);
                            onToggleCancelMenu(trip.id);
                        }}
                        onToggleQuotes={() => onToggleQuotesTrip(trip.id)}
                        onSelectBid={onSelectBid}
                        formatDriverRating={formatDriverRating}
                        resolveMediaUrl={resolveMediaUrl}
                    />
                );
            })}
        </>
    );
}
