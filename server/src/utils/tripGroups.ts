/** 승객 UI와 동일: 왕복(편도 2건)은 카드 1건으로 묶어 집계합니다. */

export type TripForGrouping = {
    id: string;
    origin: string;
    destination: string;
    dateTime: Date | string;
    status: string;
};

export function getRoundPartnerTrip<T extends TripForGrouping>(
    trip: T,
    sourceTrips: T[],
): T | undefined {
    const reverseTrips = sourceTrips.filter(
        (other) =>
            other.id !== trip.id &&
            other.status === trip.status &&
            other.origin === trip.destination &&
            other.destination === trip.origin,
    );
    if (reverseTrips.length === 0) return undefined;
    const baseTime = new Date(trip.dateTime).getTime();
    return reverseTrips.sort((a, b) => {
        const aDiff = Math.abs(new Date(a.dateTime).getTime() - baseTime);
        const bDiff = Math.abs(new Date(b.dateTime).getTime() - baseTime);
        return aDiff - bDiff;
    })[0];
}

export function groupTripsForDisplay<T extends TripForGrouping>(
    trips: T[],
): T[] {
    const sorted = [...trips].sort(
        (a, b) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
    );
    const consumed = new Set<string>();
    return sorted.filter((trip) => {
        if (consumed.has(trip.id)) return false;
        const partner = getRoundPartnerTrip(trip, sorted);
        if (partner) {
            const base =
                new Date(trip.dateTime).getTime() <=
                new Date(partner.dateTime).getTime()
                    ? trip
                    : partner;
            consumed.add(trip.id);
            consumed.add(partner.id);
            return trip.id === base.id;
        }
        consumed.add(trip.id);
        return true;
    });
}

function isFutureTrip(trip: TripForGrouping, now: number) {
    return new Date(trip.dateTime).getTime() >= now;
}

export function summarizePassengerTrips(trips: TripForGrouping[]) {
    const now = Date.now();
    // 승객 견적 탭과 동일: 출발일이 지난 open 여정은 집계·목록에서 제외
    const open = trips.filter(
        (t) => t.status === 'open' && isFutureTrip(t, now),
    );
    const openExpired = trips.filter(
        (t) => t.status === 'open' && !isFutureTrip(t, now),
    );
    const awarded = trips.filter((t) => t.status === 'awarded');
    const awardedUpcoming = awarded.filter(
        (t) => new Date(t.dateTime).getTime() >= now,
    );
    const awardedCompleted = awarded.filter(
        (t) => new Date(t.dateTime).getTime() < now,
    );

    const quoteOpen = groupTripsForDisplay(open).length;
    const reservationUpcoming =
        groupTripsForDisplay(awardedUpcoming).length;
    const completed = groupTripsForDisplay(awardedCompleted).length;

    const quoteExpired = groupTripsForDisplay(openExpired).length;

    return {
        quoteOpen,
        quoteExpired,
        reservationUpcoming,
        completed,
        totalGrouped: quoteOpen + reservationUpcoming + completed,
        totalRaw: trips.length,
    };
}
