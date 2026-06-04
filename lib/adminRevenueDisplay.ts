/** DB bid.price · 관리자 GMV 집계 공통 단위 */
export const AMOUNT_UNIT_MANWON = '만원';

/** 테이블 헤더 등: 「금액(만원)」 형식 */
export function amountColumnHeader(label: string) {
    return `${label}(${AMOUNT_UNIT_MANWON})`;
}

export const ADMIN_AMOUNT_HEADERS = {
    amount: amountColumnHeader('금액'),
    price: amountColumnHeader('가격'),
    gmv: amountColumnHeader('거래액'),
    estimatedRevenue: amountColumnHeader('추정 매출'),
    gmvGmv: '거래액 GMV(만원)',
} as const;

/** 금액 숫자 + 단위 (예: 603만원) */
export function formatManWon(amount: number) {
    return `${amount.toLocaleString('ko-KR')}${AMOUNT_UNIT_MANWON}`;
}

export function formatManWonOrDash(amount: number | null | undefined) {
    if (amount == null || Number.isNaN(Number(amount))) return '—';
    return formatManWon(Number(amount));
}

export function yearMonthValue(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

export function currentYearMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function buildYearOptions(count = 6) {
    const { year } = currentYearMonth();
    return Array.from({ length: count }, (_, i) => year - i);
}

export function buildMonthOptions() {
    return Array.from({ length: 12 }, (_, i) => i + 1);
}
