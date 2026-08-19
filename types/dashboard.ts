import type { OpenTripLike } from '@/types/trip';
import type { PassengerBidderProfile } from '@/types/passenger';

/** 기사·회사 대시보드 입찰자 참조 */
export type DashboardBidderRef = {
    id: string;
    email: string | null;
    role: string;
};

export type DashboardBid = {
    id: string;
    tripId?: string;
    price: number;
    note?: string | null;
    status: string;
    createdAt?: string;
    bidder: DashboardBidderRef;
};

export type DashboardTripCoords = {
    originX?: number | null;
    originY?: number | null;
    destinationX?: number | null;
    destinationY?: number | null;
};

/** 기사·회사 공통 Trip */
export type DashboardBidderTrip = Omit<OpenTripLike, 'bids' | 'status'> &
    DashboardTripCoords & {
        status: string;
        createdAt?: string;
        servicePurpose?: string | null;
        stopoverDetail?: string | null;
        companionType?: 'depart_return' | 'with_schedule' | null;
        itineraryDetail?: string | null;
        paymentMethod?: 'cash' | 'card' | null;
        additionalRequest?: string | null;
        bids: DashboardBid[];
    };

export type DashboardPassengerRef = {
    id: string;
    email: string | null;
    role: string;
};

/** 승객 대시보드 Trip */
export type DashboardPassengerTrip = Omit<
    DashboardBidderTrip,
    'bids'
> & {
    passenger: DashboardPassengerRef;
    minBidPrice: number | null;
    bids: Array<{
        id: string;
        tripId: string;
        price: number;
        note?: string | null;
        status: string;
        bidder: PassengerBidderProfile;
    }>;
};

export type MyBidDetailState<
    T extends DashboardBidderTrip = DashboardBidderTrip,
> = {
    trip: T;
    partner?: T;
    bidStatus: 'open' | 'awarded';
};

/** 로그인한 사용자(승객/기사/회사) 세션 정보 — /auth/me 응답 중 실제로 쓰는 필드만 */
export type DashboardSessionUser = DashboardBidderRef & {
    displayName?: string | null;
    companyName?: string | null;
    phoneNumber?: string | null;
    companyRegistrationUrl?: string | null;
    driverLicenseUrl?: string | null;
};

/** 기사·회사 인증 서류 상태 — /verification/me 응답 중 실제로 쓰는 필드만 */
export type DashboardVerification = {
    driverLicenseStatus?: string | null;
    driverLicenseUrl?: string | null;
    driverLicenseNote?: string | null;
    companyRegistrationStatus?: string | null;
    companyRegistrationUrl?: string | null;
    companyRegistrationNote?: string | null;
};

/** 멤버십 플랜 — /auth/me 응답의 user.membershipPlan */
export type DashboardMembershipPlan = {
    name?: string | null;
};

export type KakaoPlace = {
    id: string;
    place_name: string;
    address_name: string;
    road_address_name: string;
    x?: string;
    y?: string;
};
