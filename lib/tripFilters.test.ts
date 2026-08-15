import { describe, expect, it } from 'vitest';
import { filterTripsByCriteria, type TripFilterable } from './tripFilters';

function trip(overrides: Partial<TripFilterable> = {}): TripFilterable {
    return {
        origin: '서울',
        dateTime: '2026-03-10T09:00:00.000Z',
        paxCount: 20,
        ...overrides,
    };
}

const baseCriteria = {
    selectedRegions: [] as string[],
    selectedDate: '',
    minPax: '',
    maxPax: '',
};

describe('filterTripsByCriteria', () => {
    it('조건이 없으면 전체를 반환한다', () => {
        const trips = [trip(), trip({ origin: '부산' })];
        expect(filterTripsByCriteria(trips, baseCriteria)).toHaveLength(2);
    });

    it('선택한 지역 중 하나라도 출발지에 포함되면 통과한다', () => {
        const trips = [trip({ origin: '경기북부' }), trip({ origin: '부산' })];
        const result = filterTripsByCriteria(trips, {
            ...baseCriteria,
            selectedRegions: ['경기'],
        });
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('경기북부');
    });

    it('선택한 날짜(로컬 기준, KST)와 일치하는 여정만 남긴다', () => {
        const trips = [
            // KST(UTC+9) 기준 2026-03-10 13:00
            trip({ dateTime: '2026-03-10T04:00:00.000Z' }),
            // KST 기준 2026-03-11 05:00 — 하루 넘어감
            trip({ dateTime: '2026-03-10T20:00:00.000Z' }),
        ];
        const result = filterTripsByCriteria(trips, {
            ...baseCriteria,
            selectedDate: '2026-03-10',
        });
        expect(result).toHaveLength(1);
    });

    it('minPax/maxPax 범위를 벗어나면 제외한다', () => {
        const trips = [
            trip({ paxCount: 10 }),
            trip({ paxCount: 25 }),
            trip({ paxCount: 45 }),
        ];
        const result = filterTripsByCriteria(trips, {
            ...baseCriteria,
            minPax: '15',
            maxPax: '40',
        });
        expect(result.map((t) => t.paxCount)).toEqual([25]);
    });

    it('여러 조건을 동시에 적용한다', () => {
        const trips = [
            trip({ origin: '서울', paxCount: 20, dateTime: '2026-03-10T09:00:00.000Z' }),
            trip({ origin: '서울', paxCount: 50, dateTime: '2026-03-10T09:00:00.000Z' }),
            trip({ origin: '부산', paxCount: 20, dateTime: '2026-03-10T09:00:00.000Z' }),
        ];
        const result = filterTripsByCriteria(trips, {
            selectedRegions: ['서울'],
            selectedDate: '2026-03-10',
            minPax: '10',
            maxPax: '30',
        });
        expect(result).toHaveLength(1);
        expect(result[0].origin).toBe('서울');
        expect(result[0].paxCount).toBe(20);
    });
});
