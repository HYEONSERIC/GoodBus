import { MembershipPlan } from '@prisma/client';

// 프론트 lib/membershipLimits.ts와 값 동기화 유지
export const CONCURRENT_BID_LIMITS: Record<MembershipPlan, number> = {
    Basic: 10,
    Plus: 15,
    Premium: 20,
    Business: 25,
};
