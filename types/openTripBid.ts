export type OpenTripBidTrip = {
    id: string;
    origin: string;
    destination: string;
    dateTime: string;
    paxCount: number;
    busSize: string;
    servicePurpose?: string | null;
    stopoverDetail?: string | null;
    companionType?: 'depart_return' | 'with_schedule' | null;
    itineraryDetail?: string | null;
    paymentMethod?: 'cash' | 'card' | null;
};
