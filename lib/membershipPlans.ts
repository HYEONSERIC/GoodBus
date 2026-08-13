import { CONCURRENT_BID_LIMITS } from './membershipLimits';
import { MEMBERSHIP_PRICES_WON } from './paymentPricing';

export type MembershipPlanCard = {
    id: string;
    name: string;
    price: string;
    features: string[];
};

/** 기사·회사 대시보드 공통 멤버십 안내 카드 데이터 */
export const BIDDER_MEMBERSHIP_PLANS: MembershipPlanCard[] = [
    {
        id: 'basic',
        name: '베이직',
        price: '무료',
        features: [
            `${CONCURRENT_BID_LIMITS.Basic}건의 예약주문에 동시 활성 입찰 가능 (낙찰·낙찰실패·취소 건 제외)`,
        ],
    },
    {
        id: 'plus',
        name: '플러스',
        price: `${MEMBERSHIP_PRICES_WON.Plus.toLocaleString()}원/월`,
        features: [
            `${CONCURRENT_BID_LIMITS.Plus}건의 예약주문에 동시 활성 입찰 가능 (낙찰·낙찰실패·취소 건 제외)`,
        ],
    },
    {
        id: 'premium',
        name: '프리미엄',
        price: `${MEMBERSHIP_PRICES_WON.Premium.toLocaleString()}원/월`,
        features: [
            `${CONCURRENT_BID_LIMITS.Premium}건의 예약주문에 동시 활성 입찰 가능 (낙찰·낙찰실패·취소 건 제외)`,
        ],
    },
    {
        id: 'business',
        name: '비즈니스',
        price: `${MEMBERSHIP_PRICES_WON.Business.toLocaleString()}원/월`,
        features: [
            `${CONCURRENT_BID_LIMITS.Business}건의 예약주문에 동시 활성 입찰 가능 (낙찰·낙찰실패·취소 건 제외)`,
        ],
    },
];

export const MEMBERSHIP_NAME_MAP: Record<string, string> = {
    Basic: '베이직',
    Plus: '플러스',
    Premium: '프리미엄',
    Business: '비즈니스',
};

export function getMembershipDisplayLabel(
    planName: string | undefined | null,
): string {
    if (!planName) return '베이직';
    return MEMBERSHIP_NAME_MAP[planName] || '베이직';
}
