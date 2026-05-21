export type {
    DashboardBid,
    DashboardBidderRef,
    DashboardBidderTrip,
    DashboardPassengerRef,
    DashboardPassengerTrip,
    DashboardTripCoords,
    KakaoPlace,
    MyBidDetailState,
} from '@/types/dashboard';

/** 대시보드·카드 UI에서 공통으로 쓰는 최소 Trip 형태 */
export type TripBidLike = {
    status: string;
};

export type OpenTripLike = {
    id: string;
    origin: string;
    destination: string;
    dateTime: string;
    paxCount: number;
    busSize: string;
    status?: string;
    servicePurpose?: string | null;
    companionType?: 'depart_return' | 'with_schedule' | null;
    bids?: TripBidLike[];
};
