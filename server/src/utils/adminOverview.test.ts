import { describe, expect, it } from 'vitest';
import { summarizeAwardsInRange } from './adminOverview';

type Bid = {
    price: unknown;
    trip: { awardedAt: Date | null; createdAt: Date };
};

function bid(price: number, awardedAt: Date | null, createdAt: Date): Bid {
    return { price, trip: { awardedAt, createdAt } };
}

describe('summarizeAwardsInRange', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.999Z');

    it('범위 안의 낙찰만 건수·GMV에 포함한다', () => {
        const bids: Bid[] = [
            bid(100, new Date('2026-01-15T00:00:00.000Z'), new Date('2026-01-10T00:00:00.000Z')),
            bid(200, new Date('2025-12-31T00:00:00.000Z'), new Date('2025-12-30T00:00:00.000Z')),
        ];

        const summary = summarizeAwardsInRange(bids, start, end);
        expect(summary.awardCount).toBe(1);
        expect(summary.gmvManWon).toBe(100);
    });

    it('awardedAt이 없으면 createdAt을 기준으로 판단한다 (fallback)', () => {
        const bids: Bid[] = [
            bid(150, null, new Date('2026-01-05T00:00:00.000Z')),
        ];

        const summary = summarizeAwardsInRange(bids, start, end);
        expect(summary.awardCount).toBe(1);
        expect(summary.gmvManWon).toBe(150);
    });

    it('빈 배열이면 0을 반환한다', () => {
        expect(summarizeAwardsInRange([], start, end)).toEqual({
            awardCount: 0,
            gmvManWon: 0,
        });
    });

    it('여러 건이면 GMV를 합산한다', () => {
        const bids: Bid[] = [
            bid(100, new Date('2026-01-05T00:00:00.000Z'), new Date('2026-01-01T00:00:00.000Z')),
            bid(50, new Date('2026-01-20T00:00:00.000Z'), new Date('2026-01-01T00:00:00.000Z')),
        ];

        const summary = summarizeAwardsInRange(bids, start, end);
        expect(summary.awardCount).toBe(2);
        expect(summary.gmvManWon).toBe(150);
    });
});
