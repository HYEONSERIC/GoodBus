export type BidProfileForm = {
    busType: string;
    capacity: string;
    busYear: string;
};

export type ExtendedBidForm = {
    priceManwon: string;
    vehicleCount: number;
    toll: boolean;
    parking: boolean;
    accommodation: boolean;
    meals: boolean;
    vehicleChoice: string;
    vehicleYear: string;
    customerMsg: string;
    proactiveMsg: string;
    addons: {
        water: boolean;
        dropoff: boolean;
        cleaning: boolean;
        escort: boolean;
    };
    addonOptOut: boolean;
};

export function defaultExtendedBidForm(profileForm: BidProfileForm): ExtendedBidForm {
    const cap = profileForm.capacity ? `${profileForm.capacity}인승` : '';
    const typeLine =
        profileForm.busType && cap
            ? `${profileForm.busType} (${cap})`
            : profileForm.busType || cap || '프로필에서 차량 정보 등록';
    return {
        priceManwon: '',
        vehicleCount: 1,
        toll: true,
        parking: true,
        accommodation: false,
        meals: false,
        vehicleChoice: `내 차량 — ${typeLine}`,
        vehicleYear: profileForm.busYear || String(new Date().getFullYear()),
        customerMsg: '',
        proactiveMsg: '',
        addons: {
            water: false,
            dropoff: false,
            cleaning: false,
            escort: false,
        },
        addonOptOut: false,
    };
}

export function assembleBidNote(
    extendedBid: ExtendedBidForm,
    pricePerVehicle: number,
    vehicleCount: number,
) {
    const lines: string[] = [];
    lines.push(
        `[입찰가(부가세 별도)] 1대당 ${pricePerVehicle}만원 × ${vehicleCount}대`,
    );
    const inc: string[] = [];
    if (extendedBid.toll) inc.push('통행료');
    if (extendedBid.parking) inc.push('주차료');
    if (extendedBid.accommodation) inc.push('숙박비');
    if (extendedBid.meals) inc.push('식사비');
    lines.push(`[포함 부대비용] ${inc.length ? inc.join('·') : '없음'}`);
    lines.push(`[차종] ${extendedBid.vehicleChoice}`);
    lines.push(`[연식] ${extendedBid.vehicleYear}년`);
    if (extendedBid.customerMsg.trim()) {
        lines.push(`[고객님께 남기실 말씀]\n${extendedBid.customerMsg.trim()}`);
    }
    if (extendedBid.proactiveMsg.trim()) {
        lines.push(`[먼저 말걸기]\n${extendedBid.proactiveMsg.trim()}`);
    }
    if (extendedBid.addonOptOut) {
        lines.push('[부가 서비스] 수익 포기');
    } else {
        const addonNames: string[] = [];
        if (extendedBid.addons.water) addonNames.push('생수');
        if (extendedBid.addons.dropoff) addonNames.push('하차지 추가');
        if (extendedBid.addons.cleaning) addonNames.push('스마일 청소비');
        if (extendedBid.addons.escort) addonNames.push('하객 인솔 서비스');
        if (addonNames.length) {
            lines.push(`[부가 서비스] ${addonNames.join(', ')}`);
        }
    }
    return lines.join('\n\n');
}

export const OPEN_TRIP_BID_ADDON_ROWS = [
    {
        key: 'water' as const,
        title: '생수',
        tag: '인기',
        price: '3만원~4만원',
        desc: '탑승 인원에 맞춘 생수 준비.',
    },
    {
        key: 'dropoff' as const,
        title: '하차지 추가',
        tag: '추천',
        price: '5만원',
        desc: '복수 하차(거리 한도 내) 제안.',
    },
    {
        key: 'cleaning' as const,
        title: '스마일 청소비',
        tag: '인기',
        price: '3만원',
        desc: '운행 후 정리·청결.',
    },
    {
        key: 'escort' as const,
        title: '하객 인솔 서비스',
        tag: '프리미엄',
        price: '10만원',
        desc: '집결·안내 등 현장 인솔.',
    },
];
