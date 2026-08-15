import { describe, expect, it } from 'vitest';
import {
    getRoundPartnerTrip,
    groupTripsForDisplay,
    summarizePassengerTrips,
    type TripForGrouping,
} from './tripGroupsCore';

function trip(
    overrides: Partial<TripForGrouping> & { id: string },
): TripForGrouping {
    return {
        origin: '서울',
        destination: '부산',
        dateTime: '2026-01-10T09:00:00.000Z',
        status: 'open',
        ...overrides,
    };
}

describe('getRoundPartnerTrip', () => {
    it('왕복 짝을 찾아 반환한다 (출발/도착이 반대인 여정)', () => {
        const outbound = trip({ id: '1', origin: '서울', destination: '부산' });
        const inbound = trip({
            id: '2',
            origin: '부산',
            destination: '서울',
            dateTime: '2026-01-12T09:00:00.000Z',
        });

        const partner = getRoundPartnerTrip(outbound, [outbound, inbound]);
        expect(partner?.id).toBe('2');
    });

    it('출발/도착이 반대가 아니면 짝을 찾지 못한다', () => {
        const a = trip({ id: '1', origin: '서울', destination: '부산' });
        const b = trip({ id: '2', origin: '서울', destination: '대구' });

        expect(getRoundPartnerTrip(a, [a, b])).toBeUndefined();
    });

    it('matchStatus가 true면 status가 다른 여정은 짝에서 제외한다', () => {
        const open = trip({ id: '1', origin: '서울', destination: '부산', status: 'open' });
        const awarded = trip({
            id: '2',
            origin: '부산',
            destination: '서울',
            status: 'awarded',
        });

        expect(
            getRoundPartnerTrip(open, [open, awarded], { matchStatus: true }),
        ).toBeUndefined();
        // matchStatus가 false(기본값)면 status와 무관하게 짝을 찾는다
        expect(
            getRoundPartnerTrip(open, [open, awarded], { matchStatus: false }),
        )?.toMatchObject({ id: '2' });
    });

    it('짝이 여러 개면 시간상 가장 가까운 여정을 고른다', () => {
        const base = trip({
            id: '1',
            origin: '서울',
            destination: '부산',
            dateTime: '2026-01-10T09:00:00.000Z',
        });
        const near = trip({
            id: 'near',
            origin: '부산',
            destination: '서울',
            dateTime: '2026-01-11T09:00:00.000Z',
        });
        const far = trip({
            id: 'far',
            origin: '부산',
            destination: '서울',
            dateTime: '2026-02-01T09:00:00.000Z',
        });

        const partner = getRoundPartnerTrip(base, [base, far, near]);
        expect(partner?.id).toBe('near');
    });
});

describe('groupTripsForDisplay', () => {
    it('왕복 짝은 출발이 빠른 편만 대표로 남긴다', () => {
        const outbound = trip({
            id: 'go',
            origin: '서울',
            destination: '부산',
            dateTime: '2026-01-10T09:00:00.000Z',
        });
        const inbound = trip({
            id: 'back',
            origin: '부산',
            destination: '서울',
            dateTime: '2026-01-12T09:00:00.000Z',
        });

        const result = groupTripsForDisplay([outbound, inbound]);
        expect(result.map((t) => t.id)).toEqual(['go']);
    });

    it('짝이 없는 편도 여정은 그대로 유지된다', () => {
        const single = trip({ id: 'single' });
        expect(groupTripsForDisplay([single]).map((t) => t.id)).toEqual([
            'single',
        ]);
    });
});

describe('summarizePassengerTrips', () => {
    it('open/awarded 상태와 시점에 따라 카운트를 올바르게 나눈다', () => {
        const now = Date.now();
        const future = new Date(now + 1000 * 60 * 60 * 24).toISOString();
        const past = new Date(now - 1000 * 60 * 60 * 24).toISOString();

        const trips: TripForGrouping[] = [
            trip({ id: 'open-future', status: 'open', dateTime: future }),
            trip({ id: 'open-past', status: 'open', dateTime: past }),
            trip({ id: 'awarded-future', status: 'awarded', dateTime: future }),
            trip({ id: 'awarded-past', status: 'awarded', dateTime: past }),
        ];

        const summary = summarizePassengerTrips(trips);

        expect(summary.quoteOpen).toBe(1);
        expect(summary.quoteExpired).toBe(1);
        expect(summary.reservationUpcoming).toBe(1);
        expect(summary.completed).toBe(1);
        expect(summary.totalRaw).toBe(4);
    });

    it('빈 배열이면 모든 값이 0이다', () => {
        const summary = summarizePassengerTrips([]);
        expect(summary).toEqual({
            quoteOpen: 0,
            quoteExpired: 0,
            reservationUpcoming: 0,
            completed: 0,
            totalGrouped: 0,
            totalRaw: 0,
        });
    });
});
