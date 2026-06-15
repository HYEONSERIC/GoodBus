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
        features: ['20건의 주문에 동시 입찰 가능'],
    },
    {
        id: 'plus',
        name: '플러스',
        price: '29,900원/월',
        features: [
            '40건의 주문에 동시 입찰 가능',
            '모든 예약주문 평균 입찰가 열람 가능',
            '멤버십 전용 주문 추가 입찰 가능',
        ],
    },
    {
        id: 'premium',
        name: '프리미엄',
        price: '49,900원/월',
        features: [
            '60건의 주문에 동시 입찰 가능',
            '모든 예약주문 평균 입찰가 열람 가능',
            '멤버십 전용 주문 추가 입찰 가능',
            '입찰 후 고객님께 먼저 말걸기 가능',
        ],
    },
    {
        id: 'business',
        name: '비즈니스',
        price: '99,900원/월',
        features: [
            '80건의 주문에 동시 입찰 가능',
            '모든 예약주문 평균 입찰가 열람 가능',
            '멤버십 전용 주문 추가 입찰 가능',
            '입찰 후 고객님께 먼저 말걸기 가능',
            '운행일이 같은 여러 주문 중복낙찰 가능',
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
