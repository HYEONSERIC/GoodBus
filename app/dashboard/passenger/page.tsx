'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authAPI, chatsAPI, tripsAPI, supportAPI, reviewsAPI } from '@/lib/api';
import {
    TripReviewSection,
    type TripReviewRecord,
} from '@/components/TripReviewSection';
import { Notifications } from '@/components/Notifications';
import { ChatPanel } from '@/components/ChatPanel';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { SupportCustomerCenter } from '@/components/SupportCustomerCenter';

interface Trip {
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
    bids: Bid[];
    minBidPrice: number | null;
}

interface BidderProfile {
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
}

interface Bid {
    id: string;
    tripId: string;
    price: number;
    note?: string | null;
    status: string;
    bidder: BidderProfile;
}

interface KakaoPlace {
    id: string;
    place_name: string;
    address_name: string;
    road_address_name: string;
    x?: string;
    y?: string;
}

function toDatetimeLocalInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
}

export default function PassengerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<
        'quote' | 'booking' | 'chat' | 'support'
    >('quote');
    const [bookingSubTab, setBookingSubTab] = useState<
        'reservation' | 'completed'
    >('reservation');
    const [chatOpen, setChatOpen] = useState(false);
    /** 견적 상세에서 채팅하기로 들어왔을 때 자동 선택할 방 */
    const [chatFocusRoomId, setChatFocusRoomId] = useState<string | null>(
        null,
    );
    const [supportOpen, setSupportOpen] = useState(false);
    const [supportStep, setSupportStep] = useState<'menu' | 'form' | 'done'>(
        'menu',
    );
    const [supportCategory, setSupportCategory] = useState<
        'quote_amount' | 'reservation_progress' | 'other' | null
    >(null);
    const [supportInquiryTitle, setSupportInquiryTitle] = useState('');
    const [supportInquiryBody, setSupportInquiryBody] = useState('');
    const [supportInquirySubmitting, setSupportInquirySubmitting] =
        useState(false);
    const [supportInquiryFormError, setSupportInquiryFormError] = useState('');
    const [supportInquiryListKey, setSupportInquiryListKey] = useState(0);
    const [tripReviewsByTripId, setTripReviewsByTripId] = useState<
        Record<string, TripReviewRecord>
    >({});
    const [newTrip, setNewTrip] = useState({
        origin: '',
        originX: null as number | null,
        originY: null as number | null,
        destination: '',
        destinationX: null as number | null,
        destinationY: null as number | null,
        tripType: 'oneway' as 'oneway' | 'round',
        goingDateTime: '',
        returnDateTime: '',
        stopoverDetail: '',
        companionType: 'depart_return' as
            | 'depart_return'
            | 'with_schedule',
        itineraryDetail: '',
        servicePurpose: '',
        paymentMethod: 'cash' as 'cash' | 'card',
        additionalRequest: '',
        paxCount: 1,
        busSize: 'small',
    });
    const [stopoverOpen, setStopoverOpen] = useState(false);
    const [companionInfoOpen, setCompanionInfoOpen] = useState(false);
    const [companionInfoConfirmed, setCompanionInfoConfirmed] = useState(false);
    const goingDateTimeRef = useRef<HTMLInputElement | null>(null);
    const returnDateTimeRef = useRef<HTMLInputElement | null>(null);
    const [kakaoStatusMessage, setKakaoStatusMessage] = useState('');
    const [originResults, setOriginResults] = useState<KakaoPlace[]>([]);
    const [destinationResults, setDestinationResults] = useState<KakaoPlace[]>(
        [],
    );
    const [distanceByTripId, setDistanceByTripId] = useState<
        Record<string, number | null>
    >({});
    const [expandedTripIds, setExpandedTripIds] = useState<string[]>([]);
    const [cancelMenuTripId, setCancelMenuTripId] = useState<string | null>(null);
    const [cancelDialogTrip, setCancelDialogTrip] = useState<Trip | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const cancelReasons = ['일정 변경', '다른 전세버스 이용', '다른 교통수단 이용', '기타'];
    const [quotesExpandedTripIds, setQuotesExpandedTripIds] = useState<string[]>(
        [],
    );
    const [bidDetail, setBidDetail] = useState<{
        bid: Bid;
        bidTrip: Trip;
    } | null>(null);
    const [bidGalleryIndex, setBidGalleryIndex] = useState(0);
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
            // 현재 사용자가 만든 여행 중 취소되지 않은 것만 표시
            const myTrips = (tripData.trips || []).filter((trip: any) => {
                const tripPassengerId = trip?.passenger?.id ?? trip?.passengerId;
                return (
                    tripPassengerId === userData.user.id &&
                    trip.status !== 'cancelled'
                );
            });
            setTrips(myTrips);
            await loadTripReviews(myTrips);
        } catch (error) {
            console.error('Error loading data:', error);
            window.location.href = '/login';
        }
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

    async function createTrip() {
        try {
            if (
                !newTrip.origin.trim() ||
                !newTrip.destination.trim() ||
                (newTrip.tripType === 'oneway' && !newTrip.goingDateTime) ||
                (newTrip.tripType === 'round' &&
                    (!newTrip.goingDateTime || !newTrip.returnDateTime))
            ) {
                alert('출발지, 도착지, 날짜 및 시간을 입력해주세요');
                return;
            }

            if (
                newTrip.companionType === 'with_schedule' &&
                !newTrip.itineraryDetail.trim()
            ) {
                alert('일정 동행을 선택하신 경우 전체 일정을 입력해주세요.');
                return;
            }

            const goingAt = new Date(newTrip.goingDateTime);
            if (Number.isNaN(goingAt.getTime())) {
                alert('가는날 시간을 올바르게 입력해주세요.');
                return;
            }
            if (goingAt.getTime() < Date.now()) {
                alert(
                    '가는날 시간은 현재 시각 이후여야 합니다.\n다른 날짜·시간을 입력해 주세요.',
                );
                return;
            }
            if (newTrip.tripType === 'round') {
                const returnAt = new Date(newTrip.returnDateTime);
                if (Number.isNaN(returnAt.getTime())) {
                    alert('오는날 시간을 올바르게 입력해주세요.');
                    return;
                }
                if (returnAt.getTime() < goingAt.getTime()) {
                    alert(
                        '오는날 시간은 가는날 시간 이후여야 합니다.\n다른 날짜·시간을 입력해 주세요.',
                    );
                    return;
                }
            }

            // 왕복은 기존 DB 구조상 "편도 2개(방향 반대)"로 생성합니다.
            const goingTripPayload = {
                origin: newTrip.origin,
                originX: newTrip.originX ?? undefined,
                originY: newTrip.originY ?? undefined,
                destination: newTrip.destination,
                destinationX: newTrip.destinationX ?? undefined,
                destinationY: newTrip.destinationY ?? undefined,
                dateTime: new Date(newTrip.goingDateTime).toISOString(),
                paxCount: newTrip.paxCount,
                busSize: newTrip.busSize,
                stopoverDetail: newTrip.stopoverDetail.trim() || undefined,
                companionType: newTrip.companionType,
                itineraryDetail:
                    newTrip.companionType === 'with_schedule'
                        ? newTrip.itineraryDetail.trim()
                        : undefined,
                servicePurpose: newTrip.servicePurpose || undefined,
                paymentMethod: newTrip.paymentMethod,
                additionalRequest:
                    newTrip.additionalRequest.trim() || undefined,
            };

            if (newTrip.tripType === 'oneway') {
                await tripsAPI.create(goingTripPayload);
            } else {
                // 1) 가는 방향
                await tripsAPI.create(goingTripPayload);
                // 2) 오는 방향(원점/목적지 반전)
                await tripsAPI.create({
                    origin: newTrip.destination,
                    originX: newTrip.destinationX ?? undefined,
                    originY: newTrip.destinationY ?? undefined,
                    destination: newTrip.origin,
                    destinationX: newTrip.originX ?? undefined,
                    destinationY: newTrip.originY ?? undefined,
                    dateTime: new Date(newTrip.returnDateTime).toISOString(),
                    paxCount: newTrip.paxCount,
                    busSize: newTrip.busSize,
                    stopoverDetail: newTrip.stopoverDetail.trim() || undefined,
                    companionType: newTrip.companionType,
                    itineraryDetail:
                        newTrip.companionType === 'with_schedule'
                            ? newTrip.itineraryDetail.trim()
                            : undefined,
                    servicePurpose: newTrip.servicePurpose || undefined,
                    paymentMethod: newTrip.paymentMethod,
                    additionalRequest:
                        newTrip.additionalRequest.trim() || undefined,
                });
            }

            setOpenDialog(false);
            loadData();
        } catch (error) {
            console.error('Error creating trip:', error);
            const message =
                error instanceof Error
                    ? error.message
                    : '알 수 없는 오류가 발생했습니다.';
            alert(`여정 생성에 실패했습니다: ${message}`);
        }
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

    function searchPlaces(
        query: string,
        setResults: (data: KakaoPlace[]) => void,
    ) {
        if (!query.trim()) {
            setResults([]);
            setKakaoStatusMessage('');
            return;
        }

        setKakaoStatusMessage('검색 중...');
        fetch(`/api/kakao/places?query=${encodeURIComponent(query)}`)
            .then(async (response) => {
                if (!response.ok) {
                    const data = await response.json().catch(() => null);
                    throw new Error(data?.error || 'Kakao API error');
                }
                return response.json();
            })
            .then((data) => {
                const places = (data.places || []) as KakaoPlace[];
                setResults(places);
                if (places.length === 0) {
                    setKakaoStatusMessage('검색 결과 없음');
                } else {
                    setKakaoStatusMessage(`${places.length}건 조회됨`);
                }
            })
            .catch((error) => {
                setResults([]);
                setKakaoStatusMessage('검색 오류');
            });
    }

    async function fetchPlaceTopResult(query: string) {
        if (!query.trim()) return null;
        try {
            const response = await fetch(
                `/api/kakao/places?query=${encodeURIComponent(query)}`,
            );
            if (!response.ok) return null;
            const data = await response.json();
            const first = (data.places || [])[0] as KakaoPlace | undefined;
            if (!first?.x || !first?.y) return null;
            return { x: Number(first.x), y: Number(first.y) };
        } catch {
            return null;
        }
    }

    async function fetchDrivingDistanceKm(
        origin: { x: number; y: number },
        destination: { x: number; y: number },
    ) {
        try {
            const params = new URLSearchParams({
                originX: String(origin.x),
                originY: String(origin.y),
                destX: String(destination.x),
                destY: String(destination.y),
            });
            const response = await fetch(`/api/kakao/directions?${params}`);
            if (!response.ok) return null;
            const data = await response.json();
            const km = Number(data?.distanceKm);
            return Number.isFinite(km) ? km : null;
        } catch {
            return null;
        }
    }

    function calcDistanceKm(
        a: { x: number; y: number },
        b: { x: number; y: number },
    ) {
        const R = 6371;
        const dLat = ((b.y - a.y) * Math.PI) / 180;
        const dLon = ((b.x - a.x) * Math.PI) / 180;
        const lat1 = (a.y * Math.PI) / 180;
        const lat2 = (b.y * Math.PI) / 180;
        const sinDLat = Math.sin(dLat / 2);
        const sinDLon = Math.sin(dLon / 2);
        const aa =
            sinDLat * sinDLat +
            Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
        const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        return Math.round(R * c);
    }

    function getBusLabel(busSize: string) {
        if (busSize === 'large') return '대형버스 선호';
        if (busSize === 'medium') return '우등버스 선호';
        return '미니버스/밴 선호';
    }

    function getServicePurposeLabel(purpose?: string | null) {
        if (!purpose) return null;
        if (purpose === 'MT/학교') return '학교 행사/MT';
        return purpose;
    }

    function getRoundPartnerTrip(trip: Trip, sourceTrips: Trip[] = trips) {
        const reverseTrips = sourceTrips.filter(
            (other) =>
                other.id !== trip.id &&
                other.status === trip.status &&
                other.origin === trip.destination &&
                other.destination === trip.origin,
        );
        if (reverseTrips.length === 0) return undefined;
        const baseTime = new Date(trip.dateTime).getTime();
        return reverseTrips.sort((a, b) => {
            const aDiff = Math.abs(new Date(a.dateTime).getTime() - baseTime);
            const bDiff = Math.abs(new Date(b.dateTime).getTime() - baseTime);
            return aDiff - bDiff;
        })[0];
    }

    function getTripIdsForCancel(trip: Trip) {
        const partner = getRoundPartnerTrip(trip);
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

    function parseVehicleCountFromNote(note?: string | null) {
        if (!note) return null;
        const m = note.match(/×\s*(\d+)\s*대/);
        if (!m) return null;
        const n = Number(m[1]);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    type OpenBidRow = { bid: Bid; bidTrip: Trip; segment: string | null };

    function collectOpenBidsForCard(trip: Trip, partner?: Trip): OpenBidRow[] {
        const rows: OpenBidRow[] = [];
        if (partner) {
            for (const b of trip.bids || []) {
                if (b.status === 'open') {
                    rows.push({
                        bid: b,
                        bidTrip: trip,
                        segment: '가는편',
                    });
                }
            }
            for (const b of partner.bids || []) {
                if (b.status === 'open') {
                    rows.push({
                        bid: b,
                        bidTrip: partner,
                        segment: '오는편',
                    });
                }
            }
        } else {
            for (const b of trip.bids || []) {
                if (b.status === 'open') {
                    rows.push({
                        bid: b,
                        bidTrip: trip,
                        segment: null,
                    });
                }
            }
        }
        return rows.sort((a, b) => Number(a.bid.price) - Number(b.bid.price));
    }

    function bidderDisplayName(b: BidderProfile) {
        if (b.displayName?.trim()) return `${b.displayName.trim()} 기사님`;
        if (b.companyName?.trim()) return b.companyName.trim();
        const local = b.email?.split('@')[0] || '입찰자';
        return b.role === 'Driver' ? `${local} 기사님` : local;
    }

    function vehicleSpecLine(bidder: BidderProfile) {
        const parts = [
            bidder.busType?.trim() || null,
            bidder.busYear?.trim()
                ? `${bidder.busYear.trim()}년식`
                : null,
            bidder.capacity != null ? `${bidder.capacity}인승` : null,
        ].filter(Boolean);
        return parts.length ? parts.join(' · ') : '차량 정보 미등록';
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
            setQuotesExpandedTripIds([]);
            await loadData();
        } catch (error: unknown) {
            alert(
                error instanceof Error ? error.message : '낙찰 처리에 실패했습니다',
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
            setActiveTab('chat');
        } catch (error: unknown) {
            alert(
                error instanceof Error
                    ? error.message
                    : '채팅방을 준비하지 못했습니다.',
            );
        }
    }

    function formatTripDateLine(dateTime: string) {
        const date = new Date(dateTime);
        const md = date.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
        });
        const weekday = date.toLocaleDateString('ko-KR', {
            weekday: 'short',
        });
        return `${md} (${weekday})`;
    }

    function formatTripTime(dateTime: string) {
        return new Date(dateTime).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    }

    useEffect(() => {
        let cancelled = false;
        async function calculateDistances() {
            const results: Record<string, number | null> = {};
            const visibleTrips = trips.filter(
                (trip) => trip.status === 'open' || trip.status === 'awarded',
            );
            for (const trip of visibleTrips) {
                const originPoint =
                    typeof trip.originX === 'number' &&
                    typeof trip.originY === 'number'
                        ? { x: trip.originX, y: trip.originY }
                        : await fetchPlaceTopResult(trip.origin);
                const destinationPoint =
                    typeof trip.destinationX === 'number' &&
                    typeof trip.destinationY === 'number'
                        ? { x: trip.destinationX, y: trip.destinationY }
                        : await fetchPlaceTopResult(trip.destination);
                if (!originPoint || !destinationPoint) {
                    results[trip.id] = null;
                    continue;
                }
                const drivingKm = await fetchDrivingDistanceKm(
                    originPoint,
                    destinationPoint,
                );
                // Show only real driving distance from Kakao directions.
                // Falling back to straight-line distance can be misleading.
                results[trip.id] = drivingKm;
            }
            if (!cancelled) {
                setDistanceByTripId(results);
            }
        }
        if (
            trips.some(
                (trip) => trip.status === 'open' || trip.status === 'awarded',
            )
        ) {
            calculateDistances();
        } else {
            setDistanceByTripId({});
        }
        return () => {
            cancelled = true;
        };
    }, [trips]);

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

    const passengerReservationCardTrips = useMemo(() => {
        const sorted = [...passengerAwardedReservationTrips].sort(
            (a, b) =>
                new Date(a.dateTime).getTime() -
                new Date(b.dateTime).getTime(),
        );
        const consumed = new Set<string>();
        return sorted.filter((trip) => {
            if (consumed.has(trip.id)) return false;
            const partner = getRoundPartnerTrip(trip, sorted);
            if (partner) {
                const base =
                    new Date(trip.dateTime).getTime() <=
                    new Date(partner.dateTime).getTime()
                        ? trip
                        : partner;
                consumed.add(trip.id);
                consumed.add(partner.id);
                return trip.id === base.id;
            }
            consumed.add(trip.id);
            return true;
        });
    }, [passengerAwardedReservationTrips]);

    const passengerCompletedCardTrips = useMemo(() => {
        const sorted = [...passengerAwardedCompletedTrips].sort(
            (a, b) =>
                new Date(a.dateTime).getTime() -
                new Date(b.dateTime).getTime(),
        );
        const consumed = new Set<string>();
        return sorted.filter((trip) => {
            if (consumed.has(trip.id)) return false;
            const partner = getRoundPartnerTrip(trip, sorted);
            if (partner) {
                const base =
                    new Date(trip.dateTime).getTime() <=
                    new Date(partner.dateTime).getTime()
                        ? trip
                        : partner;
                consumed.add(trip.id);
                consumed.add(partner.id);
                return trip.id === base.id;
            }
            consumed.add(trip.id);
            return true;
        });
    }, [passengerAwardedCompletedTrips]);

    function renderPassengerAwardedBookingCard(
        trip: Trip,
        variant: 'upcoming' | 'completed',
    ) {
        const awardedBid = (trip.bids || []).find(
            (b) => b.status === 'awarded',
        );
        const bidder = awardedBid?.bidder;
        const showCancel = variant === 'upcoming' && trip.status === 'awarded';
        return (
            <Card
                key={trip.id}
                className="rounded-none border-gray-200 shadow-sm"
            >
                <CardHeader className="pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                                {getRoundPartnerTrip(trip)
                                    ? '왕복'
                                    : '편도'}
                            </span>
                            {typeof distanceByTripId[trip.id] ===
                                'number' && (
                                <span className="rounded-full border border-sky-300 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                    {distanceByTripId[trip.id]}km
                                </span>
                            )}
                        </div>
                        <CardTitle className="text-[16px] font-semibold leading-snug">
                            {trip.origin}
                        </CardTitle>
                        <CardTitle className="text-[16px] font-semibold leading-snug">
                            {trip.destination}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                출발
                            </span>
                            <span>
                                {formatTripDateLine(trip.dateTime)}{' '}
                                {formatTripTime(trip.dateTime)} 탑승
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t pt-3 text-xs">
                        <span className="rounded border px-2 py-1">
                            {trip.companionType === 'with_schedule'
                                ? '일정 동행'
                                : '출발/귀환 운송만'}
                        </span>
                        <span className="rounded border px-2 py-1">
                            {trip.paxCount}명
                        </span>
                        <span className="rounded border px-2 py-1">
                            {getBusLabel(trip.busSize)}
                        </span>
                        {getServicePurposeLabel(trip.servicePurpose) && (
                            <span className="rounded border px-2 py-1">
                                {getServicePurposeLabel(trip.servicePurpose)}
                            </span>
                        )}
                        {trip.paymentMethod && (
                            <span className="rounded border px-2 py-1">
                                {trip.paymentMethod === 'cash'
                                    ? '만나서 현금결제'
                                    : '카드결제'}
                            </span>
                        )}
                    </div>

                    <div className="rounded-md border border-sky-400 bg-sky-50/50 p-3">
                        <p className="mb-1 text-sm font-semibold text-gray-800">
                            경유지 및 세부사항
                        </p>
                        <p className="text-sm text-gray-700">
                            {trip.stopoverDetail?.trim() || '없음'}
                        </p>
                    </div>

                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-center">
                        <p className="text-lg font-semibold text-green-800">
                            {variant === 'completed'
                                ? '이용 완료'
                                : '낙찰 완료'}
                        </p>
                        {awardedBid ? (
                            <p className="mt-1 text-sm font-medium text-green-900">
                                낙찰가{' '}
                                <span className="tabular-nums">
                                    {Number(
                                        awardedBid.price,
                                    ).toLocaleString()}
                                    만원
                                </span>
                            </p>
                        ) : null}
                    </div>

                    <div className="rounded-md border bg-gray-50 px-3 py-3 text-sm">
                        <p className="font-semibold text-gray-900">
                            담당 기사 정보
                        </p>
                        <p className="mt-1 text-gray-700">
                            {bidder
                                ? bidderDisplayName(bidder)
                                : '확인 중'}
                        </p>
                        <p className="mt-0.5 text-gray-700">
                            전화번호:{' '}
                            {bidder?.phoneNumber?.trim() || '미등록'}
                        </p>
                    </div>

                    {awardedBid ? (
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <Button
                                    className="h-10 flex-1 rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-black/90"
                                    onClick={() =>
                                        openQuoteChat(trip, awardedBid)
                                    }
                                >
                                    기사와 채팅하기
                                </Button>
                                {showCancel ? (
                                    <Button
                                        type="button"
                                        className="h-10 flex-1 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                            setCancelDialogTrip(trip);
                                            setCancelReason('');
                                        }}
                                    >
                                        낙찰 취소
                                    </Button>
                                ) : null}
                            </div>
                            {variant === 'completed' ? (
                                <TripReviewSection
                                    tripId={trip.id}
                                    existing={tripReviewsByTripId[trip.id]}
                                    servicePurpose={trip.servicePurpose}
                                    onSubmitted={() => loadTripReviews(trips)}
                                    resolveImageUrl={(url) =>
                                        resolveMediaUrl(url) ?? url
                                    }
                                />
                            ) : null}
                        </div>
                    ) : (
                        showCancel && (
                            <Button
                                type="button"
                                className="h-11 w-full rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                                onClick={() => {
                                    setCancelDialogTrip(trip);
                                    setCancelReason('');
                                }}
                            >
                                낙찰 취소
                            </Button>
                        )
                    )}
                </CardContent>
            </Card>
        );
    }

    const goingScheduleMin = toDatetimeLocalInputValue(new Date());
    const returnScheduleMin =
        newTrip.goingDateTime && newTrip.goingDateTime >= goingScheduleMin
            ? newTrip.goingDateTime
            : goingScheduleMin;

    return (
        <div className="min-h-screen bg-[#f3f3f5]">
            <div className="border-b border-gray-200 bg-white/90 backdrop-blur">
                <div className="relative flex w-full items-center justify-center px-3 sm:px-4 py-4">
                    <div className="absolute left-3 sm:left-4">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-black"
                            onClick={() => setMenuOpen(true)}
                        >
                            <span className="text-base leading-none">☰</span>
                            <span>메뉴</span>
                        </button>
                    </div>
                    <span className="text-lg font-semibold">GOODBUS</span>
                    <div className="absolute right-3 sm:right-4 flex items-center gap-3">
                        <Notifications />
                    </div>
                </div>
            </div>

            {menuOpen && (
                <div className="fixed inset-0 z-40 bg-black/30">
                    <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-lg p-6 space-y-6">
                        <div>
                            <p className="text-lg font-semibold">
                                {user?.email}
                            </p>
                            <p className="text-sm text-gray-500">Passenger</p>
                        </div>
                        <div className="divide-y border-y">
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={() => {
                                    setSupportOpen(true);
                                    setSupportStep('menu');
                                    setMenuOpen(false);
                                }}
                            >
                                문의하기
                            </button>
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={handleLogout}
                            >
                                로그아웃
                            </button>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setMenuOpen(false)}
                        >
                            닫기
                        </Button>
                    </div>
                </div>
            )}

            <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] pt-5 sm:pt-6">
                {activeTab === 'quote' && (
                    <>
                        <div className="grid grid-cols-3 divide-x divide-gray-200 overflow-hidden rounded-none border border-gray-200 bg-white shadow-sm">
                            <Card className="rounded-none border-0 shadow-none gap-0 bg-white py-3">
                                <CardHeader className="px-4 pb-1 gap-1 text-center">
                                    <CardTitle className="text-sm text-gray-500 text-center">
                                        회원등급
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pt-0 text-lg font-semibold tracking-tight text-center">
                                    일반회원
                                </CardContent>
                            </Card>
                            <Card className="rounded-none border-0 shadow-none gap-0 bg-white py-3">
                                <CardHeader className="px-4 pb-1 gap-1 text-center">
                                    <CardTitle className="text-sm text-gray-500 text-center">
                                        적립금
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pt-0 text-lg font-semibold tracking-tight text-center">
                                    0원
                                </CardContent>
                            </Card>
                            <Card className="rounded-none border-0 shadow-none gap-0 bg-white py-3">
                                <CardHeader className="px-4 pb-1 gap-1 text-center">
                                    <CardTitle className="text-sm text-gray-500 text-center">
                                        추천 혜택
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pt-0 text-lg font-semibold tracking-tight text-center">
                                    월 100만원
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="rounded-none border-gray-200 shadow-sm">
                            <CardHeader className="pb-3 text-center">
                                <CardTitle className="text-[17px] font-semibold tracking-tight">
                                    굿버스에서 가격비교 하고 적립금도 받아가세요.
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    원하는 여정을 등록하면 기사/업체가 입찰을
                                    제안합니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <Button
                                    onClick={() => setOpenDialog(true)}
                                    className="h-10 rounded-xl bg-black px-6 text-sm font-medium text-white hover:bg-black/90"
                                >
                                    견적 등록하기
                                </Button>
                            </CardContent>
                        </Card>
                    </>
                )}

                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogContent className="flex max-h-[min(92vh,760px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border border-gray-300 bg-white p-0 sm:max-w-lg [&>button]:top-3 [&>button]:right-4">
                        <DialogHeader className="sr-only">
                            <DialogTitle>여정 만들기</DialogTitle>
                            <DialogDescription>
                                여정 정보를 입력하세요
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3">
                            <button
                                type="button"
                                onClick={() => setOpenDialog(false)}
                                className="min-w-[4rem] text-left text-sm text-gray-700 hover:text-black"
                            >
                                &lt; 이전
                            </button>
                            <span className="text-base font-semibold">
                                견적 신청
                            </span>
                            <span className="min-w-[4rem]" />
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="scrollbar-none min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-24 pt-4">
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>출발지</Label>
                                <Input
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 shadow-none focus-visible:border-gray-500 focus-visible:ring-0"
                                    placeholder="출발지를 입력하세요"
                                    value={newTrip.origin}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setNewTrip({
                                            ...newTrip,
                                            origin: value,
                                            originX: null,
                                            originY: null,
                                        });
                                        searchPlaces(value, setOriginResults);
                                    }}
                                />
                                {originResults.length > 0 && (
                                    <div className="mt-2 border rounded-md bg-white shadow-sm">
                                        {originResults.map((place) => (
                                            <button
                                                key={place.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                                onClick={() => {
                                                    const x = Number(place.x);
                                                    const y = Number(place.y);
                                                    setNewTrip({
                                                        ...newTrip,
                                                        origin:
                                                            place.road_address_name ||
                                                            place.address_name ||
                                                            place.place_name,
                                                        originX: Number.isFinite(x)
                                                            ? x
                                                            : null,
                                                        originY: Number.isFinite(y)
                                                            ? y
                                                            : null,
                                                    });
                                                    setOriginResults([]);
                                                }}
                                            >
                                                <div className="font-medium">
                                                    {place.place_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {place.road_address_name ||
                                                        place.address_name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>도착지</Label>
                                <Input
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 shadow-none focus-visible:border-gray-500 focus-visible:ring-0"
                                    placeholder="도착지를 입력하세요"
                                    value={newTrip.destination}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setNewTrip({
                                            ...newTrip,
                                            destination: value,
                                            destinationX: null,
                                            destinationY: null,
                                        });
                                        searchPlaces(
                                            value,
                                            setDestinationResults,
                                        );
                                    }}
                                />
                                {destinationResults.length > 0 && (
                                    <div className="mt-2 border rounded-md bg-white shadow-sm">
                                        {destinationResults.map((place) => (
                                            <button
                                                key={place.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                                onClick={() => {
                                                    const x = Number(place.x);
                                                    const y = Number(place.y);
                                                    setNewTrip({
                                                        ...newTrip,
                                                        destination:
                                                            place.road_address_name ||
                                                            place.address_name ||
                                                            place.place_name,
                                                        destinationX:
                                                            Number.isFinite(x)
                                                                ? x
                                                                : null,
                                                        destinationY:
                                                            Number.isFinite(y)
                                                                ? y
                                                                : null,
                                                    });
                                                    setDestinationResults([]);
                                                }}
                                            >
                                                <div className="font-medium">
                                                    {place.place_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {place.road_address_name ||
                                                        place.address_name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>날짜 및 시간</Label>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>운행 방식</Label>
                                        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-gray-300">
                                            <button
                                                type="button"
                                                className={`h-11 border-r border-gray-300 px-4 text-sm font-semibold transition ${
                                                    newTrip.tripType ===
                                                    'oneway'
                                                        ? 'bg-gray-200 text-gray-900'
                                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                                }`}
                                                onClick={() =>
                                                    setNewTrip({
                                                        ...newTrip,
                                                        tripType: 'oneway',
                                                    })
                                                }
                                            >
                                                편도
                                            </button>
                                            <button
                                                type="button"
                                                className={`h-11 px-4 text-sm font-semibold transition ${
                                                    newTrip.tripType ===
                                                    'round'
                                                        ? 'bg-gray-200 text-gray-900'
                                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                                }`}
                                                onClick={() =>
                                                    setNewTrip({
                                                        ...newTrip,
                                                        tripType: 'round',
                                                    })
                                                }
                                            >
                                                왕복
                                            </button>
                                        </div>
                                    </div>

                                    {newTrip.tripType === 'oneway' ? (
                                        <div className="space-y-2">
                                            <Label>가는날 시간</Label>
                                            <div className="relative">
                                                <Input
                                                    ref={goingDateTimeRef}
                                                    type="datetime-local"
                                                    min={goingScheduleMin}
                                                    value={newTrip.goingDateTime}
                                                    className={`peer h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 pr-10 text-sm shadow-none focus-visible:border-gray-500 focus-visible:ring-0 ${
                                                        !newTrip.goingDateTime
                                                            ? 'text-transparent'
                                                            : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (
                                                            goingDateTimeRef
                                                                .current
                                                                ?.showPicker
                                                        ) {
                                                            goingDateTimeRef.current.showPicker();
                                                            return;
                                                        }
                                                        goingDateTimeRef.current?.focus();
                                                    }}
                                                    onChange={(e) =>
                                                        setNewTrip({
                                                            ...newTrip,
                                                            goingDateTime:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                                {!newTrip.goingDateTime && (
                                                    <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-sm text-gray-500 peer-focus:hidden">
                                                        날짜를 선택하세요
                                                    </span>
                                                )}
                                            </div>

                                            {/* 편도일 때 경유지 버튼 */}
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    className="inline-flex h-7 items-center gap-1.5 px-0 text-xs font-medium text-gray-700 transition hover:text-black"
                                                    onClick={() => {
                                                        if (!stopoverOpen) {
                                                            setStopoverOpen(
                                                                true,
                                                            );
                                                            return;
                                                        }
                                                        setStopoverOpen(false);
                                                        setNewTrip({
                                                            ...newTrip,
                                                            stopoverDetail: '',
                                                        });
                                                    }}
                                                >
                                                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-current text-[11px] leading-none">
                                                        {stopoverOpen
                                                            ? '−'
                                                            : '+'}
                                                    </span>
                                                    <span>
                                                        {stopoverOpen
                                                            ? '경유지 삭제'
                                                            : '경유지 추가'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <Label>가는날 시간</Label>
                                                <div className="relative">
                                                    <Input
                                                        ref={goingDateTimeRef}
                                                        type="datetime-local"
                                                        min={goingScheduleMin}
                                                        value={newTrip.goingDateTime}
                                                        className={`peer h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 pr-10 text-sm shadow-none focus-visible:border-gray-500 focus-visible:ring-0 ${
                                                            !newTrip.goingDateTime
                                                                ? 'text-transparent'
                                                                : ''
                                                        }`}
                                                        onClick={() => {
                                                            if (
                                                                goingDateTimeRef
                                                                    .current
                                                                    ?.showPicker
                                                            ) {
                                                                goingDateTimeRef.current.showPicker();
                                                                return;
                                                            }
                                                            goingDateTimeRef.current?.focus();
                                                        }}
                                                        onChange={(e) =>
                                                            setNewTrip({
                                                                ...newTrip,
                                                                goingDateTime:
                                                                    e.target.value,
                                                            })
                                                        }
                                                    />
                                                    {!newTrip.goingDateTime && (
                                                        <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-sm text-gray-500 peer-focus:hidden">
                                                            날짜를 선택하세요
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>오는날 시간</Label>
                                                <div className="relative">
                                                    <Input
                                                        ref={returnDateTimeRef}
                                                        type="datetime-local"
                                                        min={returnScheduleMin}
                                                        value={newTrip.returnDateTime}
                                                        className={`peer h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 pr-10 text-sm shadow-none focus-visible:border-gray-500 focus-visible:ring-0 ${
                                                            !newTrip.returnDateTime
                                                                ? 'text-transparent'
                                                                : ''
                                                        }`}
                                                        onClick={() => {
                                                            if (
                                                                returnDateTimeRef
                                                                    .current
                                                                    ?.showPicker
                                                            ) {
                                                                returnDateTimeRef.current.showPicker();
                                                                return;
                                                            }
                                                            returnDateTimeRef.current?.focus();
                                                        }}
                                                        onChange={(e) =>
                                                            setNewTrip({
                                                                ...newTrip,
                                                                returnDateTime:
                                                                    e.target.value,
                                                            })
                                                        }
                                                    />
                                                    {!newTrip.returnDateTime && (
                                                        <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-sm text-gray-500 peer-focus:hidden">
                                                            날짜를 선택하세요
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 왕복일 때 경유지 버튼 */}
                                                <div className="pt-1">
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-7 items-center gap-1.5 px-0 text-xs font-medium text-gray-700 transition hover:text-black"
                                                        onClick={() => {
                                                            if (
                                                                !stopoverOpen
                                                            ) {
                                                                setStopoverOpen(
                                                                    true,
                                                                );
                                                                return;
                                                            }
                                                            setStopoverOpen(
                                                                false,
                                                            );
                                                            setNewTrip({
                                                                ...newTrip,
                                                                stopoverDetail:
                                                                    '',
                                                            });
                                                        }}
                                                    >
                                                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-current text-[11px] leading-none">
                                                            {stopoverOpen
                                                                ? '−'
                                                                : '+'}
                                                        </span>
                                                        <span>
                                                            {stopoverOpen
                                                                ? '경유지 삭제'
                                                                : '경유지 추가'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {stopoverOpen && (
                                <div className="space-y-2 py-1">
                                    <Label className="text-sm font-semibold text-gray-900">
                                        경유지 상세
                                    </Label>
                                    <Textarea
                                        rows={3}
                                        className="rounded-md border border-gray-200 px-4 py-3 text-sm shadow-sm focus-visible:border-gray-300 focus-visible:ring-0"
                                        value={newTrip.stopoverDetail}
                                        onChange={(e) =>
                                            setNewTrip({
                                                ...newTrip,
                                                stopoverDetail:
                                                    e.target.value,
                                            })
                                        }
                                        placeholder="모든 경유지를 구체적으로 적어주세요."
                                    />
                                </div>
                            )}

                            {/* 결제 방식 + 버스 선택 + 추가 사항 */}
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>결제 방식</Label>
                                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-gray-300">
                                    <button
                                        type="button"
                                        className={`h-11 border-r border-gray-300 px-4 text-sm font-semibold transition ${
                                            newTrip.paymentMethod === 'cash'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                paymentMethod: 'cash',
                                            })
                                        }
                                    >
                                        현금
                                    </button>
                                    <button
                                        type="button"
                                        className={`h-11 px-4 text-sm font-semibold transition ${
                                            newTrip.paymentMethod === 'card'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                paymentMethod: 'card',
                                            })
                                        }
                                    >
                                        카드
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>버스 선택</Label>
                                <div className="grid grid-cols-3 overflow-hidden rounded-md border border-gray-300">
                                    <button
                                        type="button"
                                        className={`border-r border-gray-300 px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'large'
                                                ? 'bg-gray-200'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                busSize: 'large',
                                            })
                                        }
                                    >
                                        대형버스
                                        <div className="mt-1 text-xs font-normal text-gray-500">
                                            (45인승)
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`border-r border-gray-300 px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'medium'
                                                ? 'bg-gray-200'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                busSize: 'medium',
                                            })
                                        }
                                    >
                                        우등버스
                                        <div className="mt-1 text-xs font-normal text-gray-500">
                                            (28인승)
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'small'
                                                ? 'bg-gray-200'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                busSize: 'small',
                                            })
                                        }
                                    >
                                        미니버스·밴
                                        <div className="mt-1 text-xs font-normal text-gray-500">
                                            (14인승)
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 border-b border-gray-100 pb-4">
                                <Label>추가 사항</Label>
                                <Textarea
                                    value={newTrip.additionalRequest}
                                    onChange={(e) =>
                                        setNewTrip({
                                            ...newTrip,
                                            additionalRequest: e.target.value,
                                        })
                                    }
                                    placeholder="예) 정차 요청, 짐 위치, 시간 조율 등 추가로 남길 사항을 입력해주세요."
                                />
                            </div>

                            {/* 기사님 동행 여부 */}
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>기사님 동행 여부</Label>
                                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-gray-300">
                                    <button
                                        type="button"
                                        className={`h-11 border-r border-gray-300 px-4 text-sm font-semibold transition ${
                                            newTrip.companionType ===
                                            'depart_return'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                        onClick={() => {
                                            setNewTrip({
                                                ...newTrip,
                                                companionType: 'depart_return',
                                                itineraryDetail: '',
                                            });
                                            setCompanionInfoConfirmed(false);
                                        }}
                                    >
                                        출발, 귀환만
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition ${
                                            newTrip.companionType ===
                                            'with_schedule'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                        onClick={() => {
                                            setNewTrip({
                                                ...newTrip,
                                                companionType: 'with_schedule',
                                            });
                                            setCompanionInfoConfirmed(false);
                                            setCompanionInfoOpen(true);
                                        }}
                                    >
                                        일정 동행
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px] leading-none">
                                            ?
                                        </span>
                                    </button>
                                </div>

                                {newTrip.companionType === 'with_schedule' &&
                                    companionInfoConfirmed && (
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-700">
                                                일정 동행을 선택하셨습니다. 기사님이
                                                함께할 수 있도록 전체 일정을 구체적으로
                                                적어주세요.
                                            </p>
                                            <Textarea
                                                value={newTrip.itineraryDetail}
                                                onChange={(e) =>
                                                    setNewTrip({
                                                        ...newTrip,
                                                        itineraryDetail:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="전체적인 일정(이동 경로/시간/요청사항)을 적어주세요."
                                            />
                                        </div>
                                    )}
                            </div>

                            {/* 서비스 목적 */}
                            <div className="space-y-2 border-b border-gray-100 pb-4">
                                <Label>어떤 목적으로 서비스를 이용하세요?</Label>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    {[
                                        '결혼식',
                                        '워크샵',
                                        '산학회',
                                        'MT/학교',
                                        '콘서트',
                                        '골프',
                                        '낚시',
                                        '통근/셔틀',
                                        '어린이집',
                                        '기타',
                                    ].map((purpose) => (
                                        <button
                                            key={purpose}
                                            type="button"
                                            onClick={() =>
                                                setNewTrip({
                                                    ...newTrip,
                                                    servicePurpose: purpose,
                                                })
                                            }
                                            className={`rounded-lg border px-3 py-4 text-sm font-semibold transition ${
                                                newTrip.servicePurpose ===
                                                purpose
                                                    ? 'border-gray-400 bg-gray-100'
                                                    : 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        >
                                            {purpose}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pb-2">
                                <Label>승객 수</Label>
                                <Input
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 shadow-none focus-visible:border-gray-500 focus-visible:ring-0"
                                    type="number"
                                    value={newTrip.paxCount}
                                    min={1}
                                    onChange={(e) =>
                                        setNewTrip({
                                            ...newTrip,
                                            paxCount: (() => {
                                                const raw = e.target.value;
                                                const n = Number(raw);
                                                if (!raw) return 1;
                                                return Number.isFinite(n) &&
                                                    n >= 1
                                                    ? Math.floor(n)
                                                    : 1;
                                            })(),
                                        })
                                    }
                                />
                            </div>
                            </div>

                            <div className="flex shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                                <Button
                                    type="button"
                                    onClick={createTrip}
                                    className="h-11 w-full rounded-md bg-[#e08030] text-sm font-semibold text-white hover:bg-[#d07526]"
                                >
                                    견적 등록하기
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* 기사님 동행 안내(확인 누르면 전체 일정 입력 노출) */}
                <Dialog
                    open={companionInfoOpen}
                    onOpenChange={setCompanionInfoOpen}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>기사님 동행 여부?</DialogTitle>
                            <DialogDescription className="text-sm">
                                '출발, 귀환만 운송'은 목적지까지 왕복
                                수송만 하는 운행이고, '일정 동행'은 수학여행
                                처럼 승객님의 일정에 따라 기사님이 계속
                                동행해서 함께하는 운행입니다.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 text-sm text-gray-700">
                            <p>
                                (일정 동행은 상세 일정 전제이며, 정량화된
                                견적을 바탕으로 진행될 수 있습니다.)
                            </p>
                        </div>

                        <Button
                            className="mt-4 h-11 w-full bg-[#e08030] hover:bg-[#d07526]"
                            onClick={() => {
                                setCompanionInfoOpen(false);
                                setCompanionInfoConfirmed(true);
                            }}
                        >
                            확인
                        </Button>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={Boolean(bidDetail)}
                    onOpenChange={(open) => {
                        if (!open) setBidDetail(null);
                    }}
                >
                    <DialogContent className="scrollbar-none max-h-[min(92vh,720px)] w-[calc(100vw-1.25rem)] max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg">
                        {bidDetail &&
                            (() => {
                                const { bid, bidTrip } = bidDetail;
                                const bidder = bid.bidder;
                                const galleryUrls = (
                                    bidder.vehicleImageUrls || []
                                )
                                    .map((u) => resolveMediaUrl(u))
                                    .filter(Boolean) as string[];
                                const fallbackProfile = resolveMediaUrl(
                                    bidder.profileImageUrl,
                                );
                                const showImg =
                                    galleryUrls[bidGalleryIndex] ||
                                    fallbackProfile;
                                const imgCount = Math.max(
                                    galleryUrls.length,
                                    showImg ? 1 : 0,
                                );
                                const units = parseVehicleCountFromNote(
                                    bid.note,
                                );
                                const priceText = `${Number(
                                    bid.price,
                                ).toLocaleString()}만원${units ? ` (${units}대)` : ''}`;
                                return (
                                    <>
                                        <DialogHeader className="sr-only">
                                            <DialogTitle>
                                                견적 상세
                                            </DialogTitle>
                                            <DialogDescription>
                                                입찰자 프로필 및 제안 내용입니다.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="relative bg-gray-900">
                                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-200">
                                                {showImg ? (
                                                    <img
                                                        src={showImg}
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex size-full items-center justify-center text-sm text-gray-500">
                                                        등록된 차량 사진이 없습니다
                                                    </div>
                                                )}
                                                {imgCount > 1 && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-white"
                                                            onClick={() =>
                                                                setBidGalleryIndex(
                                                                    (i) =>
                                                                        (i -
                                                                            1 +
                                                                            imgCount) %
                                                                        imgCount,
                                                                )
                                                            }
                                                        >
                                                            ‹
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-white"
                                                            onClick={() =>
                                                                setBidGalleryIndex(
                                                                    (i) =>
                                                                        (i + 1) %
                                                                        imgCount,
                                                                )
                                                            }
                                                        >
                                                            ›
                                                        </button>
                                                        <span className="absolute bottom-3 right-3 rounded bg-black/55 px-2 py-0.5 text-xs text-white">
                                                            {bidGalleryIndex + 1} /{' '}
                                                            {imgCount}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="relative flex flex-col items-center border-b border-gray-200 bg-white pb-4 pt-10">
                                                <div className="absolute -top-9 left-1/2 size-20 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow">
                                                    {fallbackProfile ? (
                                                        <img
                                                            src={fallbackProfile}
                                                            alt=""
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-full items-center justify-center text-xs text-gray-400">
                                                            프로필
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-lg font-bold">
                                                    {bidderDisplayName(bidder)}
                                                </p>
                                                <p className="mt-1 text-sm text-amber-600">
                                                    ⭐ 준비중 (0.0)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-px border-b border-gray-200 bg-gray-100">
                                            <div className="bg-white p-3 text-center">
                                                <p className="text-[11px] text-gray-400">
                                                    차종
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-gray-900">
                                                    {bidder.busType?.trim() ||
                                                        '—'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 text-center">
                                                <p className="text-[11px] text-gray-400">
                                                    연식
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-gray-900">
                                                    {bidder.busYear?.trim()
                                                        ? `${bidder.busYear}년식`
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 text-center">
                                                <p className="text-[11px] text-gray-400">
                                                    서류
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-gray-900">
                                                    {verificationLabel(bidder)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 p-4">
                                            {bidder.driverComment?.trim() && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-700">
                                                        기사님의 한마디
                                                    </p>
                                                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                                                        {bidder.driverComment}
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs font-semibold text-gray-700">
                                                    제안 견적
                                                </p>
                                                <p className="mt-1 text-xl font-bold tracking-tight">
                                                    {priceText}
                                                </p>
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    세금·수수료 포함 여부는 현장
                                                    협의 전제입니다.
                                                </p>
                                            </div>
                                            {bid.note?.trim() && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-700">
                                                        상세 제안
                                                    </p>
                                                    <p className="mt-1 whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                                                        {bid.note}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {((bidTrip.status === 'open' &&
                                            bid.status === 'open') ||
                                            (bidTrip.status === 'awarded' &&
                                                bid.status === 'awarded')) && (
                                                <div className="sticky bottom-0 flex gap-2 border-t border-gray-200 bg-white p-4">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className={`h-11 shrink-0 rounded-lg border-gray-300 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-100 ${
                                                            !(
                                                                bidTrip.status ===
                                                                    'open' &&
                                                                bid.status ===
                                                                    'open'
                                                            )
                                                                ? 'w-full'
                                                                : ''
                                                        }`}
                                                        onClick={() =>
                                                            openQuoteChat(
                                                                bidTrip,
                                                                bid,
                                                            )
                                                        }
                                                    >
                                                        채팅하기
                                                    </Button>
                                                    {bidTrip.status ===
                                                        'open' &&
                                                        bid.status ===
                                                            'open' && (
                                                            <Button
                                                                type="button"
                                                                className="h-11 min-w-0 flex-1 rounded-lg bg-[#ffcd00] text-sm font-semibold text-black hover:bg-[#f0c200]"
                                                                onClick={() =>
                                                                    awardSelectedBid(
                                                                        bidTrip.id,
                                                                        bid.id,
                                                                    )
                                                                }
                                                            >
                                                                이 견적으로
                                                                낙찰하기
                                                            </Button>
                                                        )}
                                                </div>
                                            )}
                                    </>
                                );
                            })()}
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={Boolean(cancelDialogTrip)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setCancelDialogTrip(null);
                            setCancelReason('');
                        }
                    }}
                >
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-center text-2xl font-semibold">
                                취소 사유를 선택하세요
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            {cancelReasons.map((reason) => (
                                <label
                                    key={reason}
                                    className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 hover:bg-gray-50"
                                >
                                    <input
                                        type="radio"
                                        name="cancelReason"
                                        value={reason}
                                        checked={cancelReason === reason}
                                        onChange={(e) =>
                                            setCancelReason(e.target.value)
                                        }
                                        className="h-5 w-5"
                                    />
                                    <span className="text-base text-gray-700">
                                        {reason}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 overflow-hidden rounded-md border">
                            <button
                                type="button"
                                className="h-12 bg-gray-100 text-base text-gray-700"
                                onClick={() => {
                                    setCancelDialogTrip(null);
                                    setCancelReason('');
                                }}
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                className="h-12 bg-yellow-400 text-base font-semibold text-gray-900"
                                onClick={() => {
                                    if (!cancelDialogTrip) return;
                                    cancelTripWithReason(
                                        getTripIdsForCancel(cancelDialogTrip),
                                        cancelReason,
                                    );
                                }}
                            >
                                주문 취소
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                {activeTab === 'quote' && (
                    <div className="grid gap-4 w-full max-w-xl mx-auto">
                        {(() => {
                            const consumed = new Set<string>();
                            const nowMs = Date.now();
                            const quoteTrips = trips
                                .filter(
                                    (t) =>
                                        t.status === 'open' &&
                                        new Date(t.dateTime).getTime() >=
                                            nowMs,
                                )
                                .sort(
                                    (a, b) =>
                                        new Date(a.dateTime).getTime() -
                                        new Date(b.dateTime).getTime(),
                                );
                            if (quoteTrips.length === 0) {
                                return (
                                    <Card className="rounded-none">
                                        <CardContent className="p-6 text-sm text-gray-600">
                                            등록된 견적이 없습니다. 상단의
                                            &apos;견적 신청&apos;으로 새 여정을
                                            등록해 주세요.
                                        </CardContent>
                                    </Card>
                                );
                            }
                            return quoteTrips
                                .filter((trip) => {
                                    if (consumed.has(trip.id)) return false;
                                    const partner = getRoundPartnerTrip(trip, quoteTrips);
                                    if (partner) {
                                        const base =
                                            new Date(trip.dateTime).getTime() <=
                                            new Date(partner.dateTime).getTime()
                                                ? trip
                                                : partner;
                                        const other =
                                            base.id === trip.id ? partner : trip;
                                        consumed.add(base.id);
                                        consumed.add(other.id);
                                        return trip.id === base.id;
                                    }
                                    consumed.add(trip.id);
                                    return true;
                                })
                                .map((trip) => {
                                    const partner = getRoundPartnerTrip(trip, quoteTrips);
                                    const isRound = Boolean(partner);
                                    const expanded = expandedTripIds.includes(
                                        trip.id,
                                    );
                                    const openBidRows = collectOpenBidsForCard(
                                        trip,
                                        partner,
                                    );
                                    const openBidCount = openBidRows.length;
                                    const awardedBidQuote = (
                                        trip.bids || []
                                    ).find((b) => b.status === 'awarded');
                                    const quotesExpanded =
                                        quotesExpandedTripIds.includes(
                                            trip.id,
                                        );
                                    const distance =
                                        distanceByTripId[trip.id] ?? null;
                                    return (
                                        <Card
                                            key={trip.id}
                                            className="rounded-none border-gray-200 shadow-sm"
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                                                                {isRound
                                                                    ? '왕복'
                                                                    : '편도'}
                                                            </span>
                                                            {typeof distance ===
                                                                'number' && (
                                                                <span className="rounded-full border border-sky-300 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                                                    {distance}km
                                                                </span>
                                                            )}
                                                        </div>
                                                        <CardTitle className="text-[16px] font-semibold leading-snug">
                                                            {trip.origin}
                                                        </CardTitle>
                                                        <CardTitle className="text-[16px] font-semibold leading-snug">
                                                            {
                                                                trip.destination
                                                            }
                                                        </CardTitle>
                                                    </div>
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            className="px-2 py-1 text-xl leading-none text-gray-500 hover:text-black"
                                                            onClick={() =>
                                                                setCancelMenuTripId(
                                                                    (prev) =>
                                                                        prev ===
                                                                        trip.id
                                                                            ? null
                                                                            : trip.id,
                                                                )
                                                            }
                                                        >
                                                            ⋮
                                                        </button>
                                                        {cancelMenuTripId ===
                                                            trip.id && (
                                                            <div className="absolute right-0 top-9 z-20 min-w-[130px] rounded-md border bg-white p-1 shadow-lg">
                                                                <button
                                                                    type="button"
                                                                    className="w-full rounded px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                                                                    onClick={() => {
                                                                        setCancelDialogTrip(
                                                                            trip,
                                                                        );
                                                                        setCancelReason(
                                                                            '',
                                                                        );
                                                                        setCancelMenuTripId(
                                                                            null,
                                                                        );
                                                                    }}
                                                                >
                                                                    주문 취소
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3 text-sm text-gray-700">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                            출발
                                                        </span>
                                                        <span>
                                                            {formatTripDateLine(
                                                                trip.dateTime,
                                                            )}{' '}
                                                            {formatTripTime(
                                                                trip.dateTime,
                                                            )}{' '}
                                                            탑승
                                                        </span>
                                                    </div>
                                                    {isRound && partner && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                                귀환
                                                            </span>
                                                            <span>
                                                                {formatTripDateLine(
                                                                    partner.dateTime,
                                                                )}{' '}
                                                                {formatTripTime(
                                                                    partner.dateTime,
                                                                )}{' '}
                                                                탑승
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {expanded && (
                                                    <div className="space-y-3 border-t pt-3">
                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            <span className="rounded border px-2 py-1">
                                                                {isRound
                                                                    ? '1박2일'
                                                                    : '당일'}
                                                            </span>
                                                            <span className="rounded border px-2 py-1">
                                                                {trip.companionType ===
                                                                'with_schedule'
                                                                    ? '일정 동행'
                                                                    : '출발/귀환 운송만'}
                                                            </span>
                                                            <span className="rounded border px-2 py-1">
                                                                {trip.paxCount}명
                                                            </span>
                                                            <span className="rounded border px-2 py-1">
                                                                {getBusLabel(
                                                                    trip.busSize,
                                                                )}
                                                            </span>
                                                            {getServicePurposeLabel(
                                                                trip.servicePurpose,
                                                            ) && (
                                                                <span className="rounded border px-2 py-1">
                                                                    {
                                                                        getServicePurposeLabel(
                                                                            trip.servicePurpose,
                                                                        )!
                                                                    }
                                                                </span>
                                                            )}
                                                            {trip.paymentMethod && (
                                                                <span className="rounded border px-2 py-1">
                                                                    {trip.paymentMethod ===
                                                                    'cash'
                                                                        ? '만나서 현금결제'
                                                                        : '카드결제'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="rounded-md border border-sky-400 bg-sky-50/50 p-3">
                                                            <p className="mb-1 text-sm font-semibold text-gray-800">
                                                                경유지 및 세부사항
                                                            </p>
                                                            <p className="text-sm text-gray-700">
                                                                {trip.stopoverDetail?.trim() ||
                                                                    '없음'}
                                                            </p>
                                                        </div>
                                                        {trip.additionalRequest && (
                                                            <div className="rounded-md border p-3">
                                                                <p className="mb-1 text-sm font-semibold text-gray-800">
                                                                    추가 사항
                                                                </p>
                                                                <p className="text-sm text-gray-700">
                                                                    {
                                                                        trip.additionalRequest
                                                                    }
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    className="mx-auto block text-sm text-gray-500 hover:text-gray-800"
                                                    onClick={() =>
                                                        toggleTripDetail(
                                                            trip.id,
                                                        )
                                                    }
                                                >
                                                    {expanded
                                                        ? '간단히 ▲'
                                                        : '자세히 ▼'}
                                                </button>

                                                <div className="border-t pt-4">
                                                    {trip.status ===
                                                        'awarded' && (
                                                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-center">
                                                            <p className="text-lg font-semibold text-green-800">
                                                                낙찰 완료
                                                            </p>
                                                            {awardedBidQuote ? (
                                                                <p className="mt-1 text-sm font-medium text-green-900">
                                                                    낙찰가{' '}
                                                                    <span className="tabular-nums">
                                                                        {Number(
                                                                            awardedBidQuote.price,
                                                                        ).toLocaleString()}
                                                                        만원
                                                                    </span>
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                    {trip.status === 'open' &&
                                                        openBidCount === 0 && (
                                                            <div className="text-center">
                                                                <p className="text-xl font-semibold text-gray-800 sm:text-2xl">
                                                                    견적을 받는
                                                                    중입니다.
                                                                </p>
                                                                <p className="mt-1 text-sm text-gray-600">
                                                                    기사님들이
                                                                    견적을
                                                                    올리면 확인할
                                                                    수 있어요.
                                                                </p>
                                                            </div>
                                                        )}
                                                    {trip.status === 'open' &&
                                                        openBidCount > 0 && (
                                                            <div className="space-y-3">
                                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-base font-semibold text-gray-900">
                                                                            들어온
                                                                            입찰{' '}
                                                                            <span className="text-blue-600">
                                                                                {
                                                                                    openBidCount
                                                                                }
                                                                            </span>
                                                                            건
                                                                        </p>
                                                                        <p className="mt-0.5 text-xs text-gray-500">
                                                                            최저
                                                                            제시가
                                                                            순으로
                                                                            표시합니다.
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        className="shrink-0 rounded-lg border-gray-900 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                                                                        onClick={() =>
                                                                            toggleQuotesTrip(
                                                                                trip.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        견적
                                                                        보기
                                                                        {quotesExpanded
                                                                            ? ' ▲'
                                                                            : ' ▼'}
                                                                    </Button>
                                                                </div>
                                                                {quotesExpanded && (
                                                                    <div className="space-y-2">
                                                                        {openBidRows.map(
                                                                            ({
                                                                                bid,
                                                                                bidTrip,
                                                                                segment,
                                                                            }) => {
                                                                                const bidder =
                                                                                    bid.bidder;
                                                                                const thumb =
                                                                                    resolveMediaUrl(
                                                                                        bidder
                                                                                            .vehicleImageUrls?.[0],
                                                                                    ) ||
                                                                                    resolveMediaUrl(
                                                                                        bidder.profileImageUrl,
                                                                                    );
                                                                                const units =
                                                                                    parseVehicleCountFromNote(
                                                                                        bid.note,
                                                                                    );
                                                                                const priceLine =
                                                                                    Number.isFinite(
                                                                                        Number(
                                                                                            bid.price,
                                                                                        ),
                                                                                    )
                                                                                        ? `${Number(
                                                                                              bid.price,
                                                                                          ).toLocaleString()}만원${units ? ` (${units}대)` : ''}`
                                                                                        : `${bid.price}만원`;
                                                                                return (
                                                                                    <button
                                                                                        key={
                                                                                            bid.id
                                                                                        }
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            setBidDetail(
                                                                                                {
                                                                                                    bid,
                                                                                                    bidTrip,
                                                                                                },
                                                                                            )
                                                                                        }
                                                                                        className="flex w-full items-stretch gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                                                                                    >
                                                                                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                                                            {thumb ? (
                                                                                                <img
                                                                                                    src={
                                                                                                        thumb
                                                                                                    }
                                                                                                    alt=""
                                                                                                    className="size-full object-cover"
                                                                                                />
                                                                                            ) : (
                                                                                                <div className="flex size-full items-center justify-center text-xs text-gray-400">
                                                                                                    사진
                                                                                                    없음
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <div className="flex items-start justify-between gap-2">
                                                                                                <p className="truncate text-[15px] font-bold text-gray-900">
                                                                                                    {bidderDisplayName(
                                                                                                        bidder,
                                                                                                    )}
                                                                                                </p>
                                                                                                <p className="shrink-0 text-[15px] font-bold tabular-nums text-gray-900">
                                                                                                    {
                                                                                                        priceLine
                                                                                                    }
                                                                                                </p>
                                                                                            </div>
                                                                                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                                                                                {vehicleSpecLine(
                                                                                                    bidder,
                                                                                                )}
                                                                                            </p>
                                                                                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                                                                                <span className="text-[11px] text-gray-400">
                                                                                                    ⭐
                                                                                                    준비중
                                                                                                    · 후기
                                                                                                    준비중
                                                                                                </span>
                                                                                                {segment && (
                                                                                                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                                                                                                        {
                                                                                                            segment
                                                                                                        }
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </button>
                                                                                );
                                                                            },
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                </div>

                                            </CardContent>
                                        </Card>
                                    );
                                });
                        })()}
                    </div>
                )}

                {activeTab === 'booking' && (
                    <div className="mx-auto w-full max-w-xl">
                        <div className="mb-4 grid grid-cols-2 border-b border-gray-200 bg-white shadow-sm">
                            <button
                                type="button"
                                onClick={() => setBookingSubTab('reservation')}
                                className={`border-b-2 py-3 text-center text-sm transition-colors ${
                                    bookingSubTab === 'reservation'
                                        ? 'border-gray-900 font-semibold text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                예약주문
                            </button>
                            <button
                                type="button"
                                onClick={() => setBookingSubTab('completed')}
                                className={`border-b-2 py-3 text-center text-sm transition-colors ${
                                    bookingSubTab === 'completed'
                                        ? 'border-gray-900 font-semibold text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                운행완료
                            </button>
                        </div>

                        {bookingSubTab === 'reservation' && (
                            <>
                                <p className="mb-2 text-left text-sm text-gray-500">
                                    낙찰완료 (
                                    {passengerReservationCardTrips.length})
                                </p>
                                <div className="grid gap-4">
                                    {passengerReservationCardTrips.length ===
                                    0 ? (
                                        <Card className="rounded-none">
                                            <CardContent className="p-6 text-sm text-gray-600">
                                                예정된 낙찰 여정이 없습니다.
                                                출발일이 지난 여정은
                                                &apos;운행완료&apos; 탭에서
                                                확인할 수 있어요.
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        passengerReservationCardTrips.map(
                                            (trip) =>
                                                renderPassengerAwardedBookingCard(
                                                    trip,
                                                    'upcoming',
                                                ),
                                        )
                                    )}
                                </div>
                            </>
                        )}

                        {bookingSubTab === 'completed' && (
                            <>
                                <p className="mb-2 text-left text-sm text-gray-500">
                                    종료됨 (
                                    {passengerCompletedCardTrips.length})
                                </p>
                                <div className="grid gap-4">
                                    {passengerCompletedCardTrips.length ===
                                    0 ? (
                                        <Card className="rounded-none">
                                            <CardContent className="p-6 text-sm text-gray-600">
                                                아직 종료된 낙찰 여정이 없습니다.
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        passengerCompletedCardTrips.map(
                                            (trip) =>
                                                renderPassengerAwardedBookingCard(
                                                    trip,
                                                    'completed',
                                                ),
                                        )
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'chat' && (
                    <Card className="w-full max-w-xl mx-auto gap-0 rounded-none border-gray-200 py-0 shadow-sm">
                        <CardContent className="p-0">
                            <ChatPanel
                                focusRoomId={chatFocusRoomId}
                                onFocusRoomConsumed={() =>
                                    setChatFocusRoomId(null)
                                }
                                fillRoomHeight
                            />
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'support' && (
                    <SupportCustomerCenter
                        heading="고객센터"
                        showInquiry
                        refreshMyInquiriesKey={supportInquiryListKey}
                        onInquiryClick={() => {
                            setSupportOpen(true);
                            setSupportStep('menu');
                        }}
                    />
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-4 py-2.5 sm:px-5">
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab('quote')}
                        className={`h-9 flex-1 rounded-none px-1 text-xs sm:text-sm hover:bg-gray-100 ${
                            activeTab === 'quote'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                        }`}
                    >
                        견적
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab('booking')}
                        className={`h-9 flex-1 rounded-none px-1 text-xs sm:text-sm hover:bg-gray-100 ${
                            activeTab === 'booking'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                        }`}
                    >
                        예약
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab('chat')}
                        className={`h-9 flex-1 rounded-none px-1 text-xs sm:text-sm hover:bg-gray-100 ${
                            activeTab === 'chat'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                        }`}
                    >
                        채팅
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab('support')}
                        className={`h-9 flex-1 rounded-none px-1 text-xs sm:text-sm hover:bg-gray-100 ${
                            activeTab === 'support'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                        }`}
                    >
                        문의
                    </Button>
                </div>
            </div>

            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>채팅</DialogTitle>
                        <DialogDescription>
                            낙찰된 기사와 연결되는 대화창입니다.
                        </DialogDescription>
                    </DialogHeader>
                    <ChatPanel
                        focusRoomId={chatFocusRoomId}
                        onFocusRoomConsumed={() => setChatFocusRoomId(null)}
                    />
                    <div className="hidden">
                        <div className="rounded border p-3">
                            안녕하세요. 일정 확인을 위해 연락드립니다.
                        </div>
                        <div className="rounded border p-3">
                            기사님과 시간 조율 후 확정됩니다.
                        </div>
                        <Button className="w-full">새 문의하기</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={supportOpen}
                onOpenChange={(open) => {
                    setSupportOpen(open);
                    if (!open) {
                        setSupportStep('menu');
                        setSupportCategory(null);
                        setSupportInquiryTitle('');
                        setSupportInquiryBody('');
                        setSupportInquiryFormError('');
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>문의하기</DialogTitle>
                        <DialogDescription>
                            문의 유형을 선택해주세요.
                        </DialogDescription>
                    </DialogHeader>
                    {supportStep === 'menu' && (
                        <div className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full"
                                type="button"
                                onClick={() => {
                                    setSupportCategory('quote_amount');
                                    setSupportStep('form');
                                }}
                            >
                                견적 금액 문의
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                type="button"
                                onClick={() => {
                                    setSupportCategory('reservation_progress');
                                    setSupportStep('form');
                                }}
                            >
                                예약 진행 문의
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                type="button"
                                onClick={() => {
                                    setSupportCategory('other');
                                    setSupportStep('form');
                                }}
                            >
                                기타 문의
                            </Button>
                        </div>
                    )}
                    {supportStep === 'form' && (
                        <div className="space-y-4">
                            {supportInquiryFormError ? (
                                <p className="text-sm text-red-600">
                                    {supportInquiryFormError}
                                </p>
                            ) : null}
                            <div>
                                <Label htmlFor="passenger-inquiry-title">
                                    제목
                                </Label>
                                <Input
                                    id="passenger-inquiry-title"
                                    className="mt-1"
                                    value={supportInquiryTitle}
                                    onChange={(e) =>
                                        setSupportInquiryTitle(e.target.value)
                                    }
                                    placeholder="문의 제목을 입력하세요"
                                    maxLength={200}
                                />
                            </div>
                            <div>
                                <Label htmlFor="passenger-inquiry-body">
                                    문의 내용
                                </Label>
                                <Textarea
                                    id="passenger-inquiry-body"
                                    className="mt-1 min-h-[140px]"
                                    placeholder="문의 내용을 입력하세요"
                                    value={supportInquiryBody}
                                    onChange={(e) =>
                                        setSupportInquiryBody(e.target.value)
                                    }
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setSupportStep('menu');
                                        setSupportInquiryFormError('');
                                    }}
                                >
                                    이전
                                </Button>
                                <Button
                                    type="button"
                                    disabled={
                                        supportInquirySubmitting ||
                                        !supportCategory
                                    }
                                    onClick={async () => {
                                        const title = supportInquiryTitle.trim();
                                        const body = supportInquiryBody.trim();
                                        if (!title) {
                                            setSupportInquiryFormError(
                                                '제목을 입력해주세요.',
                                            );
                                            return;
                                        }
                                        if (!body) {
                                            setSupportInquiryFormError(
                                                '문의 내용을 입력해주세요.',
                                            );
                                            return;
                                        }
                                        setSupportInquirySubmitting(true);
                                        setSupportInquiryFormError('');
                                        try {
                                            await supportAPI.createInquiry({
                                                category: supportCategory!,
                                                title,
                                                body,
                                            });
                                            setSupportInquiryListKey((k) => k + 1);
                                            setSupportInquiryTitle('');
                                            setSupportInquiryBody('');
                                            setSupportCategory(null);
                                            setSupportStep('done');
                                        } catch (e) {
                                            setSupportInquiryFormError(
                                                e instanceof Error
                                                    ? e.message
                                                    : '문의 접수에 실패했습니다.',
                                            );
                                        } finally {
                                            setSupportInquirySubmitting(false);
                                        }
                                    }}
                                >
                                    문의하기
                                </Button>
                            </div>
                        </div>
                    )}
                    {supportStep === 'done' && (
                        <div className="space-y-4 text-sm text-gray-600">
                            문의가 접수되었습니다. 빠르게 답변드리겠습니다.
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSupportOpen(false)}
                            >
                                닫기
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
