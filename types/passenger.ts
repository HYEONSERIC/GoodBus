export type PassengerBidderProfile = {
    id: string;
    email: string;
    role: string;
    displayName?: string | null;
    companyName?: string | null;
    phoneNumber?: string | null;
    profileImageUrl?: string | null;
    vehicleImageUrls?: string[] | null;
    busType?: string | null;
    busYear?: string | null;
    capacity?: number | null;
    driverComment?: string | null;
    driverLicenseStatus?: string | null;
    companyRegistrationStatus?: string | null;
};

/** @deprecated PassengerBidderProfile 사용 */
export type BidderProfile = PassengerBidderProfile;

export type PassengerBid = {
    id: string;
    tripId: string;
    price: number;
    note?: string | null;
    status: string;
    bidder: PassengerBidderProfile;
};

export type PassengerTrip = {
    id: string;
    origin: string;
    originX?: number | null;
    originY?: number | null;
    destination: string;
    destinationX?: number | null;
    destinationY?: number | null;
    dateTime: string;
    createdAt?: string;
    paxCount: number;
    busSize: string;
    status: string;
    stopoverDetail?: string | null;
    companionType?: 'depart_return' | 'with_schedule' | null;
    itineraryDetail?: string | null;
    servicePurpose?: string | null;
    paymentMethod?: 'cash' | 'card' | null;
    additionalRequest?: string | null;
    passenger: {
        id: string;
        email: string;
        role: string;
    };
    bids: PassengerBid[];
    minBidPrice: number | null;
};

export type PassengerBidDetailState = {
    bid: PassengerBid;
    bidTrip: PassengerTrip;
};
