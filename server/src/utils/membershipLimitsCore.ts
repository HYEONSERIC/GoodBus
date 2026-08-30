/**
 * 프론트(lib)·서버 공통 값 — paymentPricingCore.ts와 동일한 사유로 단일 소스화.
 */
export const CONCURRENT_BID_LIMITS: Record<string, number> = {
    Basic: 10,
    Plus: 15,
    Premium: 20,
    Business: 25,
};
