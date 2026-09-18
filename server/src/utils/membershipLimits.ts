import { MembershipPlan } from '@prisma/client';
import {
    CONCURRENT_BID_LIMITS as CONCURRENT_BID_LIMITS_CORE,
    TRIP_BID_CAP_BY_TIER as TRIP_BID_CAP_BY_TIER_CORE,
} from './membershipLimitsCore';

// 값은 membershipLimitsCore.ts(프론트 lib/membershipLimits.ts와 공용)에서 온다.
export const CONCURRENT_BID_LIMITS =
    CONCURRENT_BID_LIMITS_CORE as Record<MembershipPlan, number>;

export const TRIP_BID_CAP_BY_TIER =
    TRIP_BID_CAP_BY_TIER_CORE as Record<MembershipPlan, number>;
