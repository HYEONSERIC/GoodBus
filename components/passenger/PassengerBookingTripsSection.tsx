'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PassengerBookingTabPanel } from '@/components/passenger/PassengerBookingTabPanel';
import { PassengerBookingTripCard } from '@/components/passenger/PassengerBookingTripCard';
import {
    getRoundPartnerTrip,
    type RoundPartnerOptions,
} from '@/lib/tripGroups';
import type { TripReviewRecord } from '@/components/TripReviewSection';
import type { PassengerBid, PassengerTrip } from '@/types/passenger';

export function PassengerBookingTripsSection({
    activeSubTab,
    onSubTabChange,
    reservationTrips,
    completedTrips,
    allTrips,
    distanceByTripId,
    roundOptions,
    tripReviewsByTripId,
    onCancelAward,
    onOpenChat,
    onReviewSubmitted,
    resolveMediaUrl,
}: {
    activeSubTab: 'reservation' | 'completed';
    onSubTabChange: (tab: 'reservation' | 'completed') => void;
    reservationTrips: PassengerTrip[];
    completedTrips: PassengerTrip[];
    allTrips: PassengerTrip[];
    distanceByTripId: Record<string, number | null>;
    roundOptions?: RoundPartnerOptions;
    tripReviewsByTripId: Record<string, TripReviewRecord | undefined>;
    onCancelAward: (trip: PassengerTrip) => void;
    onOpenChat: (trip: PassengerTrip, bid: PassengerBid) => void;
    onReviewSubmitted: () => void;
    resolveMediaUrl: (url?: string | null) => string | null;
}) {
    return (
        <PassengerBookingTabPanel
            activeSubTab={activeSubTab}
            onSubTabChange={onSubTabChange}
        >
            {activeSubTab === 'reservation' && (
                <>
                    <p className="mb-2 text-left text-sm text-gray-500">
                        낙찰완료 ({reservationTrips.length})
                    </p>
                    <div className="grid gap-4">
                        {reservationTrips.length === 0 ? (
                            <Card className="rounded-none">
                                <CardContent className="p-6 text-sm text-gray-600">
                                    예정된 낙찰 여정이 없습니다. 출발일이 지난
                                    여정은 &apos;운행완료&apos; 탭에서 확인할 수
                                    있어요.
                                </CardContent>
                            </Card>
                        ) : (
                            reservationTrips.map((trip) => {
                                const awardedBid = trip.bids.find(
                                    (b) => b.status === 'awarded',
                                );
                                return (
                                    <PassengerBookingTripCard
                                        key={trip.id}
                                        trip={trip}
                                        isRound={Boolean(
                                            getRoundPartnerTrip(
                                                trip,
                                                allTrips,
                                                roundOptions,
                                            ),
                                        )}
                                        distanceKm={
                                            distanceByTripId[trip.id]
                                        }
                                        variant="upcoming"
                                        existingReview={
                                            tripReviewsByTripId[trip.id]
                                        }
                                        onCancelAward={() =>
                                            onCancelAward(trip)
                                        }
                                        onOpenChat={() => {
                                            if (awardedBid) {
                                                onOpenChat(trip, awardedBid);
                                            }
                                        }}
                                        onReviewSubmitted={
                                            onReviewSubmitted
                                        }
                                        resolveImageUrl={resolveMediaUrl}
                                    />
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {activeSubTab === 'completed' && (
                <>
                    <p className="mb-2 text-left text-sm text-gray-500">
                        종료됨 ({completedTrips.length})
                    </p>
                    <div className="grid gap-4">
                        {completedTrips.length === 0 ? (
                            <Card className="rounded-none">
                                <CardContent className="p-6 text-sm text-gray-600">
                                    아직 종료된 낙찰 여정이 없습니다.
                                </CardContent>
                            </Card>
                        ) : (
                            completedTrips.map((trip) => (
                                <PassengerBookingTripCard
                                    key={trip.id}
                                    trip={trip}
                                    isRound={Boolean(
                                        getRoundPartnerTrip(
                                            trip,
                                            allTrips,
                                            roundOptions,
                                        ),
                                    )}
                                    distanceKm={distanceByTripId[trip.id]}
                                    variant="completed"
                                    existingReview={
                                        tripReviewsByTripId[trip.id]
                                    }
                                    onCancelAward={() => onCancelAward(trip)}
                                    onOpenChat={() => {
                                        const awardedBid = trip.bids.find(
                                            (b) => b.status === 'awarded',
                                        );
                                        if (awardedBid) {
                                            onOpenChat(trip, awardedBid);
                                        }
                                    }}
                                    onReviewSubmitted={onReviewSubmitted}
                                    resolveImageUrl={resolveMediaUrl}
                                />
                            ))
                        )}
                    </div>
                </>
            )}
        </PassengerBookingTabPanel>
    );
}
