import type { OpenTripLike } from '@/types/trip';

export function getBusLabel(busSize: string) {
    if (busSize === 'large') return '대형버스 선호';
    if (busSize === 'medium') return '우등버스 선호';
    return '미니버스/밴 선호';
}

export function getServicePurposeLabel(purpose?: string | null) {
    if (!purpose) return null;
    if (purpose === 'MT/학교') return '학교 행사/MT';
    return purpose;
}

export function formatBoardingLine(dateTime: string) {
    const d = new Date(dateTime);
    return `${d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    })} ${d.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })} 탑승`;
}

export function paymentMethodLabel(pm?: string | null) {
    if (!pm) return null;
    if (pm === 'cash') return '만나서 현금결제';
    if (pm === 'card') return '카드 결제';
    return null;
}

export function formatTripTime(dateTime: string) {
    return new Date(dateTime).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

export function formatTripDateLine(dateTime: string) {
    const date = new Date(dateTime);
    const md = date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
    });
    const weekday = date.toLocaleDateString('ko-KR', {
        weekday: 'short',
    });
    return `${md} (${weekday})`;
}

/** 동행 방식(일정 동행). 편도·왕복 운행과 별개 */
export function biddingCompanionSubtitle(trip: OpenTripLike): string | null {
    if (trip.companionType === 'with_schedule') return '일정 동행';
    return null;
}

export function countOpenBids(trip: OpenTripLike, partner?: OpenTripLike) {
    const countFor = (t: OpenTripLike) =>
        t.bids?.filter((b) => b.status === 'open').length ?? 0;
    if (partner) return countFor(trip) + countFor(partner);
    return countFor(trip);
}

export function biddingTripKm(
    trip: OpenTripLike,
    partner: OpenTripLike | undefined,
    distances: Record<string, number | null>,
) {
    const d1 = distances[trip.id];
    if (partner) {
        const d2 = distances[partner.id];
        if (d1 != null && d2 != null) return Math.round(d1 + d2);
        if (d1 != null) return Math.round(d1);
        if (d2 != null) return Math.round(d2);
        return null;
    }
    return d1 != null ? Math.round(d1) : null;
}

export function parseBidNoteForDisplay(note?: string | null) {
    if (!note?.trim()) return { vehicleTag: null as string | null };
    const vehicleMatch = note.match(/\[차종\]\s*(.+)/m);
    const yearMatch = note.match(/\[연식\]\s*(\d{4})\s*년?/m);
    let vehicleTag: string | null = null;
    if (vehicleMatch?.[1]) {
        const v = vehicleMatch[1].split('\n')[0].trim();
        const y = yearMatch?.[1];
        vehicleTag = y ? `${v} (${y})` : v;
    }
    return { vehicleTag };
}

export function formatBidAgeLabel(createdAt?: string | null) {
    if (!createdAt) return null;
    const t = new Date(createdAt).getTime();
    if (Number.isNaN(t)) return null;
    const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
    if (days <= 0) return '오늘 입찰';
    return `${days}일 전 입찰`;
}
