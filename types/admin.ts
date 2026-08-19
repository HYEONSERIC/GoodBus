/** 관리자 화면 전반에서 쓰는 사용자 참조 — 전화 전용 가입자는 email이 null일 수 있음 */
export interface AdminPersonRef {
    id: string;
    email: string | null;
    displayName?: string | null;
    companyName?: string | null;
    phoneNumber?: string | null;
}

export type AdminTabId =
    | 'overview'
    | 'users'
    | 'bids'
    | 'notifications'
    | 'verification'
    | 'revenue'
    | 'faq'
    | 'adminCreate'
    | 'auditLog';

export interface SupportAdminPostRow {
    id: string;
    kind: string;
    title: string;
    body: string;
    pinned: boolean;
    authorLabel: string;
    authorRole: string;
    createdAt: string;
    updatedAt: string;
}

export interface SupportInquiryAdminRow {
    id: string;
    title: string;
    category: string;
    categoryLabel: string;
    createdAt: string;
    authorEmail: string | null;
    authorRole: string;
    authorDisplay: string;
    repliedAt: string | null;
}

export type SupportInquiryListStatus = 'all' | 'pending' | 'replied';
export type SupportInquiryListSort =
    | 'unanswered_first'
    | 'newest'
    | 'oldest';

export interface SupportInquiryListMeta {
    /** 전체 미답변(사이드 배지와 동일 기준) */
    unansweredTotal: number;
    /** 현재 필터·검색에 맞는 전체 건수 */
    totalMatching: number;
    /** 현재 필터·검색 중 답변 대기 건수 */
    pendingInFilter: number;
    returned: number;
}

export interface SupportInquiryDetail {
    id: string;
    title: string;
    body: string;
    category: string;
    categoryLabel: string;
    createdAt: string;
    adminReply: string | null;
    repliedAt: string | null;
    user: {
        email: string | null;
        role: string;
        displayName: string | null;
        companyName: string | null;
        phoneNumber: string | null;
    };
}

export interface AdminRevenueMonthRow {
    year: number;
    month: number;
    label: string;
    awardCount: number;
    gmvManWon: number;
    estimatedRevenueManWon: number;
}

export interface AdminRevenueAwardRow {
    bidId: string;
    tripId: string;
    origin: string;
    destination: string;
    route: string;
    priceManWon: number;
    awardedAt: string | null;
    countedAt: string;
    usedCreatedAtFallback: boolean;
    bidderEmail: string | null;
    bidderDisplayName: string;
    bidderRole: string;
}

export interface AdminRevenueStatsResponse {
    fromYear: number;
    fromMonth: number;
    toYear: number;
    toMonth: number;
    commissionRate: number;
    commissionRatePercent: number;
    awardCount: number;
    gmvManWon: number;
    estimatedRevenueManWon: number;
    awardedAtMissingCount: number;
    monthly: AdminRevenueMonthRow[];
}

export type AdminAwardPeriodSummary = {
    awardCount: number;
    gmvManWon: number;
};

export type AdminNavBadges = Partial<
    Record<'faq' | 'verification', number>
>;

export interface OverviewResponse {
    counts: {
        users: number;
        trips: number;
        bids: number;
    };
    awardsToday: AdminAwardPeriodSummary;
    awardsThisWeek: AdminAwardPeriodSummary;
    pendingInquiries: number;
    pendingVerifications: number;
    navBadges: AdminNavBadges;
    recentTrips: Array<{
        id: string;
        origin: string;
        destination: string;
        createdAt: string;
        passenger: AdminPersonRef;
    }>;
    recentBids: Array<{
        id: string;
        price: string;
        createdAt: string;
        trip: { id: string; origin: string; destination: string };
        bidder: AdminPersonRef & { role: string };
    }>;
}

export interface AdminUser {
    id: string;
    email: string | null;
    displayName?: string | null;
    companyName?: string | null;
    phoneNumber?: string | null;
    role: string;
    status: 'Active' | 'Blocked';
    createdAt: string;
}

export interface PassengerTripSummary {
    quoteOpen: number;
    quoteExpired?: number;
    reservationUpcoming: number;
    completed: number;
    totalGrouped: number;
    totalRaw: number;
}

export interface AdminBidderStats {
    awardedCount: number;
    gmvManWon: number;
}

export interface AdminReviewSummary {
    count: number;
    avgRating: number | null;
    as: 'received' | 'written';
}

export interface AdminUserDetail extends AdminUser {
    _count: {
        tripsAsPassenger: number;
        bids: number;
    };
    displayName?: string | null;
    companyName?: string | null;
    phoneNumber?: string | null;
    garageAddress?: string | null;
    busNumber?: string | null;
    busType?: string | null;
    busYear?: string | null;
    capacity?: number | null;
    profileImageUrl?: string | null;
    vehicleImageUrls?: string[] | null;
    driverLicenseUrl?: string | null;
    driverLicenseStatus?: string | null;
    driverLicenseNote?: string | null;
    companyRegistrationUrl?: string | null;
    companyRegistrationStatus?: string | null;
    companyRegistrationNote?: string | null;
}

export interface AdminUserActivity {
    trips: Array<{
        id: string;
        origin: string;
        destination: string;
        status: string;
        createdAt: string;
    }>;
    bids: Array<{
        id: string;
        price: string;
        status: string;
        createdAt: string;
        trip: {
            id: string;
            origin: string;
            destination: string;
            status: string;
        };
    }>;
    reviews: Array<{
        id: string;
        rating: number;
        comment: string | null;
        createdAt: string;
        trip: {
            id: string;
            origin: string;
            destination: string;
        };
        counterpartyEmail: string;
    }>;
}

export interface AdminBidRow {
    id: string;
    price: string;
    status: string;
    createdAt: string;
    bidder: AdminPersonRef & { role: string };
    trip: {
        id: string;
        origin: string;
        destination: string;
        status: string;
        passenger: AdminPersonRef;
    };
}

export interface AdminNotificationHistoryRow {
    id: string;
    type: string;
    title: string;
    readAt: string;
    user: AdminPersonRef & { role: string };
    trip?: {
        id: string;
        origin: string;
        destination: string;
        dateTime: string;
    } | null;
    bid?: {
        id: string;
        price: string;
        status: string;
        trip?: {
            id: string;
            origin: string;
            destination: string;
            dateTime: string;
        } | null;
    } | null;
}

export interface AdminAuditLogRow {
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    actor: { email: string; adminRole: string | null };
}

export interface AdminAuditLogMeta {
    page: number;
    pageSize: number;
    total: number;
}

export interface VerificationRow {
    id: string;
    email: string | null;
    displayName?: string | null;
    companyName?: string | null;
    phoneNumber?: string | null;
    role: string;
    driverLicenseUrl?: string | null;
    driverLicenseStatus?: string | null;
    driverLicenseNote?: string | null;
    companyRegistrationUrl?: string | null;
    companyRegistrationStatus?: string | null;
    companyRegistrationNote?: string | null;
    createdAt: string;
}
