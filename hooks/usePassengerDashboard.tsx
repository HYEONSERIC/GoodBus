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
    chatsAPI,
    tripsAPI,
    reviewsAPI,
    type DriverReviewStats,
} from '@/lib/api';
import {
    formatPassengerBidderRating,
    type TripReviewRecord,
} from '@/components/TripReviewSection';
import { usePassengerTripForm } from '@/hooks/usePassengerTripForm';
import { useTripDistances } from '@/hooks/useTripDistances';
import {
    getRoundPartnerTrip,
    groupTripCardsForDisplay,
} from '@/lib/tripGroups';
import type {
    BidderProfile,
    PassengerBid,
    PassengerTrip,
} from '@/types/passenger';

const PASSENGER_ROUND_OPTS = { matchStatus: true } as const;

type Trip = PassengerTrip;
type Bid = PassengerBid;

type PassengerDashboardContextValue = ReturnType<
    typeof usePassengerDashboardState
>;

const PassengerDashboardContext =
    createContext<PassengerDashboardContextValue | null>(null);

function usePassengerDashboardState() {
    const [user, setUser] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<
        'quote' | 'booking' | 'chat' | 'support'
    >('quote');
    const [bookingSubTab, setBookingSubTab] = useState<
        'reservation' | 'completed'
    >('reservation');
    const [chatFocusRoomId, setChatFocusRoomId] = useState<string | null>(
        null,
    );
    const [supportOpen, setSupportOpen] = useState(false);
    const [supportInquiryListKey, setSupportInquiryListKey] = useState(0);
    const [tripReviewsByTripId, setTripReviewsByTripId] = useState<
        Record<string, TripReviewRecord>
    >({});
    const [expandedTripIds, setExpandedTripIds] = useState<string[]>([]);
    const [cancelMenuTripId, setCancelMenuTripId] = useState<string | null>(
        null,
    );
    const [cancelDialogTrip, setCancelDialogTrip] = useState<Trip | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [quotesExpandedTripIds, setQuotesExpandedTripIds] = useState<
        string[]
    >([]);
    const [bidDetail, setBidDetail] = useState<{
        bid: Bid;
        bidTrip: Trip;
    } | null>(null);
    const [bidGalleryIndex, setBidGalleryIndex] = useState(0);
    const [driverStatsById, setDriverStatsById] = useState<
        Record<string, DriverReviewStats>
    >({});
    const [bidDetailReviews, setBidDetailReviews] = useState<TripReviewRecord[]>(
        [],
    );
    const [bidDetailReviewStats, setBidDetailReviewStats] =
        useState<DriverReviewStats>({ avgRating: null, count: 0 });
    const [bidDetailReviewsLoading, setBidDetailReviewsLoading] =
        useState(false);
    const uploadBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    function resolveMediaUrl(url?: string | null) {
        if (!url) return null;
        return url.startsWith('/uploads') ? `${uploadBaseUrl}${url}` : url;
    }

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (bidDetail) setBidGalleryIndex(0);
    }, [bidDetail?.bid?.id]);

    async function loadData() {
        try {
            const userData = await authAPI.getMe();
            setUser(userData.user);
            const tripData = await tripsAPI.getAll();
            const myTrips = (tripData.trips || []).filter((trip: any) => {
                const tripPassengerId = trip?.passenger?.id ?? trip?.passengerId;
                return (
                    tripPassengerId === userData.user.id &&
                    trip.status !== 'cancelled'
                );
            });
            setTrips(myTrips);
            await Promise.all([
                loadTripReviews(myTrips),
                loadDriverReviewSummaries(myTrips),
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            window.location.href = '/login';
        }
    }

    async function loadDriverReviewSummaries(tripList: Trip[]) {
        const ids = new Set<string>();
        for (const trip of tripList) {
            for (const bid of trip.bids || []) {
                if (bid.bidder?.id) {
                    ids.add(bid.bidder.id);
                }
            }
        }
        if (ids.size === 0) {
            setDriverStatsById({});
            return;
        }
        try {
            const data = await reviewsAPI.getDriversSummary([...ids]);
            setDriverStatsById(data.byDriverId || {});
        } catch {
            setDriverStatsById({});
        }
    }

    async function openBidDetail(bid: Bid, bidTrip: Trip) {
        setBidDetail({ bid, bidTrip });
        setBidDetailReviewsLoading(true);
        try {
            const data = await reviewsAPI.getDriverById(bid.bidder.id);
            const reviews = (data.reviews || []) as TripReviewRecord[];
            const stats: DriverReviewStats = {
                avgRating: data.avgRating ?? null,
                count: data.count ?? 0,
            };
            setBidDetailReviews(reviews);
            setBidDetailReviewStats(stats);
            setDriverStatsById((prev) => ({
                ...prev,
                [bid.bidder.id]: stats,
            }));
        } catch {
            setBidDetailReviews([]);
            setBidDetailReviewStats({ avgRating: null, count: 0 });
        } finally {
            setBidDetailReviewsLoading(false);
        }
    }

    function formatDriverRatingForList(driverId: string) {
        const stats = driverStatsById[driverId];
        if (!stats) {
            return '—';
        }
        return formatPassengerBidderRating(stats.avgRating, stats.count);
    }

    async function loadTripReviews(tripList: Trip[]) {
        const completedIds = tripList
            .filter(
                (t) =>
                    t.status === 'awarded' &&
                    new Date(t.dateTime).getTime() < Date.now(),
            )
            .map((t) => t.id);
        if (completedIds.length === 0) {
            setTripReviewsByTripId({});
            return;
        }
        try {
            const data = await reviewsAPI.listForTrips(completedIds);
            const map: Record<string, TripReviewRecord> = {};
            for (const r of data.reviews || []) {
                map[r.tripId] = r;
            }
            setTripReviewsByTripId(map);
        } catch {
            /* ignore */
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

    async function cancelTripWithReason(tripIds: string[], reason: string) {
        if (!reason.trim()) {
            alert('취소 사유를 선택해주세요');
            return;
        }
        const cancellableTripIds = tripIds.filter((tripId) =>
            trips.some(
                (trip) =>
                    trip.id === tripId &&
                    (trip.status === 'open' || trip.status === 'awarded'),
            ),
        );
        if (cancellableTripIds.length === 0) {
            alert('취소 가능한 여정이 없습니다.');
            return;
        }
        try {
            await Promise.all(
                cancellableTripIds.map((tripId) => tripsAPI.cancel(tripId)),
            );
            setCancelDialogTrip(null);
            setCancelReason('');
            setCancelMenuTripId(null);
            loadData();
        } catch (error) {
            console.error('Error cancelling trip:', error);
            alert('여정 취소에 실패했습니다');
        }
    }

    function getTripIdsForCancel(trip: Trip) {
        const partner = getRoundPartnerTrip(trip, trips, PASSENGER_ROUND_OPTS);
        if (!partner) return [trip.id];
        return [trip.id, partner.id];
    }

    function toggleTripDetail(tripId: string) {
        setExpandedTripIds((prev) =>
            prev.includes(tripId)
                ? prev.filter((id) => id !== tripId)
                : [...prev, tripId],
        );
    }

    function toggleQuotesTrip(tripId: string) {
        setQuotesExpandedTripIds((prev) =>
            prev.includes(tripId)
                ? prev.filter((id) => id !== tripId)
                : [...prev, tripId],
        );
    }

    function verificationLabel(bidder: BidderProfile) {
        if (bidder.role === 'Driver') {
            return bidder.driverLicenseStatus === 'approved'
                ? '인증완료'
                : '미인증';
        }
        if (bidder.role === 'BusCompany') {
            return bidder.companyRegistrationStatus === 'approved'
                ? '인증완료'
                : '미인증';
        }
        return '—';
    }

    async function awardSelectedBid(bidTripId: string, bidId: string) {
        if (
            !confirm(
                '이 견적으로 낙찰할까요? 다른 열린 입찰은 자동으로 제외됩니다.',
            )
        ) {
            return;
        }
        try {
            await tripsAPI.award(bidTripId, bidId);
            setBidDetail(null);
            setBidDetailReviews([]);
            setQuotesExpandedTripIds([]);
            await loadData();
        } catch (error: unknown) {
            alert(
                error instanceof Error
                    ? error.message
                    : '낙찰 처리에 실패했습니다',
            );
        }
    }

    async function openQuoteChat(bidTrip: Trip, bid: Bid) {
        try {
            const data = (await chatsAPI.ensureQuoteRoom(
                bidTrip.id,
                bid.bidder.id,
            )) as { room?: { id?: string } };
            const roomId = data.room?.id;
            if (!roomId) {
                alert('채팅방을 열 수 없습니다.');
                return;
            }
            setChatFocusRoomId(roomId);
            setBidDetail(null);
            setBidDetailReviews([]);
            setActiveTab('chat');
        } catch (error: unknown) {
            alert(
                error instanceof Error
                    ? error.message
                    : '채팅방을 준비하지 못했습니다.',
            );
        }
    }

    const tripsForDistance = useMemo(
        () =>
            trips.filter(
                (trip) => trip.status === 'open' || trip.status === 'awarded',
            ),
        [trips],
    );
    const distanceByTripId = useTripDistances(tripsForDistance);

    const awardedTrips = trips.filter((trip) => trip.status === 'awarded');

    const passengerOpenTrips = useMemo(
        () => trips.filter((t) => t.status === 'open'),
        [trips],
    );

    const passengerAwardedReservationTrips = useMemo(
        () =>
            awardedTrips.filter(
                (trip) => new Date(trip.dateTime).getTime() >= Date.now(),
            ),
        [awardedTrips],
    );

    const passengerAwardedCompletedTrips = useMemo(
        () =>
            awardedTrips.filter(
                (trip) => new Date(trip.dateTime).getTime() < Date.now(),
            ),
        [awardedTrips],
    );

    const passengerReservationCardTrips = useMemo(
        () =>
            groupTripCardsForDisplay(
                passengerAwardedReservationTrips,
                passengerAwardedReservationTrips,
                PASSENGER_ROUND_OPTS,
            ),
        [passengerAwardedReservationTrips],
    );

    const passengerCompletedCardTrips = useMemo(
        () =>
            groupTripCardsForDisplay(
                passengerAwardedCompletedTrips,
                passengerAwardedCompletedTrips,
                PASSENGER_ROUND_OPTS,
            ),
        [passengerAwardedCompletedTrips],
    );

    const tripForm = usePassengerTripForm({ onCreated: loadData });

    function closeCancelDialog() {
        setCancelDialogTrip(null);
        setCancelReason('');
    }

    function closeBidDetail() {
        setBidDetail(null);
        setBidDetailReviews([]);
        setBidDetailReviewStats({ avgRating: null, count: 0 });
    }

    function confirmCancelTrip() {
        if (!cancelDialogTrip) return;
        cancelTripWithReason(
            getTripIdsForCancel(cancelDialogTrip),
            cancelReason,
        );
    }

    return {
        PASSENGER_ROUND_OPTS,
        user,
        trips,
        menuOpen,
        setMenuOpen,
        activeTab,
        setActiveTab,
        bookingSubTab,
        setBookingSubTab,
        chatFocusRoomId,
        setChatFocusRoomId,
        supportOpen,
        setSupportOpen,
        supportInquiryListKey,
        setSupportInquiryListKey,
        tripReviewsByTripId,
        expandedTripIds,
        cancelMenuTripId,
        setCancelMenuTripId,
        cancelDialogTrip,
        setCancelDialogTrip,
        cancelReason,
        setCancelReason,
        quotesExpandedTripIds,
        bidDetail,
        setBidDetail,
        closeBidDetail,
        openBidDetail,
        bidDetailReviews,
        bidDetailReviewStats,
        bidDetailReviewsLoading,
        formatDriverRatingForList,
        bidGalleryIndex,
        setBidGalleryIndex,
        resolveMediaUrl,
        loadData,
        loadTripReviews,
        handleLogout,
        getTripIdsForCancel,
        toggleTripDetail,
        toggleQuotesTrip,
        verificationLabel,
        awardSelectedBid,
        openQuoteChat,
        distanceByTripId,
        passengerReservationCardTrips,
        passengerCompletedCardTrips,
        tripForm,
        closeCancelDialog,
        confirmCancelTrip,
    };
}

export function PassengerDashboardProvider({
    children,
}: {
    children: ReactNode;
}) {
    const value = usePassengerDashboardState();
    return (
        <PassengerDashboardContext.Provider value={value}>
            {children}
        </PassengerDashboardContext.Provider>
    );
}

export function usePassengerDashboard() {
    const ctx = useContext(PassengerDashboardContext);
    if (!ctx) {
        throw new Error(
            'usePassengerDashboard must be used within PassengerDashboardProvider',
        );
    }
    return ctx;
}
