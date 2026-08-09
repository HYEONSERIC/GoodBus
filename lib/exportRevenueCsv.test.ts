import { describe, expect, it } from 'vitest';
import { buildRevenueAwardsCsv } from './exportRevenueCsv';
import type { AdminRevenueAwardRow } from '@/types/admin';

function award(overrides: Partial<AdminRevenueAwardRow> = {}): AdminRevenueAwardRow {
    return {
        bidId: 'bid-1',
        tripId: 'trip-1',
        origin: '서울',
        destination: '부산',
        route: '서울 → 부산',
        priceManWon: 50,
        awardedAt: '2026-01-15T00:00:00.000Z',
        countedAt: '2026-01-15T00:00:00.000Z',
        usedCreatedAtFallback: false,
        bidderEmail: 'driver@example.com',
        bidderDisplayName: '홍기사',
        bidderRole: 'Driver',
        ...overrides,
    };
}

describe('buildRevenueAwardsCsv', () => {
    it('UTF-8 BOM으로 시작한다 (엑셀 한글 깨짐 방지)', () => {
        const csv = buildRevenueAwardsCsv([award()]);
        expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('헤더와 데이터 행, 합계 행을 포함한다', () => {
        const csv = buildRevenueAwardsCsv([award({ priceManWon: 50 })]);
        expect(csv).toContain('금액(만원)');
        expect(csv).toContain('홍기사');
        expect(csv).toContain('[합계]');
        expect(csv).toContain('낙찰 건수');
    });

    it('낙찰일 대체(usedCreatedAtFallback) 건수를 합계에 반영한다', () => {
        const csv = buildRevenueAwardsCsv([
            award({ usedCreatedAtFallback: true }),
            award({ bidId: 'bid-2', usedCreatedAtFallback: false }),
        ]);
        expect(csv).toContain('낙찰일 대체 건수');
    });

    it('GMV와 추정 매출(기본 10%)을 합계에 반영한다', () => {
        const csv = buildRevenueAwardsCsv([
            award({ priceManWon: 100 }),
            award({ bidId: 'bid-2', priceManWon: 200 }),
        ]);
        // GMV 300만원, 기본 수수료 10% → 추정 매출 30만원
        expect(csv).toContain('300');
        expect(csv).toContain('30');
    });

    it('값에 쉼표/줄바꿈이 있으면 CSV 셀을 이스케이프한다', () => {
        const csv = buildRevenueAwardsCsv([
            award({ bidderDisplayName: '홍,기사' }),
        ]);
        expect(csv).toContain('"홍,기사"');
    });
});
