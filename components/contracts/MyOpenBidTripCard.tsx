'use client';

import { Button } from '@/components/ui/button';
import { TripRouteTypeColumn } from '@/components/trips/TripRouteTypeColumn';
import {
    biddingCompanionSubtitle,
    formatTripDateLine,
} from '@/lib/tripDisplay';
import type { OpenTripLike } from '@/types/trip';

export function MyOpenBidTripCard({
    trip,
    isRound,
    km,
    priceManwon,
    vehicleLabel,
    bidAge,
    onClick,
    onWithdraw,
}: {
    trip: OpenTripLike;
    isRound: boolean;
    km?: number | null;
    priceManwon: number;
    vehicleLabel: string;
    bidAge?: string | null;
    onClick: () => void;
    onWithdraw: () => void;
}) {
    const companion = biddingCompanionSubtitle(trip);

    return (
        <div
            role="button"
            tabIndex={0}
            className="cursor-pointer border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50/80 active:bg-gray-50"
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
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
                <span className="shrink-0 text-sm font-medium text-gray-900">
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
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                        {priceManwon.toLocaleString()}만원
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                        {vehicleLabel}
                    </span>
                    {bidAge ? (
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            {bidAge}
                        </span>
                    ) : null}
                </div>
                <Button
                    type="button"
                    className="shrink-0 rounded-md border-0 bg-amber-300 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-amber-400"
                    onClick={(e) => {
                        e.stopPropagation();
                        onWithdraw();
                    }}
                >
                    입찰취소하기
                </Button>
            </div>
        </div>
    );
}
