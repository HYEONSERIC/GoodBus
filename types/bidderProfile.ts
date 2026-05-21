export type BidderDashboardRole = 'driver' | 'company';

export type BidderProfileForm = {
    name: string;
    company: string;
    phone: string;
    garage: string;
    busNumber: string;
    busType: string;
    busYear: string;
    capacity: string;
    driverComment: string;
};

export const EMPTY_BIDDER_PROFILE_FORM: BidderProfileForm = {
    name: '',
    company: '',
    phone: '',
    garage: '',
    busNumber: '',
    busType: '',
    busYear: '',
    capacity: '',
    driverComment: '',
};
