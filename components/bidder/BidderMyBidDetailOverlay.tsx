'use client';

import { MyBidQuoteDetailDialog } from '@/components/MyBidQuoteDetailDialog';
import { biddingTripKm, getBusLabel } from '@/lib/tripDisplay';
import type {
    DashboardBidderTrip,
    MyBidDetailState,
} from '@/types/dashboard';

export type BidderDashboardRole = 'driver' | 'company';

export function BidderMyBidDetailOverlay({
    detail,
    userId,
    distanceByTripId,
    role,
    onClose,
    onChatWithPassenger,
    onWithdrawBid,
    onHome,
}: {
    detail: MyBidDetailState<DashboardBidderTrip> | null;
    userId?: string;
    distanceByTripId: Record<string, number | null>;
    role: BidderDashboardRole;
    onClose: () => void;
    onChatWithPassenger: (trip: DashboardBidderTrip) => void | Promise<void>;
    onWithdrawBid: (trip: DashboardBidderTrip) => void | Promise<void>;
    onHome?: () => void;
}) {
    if (!detail) return null;

    const { trip, partner, bidStatus } = detail;
    const myBid = trip.bids.find(
        (bid) => bid.bidder.id === userId && bid.status === bidStatus,
    );
    if (!myBid) return null;

    return (
        <MyBidQuoteDetailDialog
            open
            role={role}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            trip={trip}
            partnerTrip={partner}
            km={biddingTripKm(trip, partner, distanceByTripId)}
            myBid={{
                price: Number(myBid.price),
                note: myBid.note,
            }}
            busPreferenceLabel={getBusLabel(trip.busSize)}
            onChatWithPassenger={() => onChatWithPassenger(trip)}
            onWithdrawBid={() => onWithdrawBid(trip)}
            onHome={onHome}
            showWithdrawButton={bidStatus === 'open'}
        />
    );
}
