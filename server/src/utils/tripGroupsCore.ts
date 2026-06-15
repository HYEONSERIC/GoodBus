/** 프론트(lib)·서버·관리자 공통 — 왕복 여정 묶음·집계 */

export type TripGroupingLike = {
    id: string;
    origin: string;
    destination: string;
    dateTime: Date | string;
    status?: string;
};

export type TripForGrouping = TripGroupingLike & {
    status: string;
};

export type RoundPartnerOptions = {
    /** true면 반대편 여정도 같은 status일 때만 짝 (기사 주문 탭) */
    matchStatus?: boolean;
};

export function getRoundPartnerTrip<T extends TripGroupingLike>(
    baseTrip: T,
    list: T[],
    options?: RoundPartnerOptions,
): T | undefined {
    const reverseTrips = list.filter((other) => {
        if (other.id === baseTrip.id) return false;
        if (
            options?.matchStatus &&
            baseTrip.status != null &&
            other.status !== baseTrip.status
        ) {
            return false;
        }
        return (
            other.origin === baseTrip.destination &&
            other.destination === baseTrip.origin
        );
    });
    if (reverseTrips.length === 0) return undefined;
    const baseTime = new Date(baseTrip.dateTime).getTime();
    return reverseTrips.sort((a, b) => {
        const aDiff = Math.abs(new Date(a.dateTime).getTime() - baseTime);
        const bDiff = Math.abs(new Date(b.dateTime).getTime() - baseTime);
        return aDiff - bDiff;
    })[0];
}

/** 왕복 여정 카드: 출발이 빠른 편만 대표 카드로 표시 */
export function groupTripCardsForDisplay<T extends TripGroupingLike>(
    list: T[],
    partnerPool?: T[],
    options?: RoundPartnerOptions,
): T[] {
    const pool = partnerPool ?? list;
    const sorted = [...list].sort(
        (a, b) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
    );
    const consumed = new Set<string>();
    return sorted.filter((trip) => {
        if (consumed.has(trip.id)) return false;
        const partner = getRoundPartnerTrip(trip, pool, options);
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

/** 관리자·서버: status 일치 왕복만 묶음 */
export function groupTripsForDisplay<T extends TripForGrouping>(
    trips: T[],
): T[] {
    return groupTripCardsForDisplay(trips, trips, { matchStatus: true });
}

function isFutureTrip(trip: TripForGrouping, now: number) {
    return new Date(trip.dateTime).getTime() >= now;
}

/** 승객 견적·예약 탭과 동일 규칙으로 여정 건수 집계 */
export function summarizePassengerTrips(trips: TripForGrouping[]) {
    const now = Date.now();
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
    const reservationUpcoming = groupTripsForDisplay(awardedUpcoming).length;
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
