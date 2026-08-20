import type { AdminRevenueAwardRow } from '@/types/admin';
import { DEFAULT_PLATFORM_COMMISSION_RATE as DEFAULT_COMMISSION_RATE } from '../server/src/utils/platformCommissionCore';

export type RevenueCsvExportOptions = {
    /** 예: 2026-01 ~ 2026-06 */
    periodLabel?: string;
    commissionRate?: number;
};

function escapeCsvCell(value: string | number) {
    const s = String(value);
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function formatCountedAt(iso: string) {
    return new Date(iso).toLocaleString('ko-KR');
}

function buildSummaryRows(
    awards: AdminRevenueAwardRow[],
    options?: RevenueCsvExportOptions,
) {
    const rate = options?.commissionRate ?? DEFAULT_COMMISSION_RATE;
    const pct = Math.round(rate * 1000) / 10;
    const awardCount = awards.length;
    const gmvManWon = awards.reduce((sum, a) => sum + a.priceManWon, 0);
    const estimatedRevenueManWon = gmvManWon * rate;
    const fallbackCount = awards.filter((a) => a.usedCreatedAtFallback).length;

    const empty = ['', '', '', '', '', '', '', '', '', ''];
    const metric = (label: string, value: string | number) => [
        label,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        value,
    ];

    const rows: (string | number)[][] = [empty, metric('[합계]', '')];
    if (options?.periodLabel) {
        rows.push(metric('조회 기간', options.periodLabel));
    }
    rows.push(
        metric('낙찰 건수', awardCount),
        metric('거래액 GMV(만원)', gmvManWon),
        metric(`추정 매출(${pct}%, 만원)`, estimatedRevenueManWon),
    );
    if (fallbackCount > 0) {
        rows.push(metric('낙찰일 대체 건수', fallbackCount));
    }
    return rows;
}

/** 순수 CSV 문자열 생성 — DOM 없이 테스트 가능하도록 다운로드 로직과 분리 */
export function buildRevenueAwardsCsv(
    awards: AdminRevenueAwardRow[],
    options?: RevenueCsvExportOptions,
): string {
    const headers = [
        '집계시각',
        '낙찰시각',
        '낙찰일대체',
        '여정ID',
        '출발지',
        '도착지',
        '입찰자',
        '이메일',
        '역할',
        '금액(만원)',
    ];

    const rows = awards.map((a) => [
        formatCountedAt(a.countedAt),
        a.awardedAt ? formatCountedAt(a.awardedAt) : '',
        a.usedCreatedAtFallback ? 'Y' : 'N',
        a.tripId,
        a.origin,
        a.destination,
        a.bidderDisplayName,
        a.bidderEmail ?? '',
        a.bidderRole,
        a.priceManWon,
    ]);

    const summaryRows = buildSummaryRows(awards, options);

    const bom = '\uFEFF';
    return (
        bom +
        [headers, ...rows, ...summaryRows]
            .map((line) => line.map(escapeCsvCell).join(','))
            .join('\n')
    );
}

export function downloadRevenueAwardsCsv(
    awards: AdminRevenueAwardRow[],
    filename: string,
    options?: RevenueCsvExportOptions,
) {
    const csv = buildRevenueAwardsCsv(awards, options);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
