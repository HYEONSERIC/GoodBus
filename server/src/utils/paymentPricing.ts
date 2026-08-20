import { MembershipPlan } from '@prisma/client';
import {
    MEMBERSHIP_PRICES_WON as MEMBERSHIP_PRICES_WON_CORE,
    MIN_BID_ADDON_PRICE_WON,
} from './paymentPricingCore';

// 값 자체는 paymentPricingCore.ts(프론트 lib/paymentPricing.ts와 공용)에서 온다.
// 여기서는 서버 코드가 MembershipPlan enum으로 안전하게 인덱싱할 수 있도록
// 타입만 좁혀서 다시 내보낸다.
export const MEMBERSHIP_PRICES_WON =
    MEMBERSHIP_PRICES_WON_CORE as Record<MembershipPlan, number>;

export { MIN_BID_ADDON_PRICE_WON };
