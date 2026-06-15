'use client';

import { AwardedTripCard } from '@/components/trips/AwardedTripCard';
import type { TripReviewRecord } from '@/components/TripReviewSection';
import type { PassengerTrip } from '@/types/passenger';

export function PassengerBookingTripCard({
    trip,
    isRound,
    distanceKm,
    variant,
    existingReview,
    onCancelAward,
    onOpenChat,
    onReviewSubmitted,
    resolveImageUrl,
}: {
    trip: PassengerTrip;
    isRound: boolean;
    distanceKm?: number | null;
    variant: 'upcoming' | 'completed';
    existingReview?: TripReviewRecord;
    onCancelAward: () => void;
    onOpenChat: () => void;
    onReviewSubmitted: () => void;
    resolveImageUrl: (url?: string | null) => string | null;
}) {
    return (
        <AwardedTripCard
            layout="passenger"
            trip={trip}
            isRound={isRound}
            distanceKm={distanceKm}
            variant={variant}
            existingReview={existingReview}
            onCancelAward={onCancelAward}
            onOpenChat={onOpenChat}
            onReviewSubmitted={onReviewSubmitted}
            resolveImageUrl={resolveImageUrl}
        />
    );
}
