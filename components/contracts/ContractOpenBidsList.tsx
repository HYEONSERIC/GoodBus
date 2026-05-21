'use client';

import { MyOpenBidTripCard } from '@/components/contracts/MyOpenBidTripCard';
import {
    biddingTripKm,
    formatBidAgeLabel,
    getBusLabel,
    parseBidNoteForDisplay,
} from '@/lib/tripDisplay';
import {
    getRoundPartnerTrip,
    type RoundPartnerOptions,
} from '@/lib/tripGroups';
import type { DashboardBidderTrip } from '@/types/dashboard';

export type ContractOpenBidTrip = DashboardBidderTrip;

export function ContractOpenBidsList<T extends ContractOpenBidTrip>({
    cardTrips,
    partnerPool,
    roundOptions,
    distanceByTripId = {},
    userId,
    onOpenDetail,
    onWithdraw,
    emptyMessage = '입찰 진행 중인 여정이 없습니다',
}: {
    cardTrips: T[];
    partnerPool: T[];
    roundOptions?: RoundPartnerOptions;
    distanceByTripId?: Record<string, number | null>;
    userId?: string;
    onOpenDetail: (trip: T, partner?: T) => void;
    onWithdraw: (trip: T) => void;
    emptyMessage?: string;
}) {
    return (
        <>
            <p className="mb-2 text-left text-xs font-medium text-gray-600">
                입찰진행중 ({cardTrips.length})
            </p>
            {cardTrips.length > 0 ? (
                <div className="space-y-3">
                    {cardTrips.map((trip) => {
                        const myBid = trip.bids.find(
                            (bid) =>
                                bid.bidder.id === userId &&
                                bid.status === 'open',
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
                        const bidAge = formatBidAgeLabel(myBid?.createdAt);

                        return (
                            <MyOpenBidTripCard
                                key={trip.id}
                                trip={trip}
                                isRound={isRound}
                                km={km}
                                priceManwon={Number(myBid?.price ?? 0)}
                                vehicleLabel={vehicleLabel}
                                bidAge={bidAge}
                                onClick={() => onOpenDetail(trip, partner)}
                                onWithdraw={() => onWithdraw(trip)}
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
