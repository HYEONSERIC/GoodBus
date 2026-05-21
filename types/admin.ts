export type AdminTabId =
    | 'overview'
    | 'users'
    | 'bids'
    | 'notifications'
    | 'verification'
    | 'revenue'
    | 'faq'
    | 'adminCreate';

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
    authorEmail: string;
    authorRole: string;
    authorDisplay: string;
    repliedAt: string | null;
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
        email: string;
        role: string;
        displayName: string | null;
        companyName: string | null;
        phoneNumber: string | null;
    };
}

export interface OverviewResponse {
    counts: {
        users: number;
        trips: number;
        bids: number;
    };
    recentTrips: Array<{
        id: string;
        origin: string;
        destination: string;
        createdAt: string;
        passenger: { id: string; email: string };
    }>;
    recentBids: Array<{
        id: string;
        price: string;
        createdAt: string;
        trip: { id: string; origin: string; destination: string };
        bidder: { id: string; email: string; role: string };
    }>;
}

export interface AdminUser {
    id: string;
    email: string;
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
        };
    }>;
}

export interface AdminBidRow {
    id: string;
    price: string;
    status: string;
    createdAt: string;
    bidder: { id: string; email: string; role: string };
    trip: {
        id: string;
        origin: string;
        destination: string;
        status: string;
        passenger: { id: string; email: string };
    };
}

export interface AdminNotificationHistoryRow {
    id: string;
    type: string;
    title: string;
    readAt: string;
    user: { id: string; email: string; role: string };
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

export interface VerificationRow {
    id: string;
    email: string;
    role: string;
    driverLicenseUrl?: string | null;
    driverLicenseStatus?: string | null;
    driverLicenseNote?: string | null;
    companyRegistrationUrl?: string | null;
    companyRegistrationStatus?: string | null;
    companyRegistrationNote?: string | null;
    createdAt: string;
}
