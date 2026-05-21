/** 주문 탭 출발지역 필터 (기사·버스회사 공통) */
export const TRIP_ORIGIN_REGIONS = [
    '서울',
    '경기북부',
    '경기남부',
    '인천',
    '강원',
    '대전',
    '세종',
    '충북',
    '충남',
    '광주',
    '전북',
    '전남',
    '부산',
    '대구',
    '울산',
    '경북',
    '경남',
    '제주',
] as const;

export type TripListFilterCriteria = {
    selectedRegions: string[];
    selectedDate: string;
    minPax: string;
    maxPax: string;
};

export type TripFilterable = {
    origin: string;
    dateTime: string;
    paxCount: number;
};

export function filterTripsByCriteria<T extends TripFilterable>(
    list: T[],
    criteria: TripListFilterCriteria,
): T[] {
    const { selectedRegions, selectedDate, minPax, maxPax } = criteria;
    return list.filter((trip) => {
        if (
            selectedRegions.length > 0 &&
            !selectedRegions.some((region) => trip.origin.includes(region))
        ) {
            return false;
        }
        if (selectedDate) {
            const tripDate = new Date(trip.dateTime).toISOString().slice(0, 10);
            if (tripDate !== selectedDate) {
                return false;
            }
        }
        if (minPax && trip.paxCount < Number(minPax)) {
            return false;
        }
        if (maxPax && trip.paxCount > Number(maxPax)) {
            return false;
        }
        return true;
    });
}
