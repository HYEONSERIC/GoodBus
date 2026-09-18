/**
 * 프론트(lib)·서버 공통 값 — paymentPricingCore.ts와 동일한 사유로 단일 소스화.
 *
 * CONCURRENT_BID_LIMITS: 내가 동시에 열어둘 수 있는 내 활성 입찰(status='open')
 * 건수 한도. 2026-09-18 실 가격 개편에서 숫자만 상향(로직은 기존 그대로).
 *
 * TRIP_BID_CAP_BY_TIER: 여정 1건에 이미 걸린 입찰 건수가 내 등급의 이 값
 * 이상이면 그 여정엔 더 이상 입찰할 수 없다("멤버십 전용"/"비즈니스 전용"
 * 배지의 근거). 승객이 지정하는 게 아니라 시스템이 현재 입찰 건수로 자동
 * 판정한다 — server/src/routes/bids.ts POST / 에서 강제.
 */
export const CONCURRENT_BID_LIMITS: Record<string, number> = {
    Basic: 20,
    Plus: 40,
    Premium: 60,
    Business: 80,
};

export const TRIP_BID_CAP_BY_TIER: Record<string, number> = {
    Basic: 10,
    Plus: 15,
    Premium: 20,
    Business: 25,
};
