'use client';

import { Button } from '@/components/ui/button';
import { TripRouteTypeColumn } from '@/components/trips/TripRouteTypeColumn';
import {
    biddingCompanionSubtitle,
    formatTripDateLine,
    getBusLabel,
    getServicePurposeLabel,
} from '@/lib/tripDisplay';
import type { OpenTripLike } from '@/types/trip';

export function OpenTripCard({
    trip,
    isRound,
    km,
    bidCount,
    onBid,
}: {
    trip: OpenTripLike;
    isRound: boolean;
    km?: number | null;
    bidCount: number;
    onBid: () => void;
}) {
    const servicePurpose = getServicePurposeLabel(trip.servicePurpose);
    const companion = biddingCompanionSubtitle(trip);

    return (
        <div className="border-b border-gray-100 p-4 last:border-b-0">
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
                <TripRouteTypeColumn isRound={isRound} km={km} />
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
                <div className="flex flex-wrap items-center gap-2">
                    {servicePurpose ? (
                        <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600">
                            {servicePurpose}
                        </span>
                    ) : null}
                    <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600">
                        {getBusLabel(trip.busSize)}
                    </span>
                    <span className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-500">
                        입찰 {bidCount}
                    </span>
                </div>

                <Button
                    type="button"
                    className="h-9 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black"
                    onClick={onBid}
                >
                    입찰하기
                </Button>
            </div>
        </div>
    );
}
