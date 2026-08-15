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
    reviewsAPI,
} from '@/lib/api';
import { type TripReviewRecord } from '@/components/TripReviewSection';
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
    DashboardMembershipPlan,
    DashboardSessionUser,
    DashboardVerification,
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
    const [user, setUser] = useState<DashboardSessionUser | null>(null);
    const profile = useBidderProfile('company', { userEmail: user?.email });
    const [membershipPlan, setMembershipPlan] =
        useState<DashboardMembershipPlan | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [myBids, setMyBids] = useState<Trip[]>([]);
    const [awardedTrips, setAwardedTrips] = useState<Trip[]>([]);
    const [bidDialogTrip, setBidDialogTrip] = useState<Trip | null>(null);
    const [bidTripPartner, setBidTripPartner] = useState<Trip | undefined>(
        undefined,
    );
    const [verification, setVerification] =
        useState<DashboardVerification | null>(null);
    const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
    const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
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
    const [companySupportOpen, setCompanySupportOpen] = useState(false);
    const [companyInquiryListKey, setCompanyInquiryListKey] = useState(0);
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
    const [profileSection, setProfileSection] = useState<'details' | 'review'>(
        'details',
    );
    const [driverReviews, setDriverReviews] = useState<
        Array<
            TripReviewRecord & {
                trip?: {
                    origin: string;
                    destination: string;
                    dateTime: string;
                };
            }
        >
    >([]);
    const [driverReviewStats, setDriverReviewStats] = useState<{
        avgRating: number | null;
        count: number;
    }>({ avgRating: null, count: 0 });
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
        if (activeTab === 'contract' || activeTab === 'available') {
            loadData();
        }
    }, [activeTab]);

    useEffect(() => {
        const refreshOnFocus = () => {
            if (activeTab === 'available') {
                loadData();
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                refreshOnFocus();
            }
        };
        window.addEventListener('focus', refreshOnFocus);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('focus', refreshOnFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'profile' && activeTab !== 'profileEdit') return;
        reviewsAPI
            .getDriverMe()
            .then((data) => {
                setDriverReviews(data.reviews || []);
                setDriverReviewStats({
                    avgRating: data.avgRating ?? null,
                    count: data.count ?? 0,
                });
            })
            .catch(() => {
                setDriverReviews([]);
                setDriverReviewStats({ avgRating: null, count: 0 });
            });
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

            const [awardedTripData, cancelledTripData] = await Promise.all([
                tripsAPI.getAll('awarded'),
                tripsAPI.getAll('cancelled'),
            ]);

            const hasMyAwardedBid = (trip: Trip) =>
                trip.bids?.some(
                    (bid: Bid) =>
                        bid.bidder.id === userData.user.id &&
                        bid.status === 'awarded',
                );

            const awardedTripsFiltered = (
                awardedTripData.trips || []
            ).filter(hasMyAwardedBid);
            // Trips the passenger cancelled after this bidder was awarded —
            // shown with a "취소됨" badge instead of silently disappearing.
            const cancelledTripsFiltered = (
                cancelledTripData.trips || []
            ).filter(hasMyAwardedBid);

            setAwardedTrips([
                ...awardedTripsFiltered,
                ...cancelledTripsFiltered,
            ]);
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
        const registrationStatus = verification?.companyRegistrationStatus;
        if (registrationStatus === 'pending') {
            setPendingDialogOpen(true);
            throw new Error('사업자등록증 승인 대기 중입니다.');
        }
        if (registrationStatus !== 'approved') {
            setVerificationDialogOpen(true);
            throw new Error('사업자등록증 인증이 필요합니다.');
        }
        try {
            await bidsAPI.create(tripId, totalManwon, note);
            setBidDialogTrip(null);
            setBidTripPartner(undefined);
            await loadData();
        } catch (error: unknown) {
            await loadData();
            const message = error instanceof Error ? error.message : '';
            if (message.includes('결제 카드 등록')) {
                setBidDialogTrip(null);
                setBidTripPartner(undefined);
                if (
                    confirm(
                        '입찰하려면 결제 카드 등록이 필요합니다. 지금 등록하시겠습니까?',
                    )
                ) {
                    setActiveTab('paymentCards');
                }
                return;
            }
            throw error instanceof Error
                ? error
                : new Error('입찰 생성에 실패했습니다');
        }
    }

    function handleBidButtonClick(trip: Trip) {
        const registrationStatus = verification?.companyRegistrationStatus;
        if (registrationStatus === 'pending') {
            setPendingDialogOpen(true);
            return;
        }
        if (registrationStatus !== 'approved') {
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
        pendingDialogOpen,
        setPendingDialogOpen,
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
        profileSection,
        setProfileSection,
        driverReviews,
        driverReviewStats,
        companySupportOpen,
        setCompanySupportOpen,
        companyInquiryListKey,
        setCompanyInquiryListKey,
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
