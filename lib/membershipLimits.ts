// 백엔드 server/src/utils/membershipLimits.ts와 값 동기화 유지
export const CONCURRENT_BID_LIMITS: Record<string, number> = {
    Basic: 10,
    Plus: 15,
    Premium: 20,
    Business: 25,
};
