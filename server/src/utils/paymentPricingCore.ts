/**
 * 프론트(lib)·서버 공통 값 — tripGroupsCore.ts와 같은 패턴으로, @prisma/client에
 * 의존하지 않는 순수 리터럴만 담아 양쪽에서 그대로 재-export한다. 이전엔
 * lib/paymentPricing.ts와 이 파일의 서버측 대응 파일이 값을 각각 복제해두고
 * 주석으로만 "동기화 유지"를 안내했는데, 실 가격 전환 시 한쪽만 고치면 프론트
 * 표시가와 실제 과금액이 어긋날 수 있어 단일 소스로 합쳤다.
 *
 * 임시 테스트 가격 — 실 가격은 나중에 정해서 교체할 것.
 * 토스페이먼츠 카드결제 최소금액(100원) 제약으로 100원 단위 사용.
 */
export const MEMBERSHIP_PRICES_WON: Record<string, number> = {
    Basic: 0,
    Plus: 100,
    Premium: 200,
    Business: 300,
};

export const MIN_BID_ADDON_PRICE_WON = 400;
