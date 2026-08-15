import { describe, expect, it } from 'vitest';
import {
    amountColumnHeader,
    buildMonthOptions,
    buildYearOptions,
    formatManWon,
    formatManWonOrDash,
    yearMonthValue,
} from './adminRevenueDisplay';

describe('amountColumnHeader', () => {
    it('라벨 뒤에 (만원) 단위를 붙인다', () => {
        expect(amountColumnHeader('금액')).toBe('금액(만원)');
    });
});

describe('formatManWon', () => {
    it('천 단위 구분자와 만원 단위를 붙인다', () => {
        expect(formatManWon(1234567)).toBe('1,234,567만원');
    });

    it('0도 정상적으로 표기한다', () => {
        expect(formatManWon(0)).toBe('0만원');
    });
});

describe('formatManWonOrDash', () => {
    it('null/undefined/NaN이면 대시를 반환한다', () => {
        expect(formatManWonOrDash(null)).toBe('—');
        expect(formatManWonOrDash(undefined)).toBe('—');
        expect(formatManWonOrDash(Number('not-a-number'))).toBe('—');
    });

    it('값이 있으면 만원 단위로 표기한다', () => {
        expect(formatManWonOrDash(500)).toBe('500만원');
    });
});

describe('yearMonthValue', () => {
    it('월을 2자리로 0-padding한다', () => {
        expect(yearMonthValue(2026, 3)).toBe('2026-03');
        expect(yearMonthValue(2026, 11)).toBe('2026-11');
    });
});

describe('buildYearOptions / buildMonthOptions', () => {
    it('연도 옵션은 올해부터 과거 count개를 내림차순으로 만든다', () => {
        const options = buildYearOptions(3);
        expect(options).toHaveLength(3);
        expect(options[1]).toBe(options[0] - 1);
        expect(options[2]).toBe(options[0] - 2);
    });

    it('월 옵션은 1~12를 그대로 반환한다', () => {
        expect(buildMonthOptions()).toEqual([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
        ]);
    });
});
