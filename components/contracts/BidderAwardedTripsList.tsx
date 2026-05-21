'use client';

import { AwardedTripCard } from '@/components/trips/AwardedTripCard';
import {
    getRoundPartnerTrip,
    type RoundPartnerOptions,
} from '@/lib/tripGroups';
import {
    biddingTripKm,
    getBusLabel,
    parseBidNoteForDisplay,
} from '@/lib/tripDisplay';
import type { DashboardBidderTrip } from '@/types/dashboard';

export function BidderAwardedTripsList({
    trips,
    partnerPool,
    roundOptions,
    distanceByTripId,
    userId,
    variant,
    onSelectTrip,
}: {
    trips: DashboardBidderTrip[];
    partnerPool: DashboardBidderTrip[];
    roundOptions?: RoundPartnerOptions;
    distanceByTripId: Record<string, number | null>;
    userId?: string;
    variant: 'reservation' | 'completed';
    onSelectTrip?: (payload: {
        trip: DashboardBidderTrip;
        partner?: DashboardBidderTrip;
    }) => void;
}) {
    const sectionLabel =
        variant === 'reservation'
            ? `낙찰완료 (${trips.length})`
            : `종료됨 (${trips.length})`;
    const emptyMessage =
        variant === 'reservation'
            ? '예약된 낙찰 여정이 없습니다'
            : '운행 완료된 여정이 없습니다';

    return (
        <>
            <p className="mb-2 text-left text-sm text-gray-500">{sectionLabel}</p>
            {trips.length > 0 ? (
                <div className="divide-y divide-gray-100 overflow-hidden border border-gray-200 bg-white shadow-sm">
                    {trips.map((trip) => {
                        const myBid = trip.bids.find(
                            (bid) =>
                                bid.bidder.id === userId &&
                                bid.status === 'awarded',
                        );
                        const partner = getRoundPartnerTrip(
                            trip,
                            partnerPool,
                            roundOptions,
                        );
                        const isRound = Boolean(partner);
                        const km = biddingTripKm(
                            trip,
                            partner,
                            distanceByTripId,
                        );
                        const { vehicleTag } = parseBidNoteForDisplay(
                            myBid?.note,
                        );
                        const vehicleLabel =
                            vehicleTag || getBusLabel(trip.busSize);

                        return (
                            <AwardedTripCard
                                key={trip.id}
                                layout="bidder"
                                trip={trip}
                                isRound={isRound}
                                distanceKm={km}
                                priceManwon={Number(myBid?.price ?? 0)}
                                vehicleLabel={vehicleLabel}
                                showStatusBadge={variant === 'reservation'}
                                interactive={
                                    variant === 'reservation' &&
                                    Boolean(onSelectTrip)
                                }
                                onPress={
                                    onSelectTrip
                                        ? () =>
                                              onSelectTrip({
                                                  trip,
                                                  partner,
                                              })
                                        : undefined
                                }
                            />
                        );
                    })}
                </div>
            ) : (
                <p className="py-8 text-center text-gray-500">{emptyMessage}</p>
            )}
        </>
    );
}
