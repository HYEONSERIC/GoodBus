'use client';

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    authAPI,
    tripsAPI,
    bidsAPI,
    chatsAPI,
    verificationAPI,
} from '@/lib/api';
import { useBidderProfile } from '@/hooks/useBidderProfile';
import { useTripListFilters } from '@/hooks/useTripListFilters';
import { useTripDistances } from '@/hooks/useTripDistances';
import {
    getRoundPartnerTrip,
    groupTripCardsForDisplay,
} from '@/lib/tripGroups';
import { getMembershipDisplayLabel } from '@/lib/membershipPlans';
import type { DashboardHeaderVariant } from '@/components/layout/DashboardMobileShell';
import type {
    DashboardBid,
    DashboardBidderTrip,
    MyBidDetailState,
} from '@/types/dashboard';

const COMPANY_ROUND_OPTS = { matchStatus: true } as const;

type Trip = DashboardBidderTrip;
type Bid = DashboardBid;

type CompanyDashboardContextValue = ReturnType<
    typeof useCompanyDashboardState
>;

const CompanyDashboardContext =
    createContext<CompanyDashboardContextValue | null>(null);

function useCompanyDashboardState() {
    const [user, setUser] = useState<any>(null);
    const profile = useBidderProfile('company', { userEmail: user?.email });
    const [membershipPlan, setMembershipPlan] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [myBids, setMyBids] = useState<Trip[]>([]);
    const [awardedTrips, setAwardedTrips] = useState<Trip[]>([]);
    const [bidDialogTrip, setBidDialogTrip] = useState<Trip | null>(null);
    const [bidTripPartner, setBidTripPartner] = useState<Trip | undefined>(
        undefined,
    );
    const [verification, setVerification] = useState<any>(null);
    const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
    const [verificationFile, setVerificationFile] = useState<File | null>(null);
    const [verificationUploading, setVerificationUploading] = useState(false);
    const uploadBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const [activeTab, setActiveTab] = useState<
        | 'available'
        | 'contract'
        | 'chat'
        | 'support'
        | 'membership'
        | 'paymentCards'
        | 'profile'
        | 'profileEdit'
    >('available');
    const [contractSubTab, setContractSubTab] = useState<
        'reservation' | 'bidding' | 'completed'
    >('reservation');
    const [myBidDetail, setMyBidDetail] =
        useState<MyBidDetailState<Trip> | null>(null);
    const [chatFocusRoomId, setChatFocusRoomId] = useState<string | null>(
        null,
    );
    const [membershipPrevTab, setMembershipPrevTab] = useState<
        | 'available'
        | 'contract'
        | 'chat'
        | 'support'
        | 'paymentCards'
        | 'profile'
        | 'profileEdit'
    >('available');
    const [paymentCardsPrevTab, setPaymentCardsPrevTab] = useState<
        | 'available'
        | 'contract'
        | 'chat'
        | 'support'
        | 'membership'
        | 'profile'
        | 'profileEdit'
    >('available');
    const [menuOpen, setMenuOpen] = useState(false);
    const tripFilters = useTripListFilters();
    const currentMembershipLabel = getMembershipDisplayLabel(
        membershipPlan?.name,
    );
    const companyRegistrationUrl =
        verification?.companyRegistrationUrl ||
        user?.companyRegistrationUrl ||
        null;
    const insuranceLabel =
        verification?.companyRegistrationStatus === 'approved'
            ? '인증완료'
            : '미인증';

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'contract') {
            loadData();
        }
    }, [activeTab]);

    async function loadData() {
        try {
            const userData = await authAPI.getMe();
            setUser(userData.user);
            setMembershipPlan(userData.user?.membershipPlan || null);
            profile.applyFromUser(userData.user);
            try {
                const verificationData = await verificationAPI.getMe();
                setVerification(verificationData.verification);
            } catch (verificationError) {
                console.warn('Verification load failed:', verificationError);
            }
            const tripData = await tripsAPI.getAll('open');
            const allTrips = tripData.trips || [];

            const tripsWithMyBids = allTrips.filter((trip: Trip) =>
                trip.bids?.some(
                    (bid: Bid) =>
                        bid.bidder.id === userData.user.id &&
                        bid.status === 'open',
                ),
            );
            const tripsWithoutMyBids = allTrips.filter(
                (trip: Trip) =>
                    !trip.bids?.some(
                        (bid: Bid) =>
                            bid.bidder.id === userData.user.id &&
                            bid.status === 'open',
                    ),
            );

            setTrips(tripsWithoutMyBids);
            setMyBids(tripsWithMyBids);

            const awardedTripData = await tripsAPI.getAll('awarded');

            const awardedTripsFiltered = (awardedTripData.trips || []).filter(
                (trip: Trip) => {
                    const hasMyAwardedBid = trip.bids?.some(
                        (bid: Bid) =>
                            bid.bidder.id === userData.user.id &&
                            bid.status === 'awarded',
                    );

                    return hasMyAwardedBid;
                },
            );

            setAwardedTrips(awardedTripsFiltered);
        } catch (error) {
            console.error('Error loading data:', error);
            window.location.href = '/login';
        }
    }

    async function handleLogout() {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
        window.location.href = '/login';
    }

    async function submitBid(
        tripId: string,
        totalManwon: number,
        note: string,
    ) {
        if (verification?.companyRegistrationStatus !== 'approved') {
            setVerificationDialogOpen(true);
            return;
        }
        await bidsAPI.create(tripId, totalManwon, note);
        setBidDialogTrip(null);
        setBidTripPartner(undefined);
        await loadData();
    }

    function handleBidButtonClick(trip: Trip) {
        if (verification?.companyRegistrationStatus !== 'approved') {
            setVerificationDialogOpen(true);
            return;
        }
        setBidTripPartner(
            getRoundPartnerTrip(trip, openTripsPool, COMPANY_ROUND_OPTS),
        );
        setBidDialogTrip(trip);
    }

    async function handleVerificationUpload() {
        if (!verificationFile) {
            alert('파일을 선택해주세요');
            return;
        }
        setVerificationUploading(true);
        try {
            const data = await verificationAPI.upload(verificationFile);
            setVerification(data.verification);
            setVerificationFile(null);
            alert('업로드가 완료되었습니다. 승인 대기 중입니다.');
            setVerificationDialogOpen(false);
        } catch (error) {
            console.error('Verification upload error:', error);
            alert('업로드에 실패했습니다');
        } finally {
            setVerificationUploading(false);
        }
    }

    async function handleWithdrawBid(trip: Trip) {
        if (!confirm('이 입찰을 철회하시겠습니까?')) {
            return;
        }

        const myBid = trip.bids.find(
            (bid: Bid) => bid.bidder.id === user?.id && bid.status === 'open',
        );
        if (!myBid) return;

        try {
            await bidsAPI.withdraw(myBid.id);
            loadData();
        } catch (error) {
            console.error('Error withdrawing bid:', error);
            alert('입찰 철회에 실패했습니다');
        }
    }

    async function openBidQuoteChat(trip: Trip) {
        if (!user?.id) return;
        try {
            const data = (await chatsAPI.ensureQuoteRoom(
                trip.id,
                user.id,
            )) as { room?: { id?: string } };
            const roomId = data.room?.id;
            if (!roomId) {
                alert('채팅방을 열 수 없습니다.');
                return;
            }
            setChatFocusRoomId(roomId);
            setMyBidDetail(null);
            setActiveTab('chat');
        } catch (error: unknown) {
            alert(
                error instanceof Error
                    ? error.message
                    : '채팅방을 준비하지 못했습니다.',
            );
        }
    }

    async function withdrawBidFromDetail(trip: Trip) {
        if (!confirm('이 입찰을 철회하시겠습니까?')) {
            return;
        }

        const myBid = trip.bids.find(
            (bid: Bid) => bid.bidder.id === user?.id && bid.status === 'open',
        );
        if (!myBid) return;

        try {
            await bidsAPI.withdraw(myBid.id);
            setMyBidDetail(null);
            await loadData();
        } catch (error) {
            console.error('Error withdrawing bid:', error);
            alert('입찰 철회에 실패했습니다');
        }
    }

    const allKnownTrips = useMemo(() => {
        const byId = new Map<string, Trip>();
        for (const t of trips) byId.set(t.id, t);
        for (const t of myBids) byId.set(t.id, t);
        for (const t of awardedTrips) byId.set(t.id, t);
        return Array.from(byId.values());
    }, [trips, myBids, awardedTrips]);
    const distanceByTripId = useTripDistances(allKnownTrips);

    const openTripsPool = useMemo(() => {
        const byId = new Map<string, Trip>();
        for (const t of trips) byId.set(t.id, t);
        for (const t of myBids) byId.set(t.id, t);
        return Array.from(byId.values());
    }, [trips, myBids]);

    const contractReservationTrips = useMemo(
        () =>
            awardedTrips.filter(
                (trip) => new Date(trip.dateTime).getTime() >= Date.now(),
            ),
        [awardedTrips],
    );

    const contractCompletedTrips = useMemo(
        () =>
            awardedTrips.filter(
                (trip) => new Date(trip.dateTime).getTime() < Date.now(),
            ),
        [awardedTrips],
    );

    const contractReservationCardTrips = useMemo(
        () =>
            groupTripCardsForDisplay(
                contractReservationTrips,
                contractReservationTrips,
                COMPANY_ROUND_OPTS,
            ),
        [contractReservationTrips],
    );

    const contractCompletedCardTrips = useMemo(
        () =>
            groupTripCardsForDisplay(
                contractCompletedTrips,
                contractCompletedTrips,
                COMPANY_ROUND_OPTS,
            ),
        [contractCompletedTrips],
    );

    const myBidCardTrips = useMemo(
        () =>
            groupTripCardsForDisplay(
                myBids,
                openTripsPool,
                COMPANY_ROUND_OPTS,
            ),
        [myBids, openTripsPool],
    );

    const showMainHeader =
        activeTab !== 'profile' && activeTab !== 'profileEdit';
    const headerVariant: DashboardHeaderVariant =
        activeTab === 'membership'
            ? 'membership'
            : activeTab === 'paymentCards'
              ? 'paymentCards'
              : 'menu';
    const headerTitle =
        activeTab === 'membership'
            ? '멤버십'
            : activeTab === 'paymentCards'
              ? '결제카드'
              : 'GOODBUS';

    return {
        COMPANY_ROUND_OPTS,
        user,
        membershipPlan,
        trips,
        myBids,
        awardedTrips,
        bidDialogTrip,
        setBidDialogTrip,
        bidTripPartner,
        setBidTripPartner,
        verification,
        verificationDialogOpen,
        setVerificationDialogOpen,
        verificationFile,
        setVerificationFile,
        verificationUploading,
        uploadBaseUrl,
        profile,
        activeTab,
        setActiveTab,
        contractSubTab,
        setContractSubTab,
        myBidDetail,
        setMyBidDetail,
        chatFocusRoomId,
        setChatFocusRoomId,
        membershipPrevTab,
        setMembershipPrevTab,
        paymentCardsPrevTab,
        setPaymentCardsPrevTab,
        menuOpen,
        setMenuOpen,
        tripFilters,
        currentMembershipLabel,
        companyRegistrationUrl,
        insuranceLabel,
        loadData,
        handleLogout,
        submitBid,
        handleBidButtonClick,
        handleVerificationUpload,
        handleWithdrawBid,
        openBidQuoteChat,
        withdrawBidFromDetail,
        allKnownTrips,
        distanceByTripId,
        openTripsPool,
        contractReservationTrips,
        contractReservationCardTrips,
        contractCompletedTrips,
        contractCompletedCardTrips,
        myBidCardTrips,
        showMainHeader,
        headerVariant,
        headerTitle,
    };
}

export function CompanyDashboardProvider({ children }: { children: ReactNode }) {
    const value = useCompanyDashboardState();
    return (
        <CompanyDashboardContext.Provider value={value}>
            {children}
        </CompanyDashboardContext.Provider>
    );
}

export function useCompanyDashboard() {
    const ctx = useContext(CompanyDashboardContext);
    if (!ctx) {
        throw new Error(
            'useCompanyDashboard must be used within CompanyDashboardProvider',
        );
    }
    return ctx;
}
