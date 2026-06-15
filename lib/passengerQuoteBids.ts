import type { PassengerBid, PassengerBidderProfile, PassengerTrip } from '@/types/passenger';

export type OpenBidRow = {
    bid: PassengerBid;
    bidTrip: PassengerTrip;
    segment: string | null;
};

export function parseVehicleCountFromNote(note?: string | null) {
    if (!note) return null;
    const m = note.match(/×\s*(\d+)\s*대/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export function collectOpenBidsForCard(
    trip: PassengerTrip,
    partner?: PassengerTrip,
): OpenBidRow[] {
    const rows: OpenBidRow[] = [];
    if (partner) {
        for (const b of trip.bids || []) {
            if (b.status === 'open') {
                rows.push({ bid: b, bidTrip: trip, segment: '가는편' });
            }
        }
        for (const b of partner.bids || []) {
            if (b.status === 'open') {
                rows.push({ bid: b, bidTrip: partner, segment: '오는편' });
            }
        }
    } else {
        for (const b of trip.bids || []) {
            if (b.status === 'open') {
                rows.push({ bid: b, bidTrip: trip, segment: null });
            }
        }
    }
    return rows.sort((a, b) => Number(a.bid.price) - Number(b.bid.price));
}

export function bidderDisplayName(b: PassengerBidderProfile) {
    if (b.displayName?.trim()) return `${b.displayName.trim()} 기사님`;
    if (b.companyName?.trim()) return b.companyName.trim();
    const local = b.email?.split('@')[0] || '입찰자';
    return b.role === 'Driver' ? `${local} 기사님` : local;
}

export function vehicleSpecLine(bidder: PassengerBidderProfile) {
    const parts = [
        bidder.busType?.trim() || null,
        bidder.busYear?.trim() ? `${bidder.busYear.trim()}년식` : null,
        bidder.capacity != null ? `${bidder.capacity}인승` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : '차량 정보 미등록';
}
