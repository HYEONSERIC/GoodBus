// 백엔드 server/src/utils/paymentPricing.ts와 동기화 유지

// 임시 테스트 가격 — 실 가격은 나중에 정해서 교체할 것.
// 토스페이먼츠 카드결제 최소금액(100원) 제약으로 100원 단위 사용.
export const MEMBERSHIP_PRICES_WON: Record<string, number> = {
    Basic: 0,
    Plus: 100,
    Premium: 200,
    Business: 300,
};

export const MIN_BID_ADDON_PRICE_WON = 400;
