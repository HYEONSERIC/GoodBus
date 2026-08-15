import { describe, expect, it } from 'vitest';
import {
    monthRangeBounds,
    parseYearMonth,
    singleMonthBounds,
} from './adminRevenue';

describe('parseYearMonth', () => {
    it('YYYY-MM 형식을 연/월로 파싱한다', () => {
        expect(parseYearMonth('2026-03')).toEqual({ year: 2026, month: 3 });
    });

    it('형식이 다르면 null을 반환한다', () => {
        expect(parseYearMonth('2026/03')).toBeNull();
        expect(parseYearMonth('2026-3')).toBeNull();
        expect(parseYearMonth(20260301)).toBeNull();
        expect(parseYearMonth(undefined)).toBeNull();
    });

    it('월이 1~12 범위를 벗어나면 null을 반환한다', () => {
        expect(parseYearMonth('2026-00')).toBeNull();
        expect(parseYearMonth('2026-13')).toBeNull();
    });
});

describe('monthRangeBounds', () => {
    it('시작월 1일 00:00부터 종료월 말일 23:59:59.999까지 범위를 만든다', () => {
        const { start, end } = monthRangeBounds(2026, 1, 2026, 2);

        expect(start.getFullYear()).toBe(2026);
        expect(start.getMonth()).toBe(0); // 1월
        expect(start.getDate()).toBe(1);
        expect(start.getHours()).toBe(0);

        expect(end.getFullYear()).toBe(2026);
        expect(end.getMonth()).toBe(1); // 2월
        expect(end.getDate()).toBe(28); // 2026년은 평년
        expect(end.getHours()).toBe(23);
        expect(end.getMinutes()).toBe(59);
    });

    it('같은 달이면 start/end가 같은 달 안에 있다', () => {
        const { start, end } = monthRangeBounds(2026, 6, 2026, 6);
        expect(start.getMonth()).toBe(5);
        expect(end.getMonth()).toBe(5);
        expect(end.getDate()).toBe(30);
    });
});

describe('singleMonthBounds', () => {
    it('윤년 2월도 말일을 정확히 계산한다', () => {
        const { end } = singleMonthBounds(2028, 2);
        expect(end.getDate()).toBe(29);
    });

    it('12월이면 다음 해로 넘어가지 않고 그 해 말일까지다', () => {
        const { start, end } = singleMonthBounds(2026, 12);
        expect(start.getFullYear()).toBe(2026);
        expect(end.getFullYear()).toBe(2026);
        expect(end.getDate()).toBe(31);
    });
});
