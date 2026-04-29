'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authAPI, tripsAPI, bidsAPI } from '@/lib/api';
import { Notifications } from '@/components/Notifications';
import { ChatPanel } from '@/components/ChatPanel';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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

interface Trip {
    id: string;
    origin: string;
    destination: string;
    dateTime: string;
    paxCount: number;
    busSize: string;
    status: string;
    passenger: {
        id: string;
        email: string;
        role: string;
    };
    bids: Bid[];
    minBidPrice: number | null;
}

interface Bid {
    id: string;
    price: number;
    note?: string;
    status: string;
    bidder: {
        email: string;
        role: string;
    };
}

interface KakaoPlace {
    id: string;
    place_name: string;
    address_name: string;
    road_address_name: string;
}

export default function PassengerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<
        'quote' | 'booking' | 'chat' | 'support'
    >('quote');
    const [chatOpen, setChatOpen] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const [supportStep, setSupportStep] = useState<'menu' | 'form' | 'done'>(
        'menu',
    );
    const [newTrip, setNewTrip] = useState({
        origin: '',
        destination: '',
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
    const [purposeDialogOpen, setPurposeDialogOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [selectedBid, setSelectedBid] = useState<string>('');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
    const [editTripData, setEditTripData] = useState({
        origin: '',
        destination: '',
        dateTime: '',
        paxCount: 1,
        busSize: 'small' as 'small' | 'medium' | 'large',
    });
    const [kakaoStatusMessage, setKakaoStatusMessage] = useState('');
    const [originResults, setOriginResults] = useState<KakaoPlace[]>([]);
    const [destinationResults, setDestinationResults] = useState<KakaoPlace[]>(
        [],
    );

    useEffect(() => {
        loadData();
    }, []);


    async function loadData() {
        try {
            const userData = await authAPI.getMe();
            setUser(userData.user);
            const tripData = await tripsAPI.getAll();
            // 현재 사용자가 만든 여행 중 취소되지 않은 것만 표시
            const myTrips = (tripData.trips || []).filter((trip: any) => {
                return (
                    trip.passenger.id === userData.user.id &&
                    trip.status !== 'cancelled'
                );
            });
            setTrips(myTrips);
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

            // 왕복은 기존 DB 구조상 "편도 2개(방향 반대)"로 생성합니다.
            const goingTripPayload = {
                origin: newTrip.origin,
                destination: newTrip.destination,
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
                const goingAt = new Date(newTrip.goingDateTime);
                const returnAt = new Date(newTrip.returnDateTime);
                if (returnAt.getTime() < goingAt.getTime()) {
                    alert('오는날 시간이 가는날보다 빠를 수 없습니다.');
                    return;
                }

                // 1) 가는 방향
                await tripsAPI.create(goingTripPayload);
                // 2) 오는 방향(원점/목적지 반전)
                await tripsAPI.create({
                    origin: newTrip.destination,
                    destination: newTrip.origin,
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
            alert('여정 생성에 실패했습니다');
        }
    }

    async function awardTrip(tripId: string) {
        try {
            await tripsAPI.award(tripId, selectedBid);
            setSelectedTrip(null);
            loadData();
        } catch (error) {
            console.error('Error awarding trip:', error);
            alert('입찰 수주에 실패했습니다');
        }
    }

    async function cancelTrip(tripId: string) {
        if (!confirm('이 여정을 취소하시겠습니까?')) {
            return;
        }

        try {
            await tripsAPI.cancel(tripId);
            loadData();
        } catch (error) {
            console.error('Error cancelling trip:', error);
            alert('여정 취소에 실패했습니다');
        }
    }

    function openEditDialog(trip: Trip) {
        setEditingTrip(trip);
        // Format dateTime for datetime-local input
        const dateTime = new Date(trip.dateTime);
        const formattedDateTime = new Date(
            dateTime.getTime() - dateTime.getTimezoneOffset() * 60000,
        )
            .toISOString()
            .slice(0, 16);
        setEditTripData({
            origin: trip.origin,
            destination: trip.destination,
            dateTime: formattedDateTime,
            paxCount: trip.paxCount,
            busSize: trip.busSize as 'small' | 'medium' | 'large',
        });
        setEditDialogOpen(true);
    }

    async function updateTrip() {
        if (!editingTrip) return;

        if (
            !editTripData.origin ||
            !editTripData.destination ||
            !editTripData.dateTime
        ) {
            alert('모든 필수 항목을 입력해주세요');
            return;
        }

        if (
            !confirm(
                '여정 정보를 수정하면 모든 기존 입찰이 취소됩니다. 계속하시겠습니까?',
            )
        ) {
            return;
        }

        try {
            await tripsAPI.update(editingTrip.id, {
                origin: editTripData.origin,
                destination: editTripData.destination,
                dateTime: new Date(editTripData.dateTime).toISOString(),
                paxCount: editTripData.paxCount,
                busSize: editTripData.busSize,
            });
            setEditDialogOpen(false);
            setEditingTrip(null);
            loadData();
        } catch (error) {
            console.error('Error updating trip:', error);
            alert('여정 수정에 실패했습니다');
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

    const awardedTrips = trips.filter((trip) => trip.status === 'awarded');

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

            <div className="mx-auto w-full max-w-xl px-4 sm:px-5 py-5 sm:py-6 space-y-4">
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

                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogContent className="w-[95vw] max-w-3xl max-h-[66vh] overflow-y-auto overflow-x-hidden">
                        <DialogHeader>
                            <DialogTitle>여정 만들기</DialogTitle>
                            <DialogDescription>
                                여정 정보를 입력하세요
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>출발지</Label>
                                {kakaoStatusMessage && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {kakaoStatusMessage}
                                    </p>
                                )}
                                <Input
                                    value={newTrip.origin}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setNewTrip({
                                            ...newTrip,
                                            origin: value,
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
                                                    setNewTrip({
                                                        ...newTrip,
                                                        origin:
                                                            place.road_address_name ||
                                                            place.address_name ||
                                                            place.place_name,
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
                            <div>
                                <Label>도착지</Label>
                                <Input
                                    value={newTrip.destination}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setNewTrip({
                                            ...newTrip,
                                            destination: value,
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
                                                    setNewTrip({
                                                        ...newTrip,
                                                        destination:
                                                            place.road_address_name ||
                                                            place.address_name ||
                                                            place.place_name,
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
                            <div>
                                <Label>날짜 및 시간</Label>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>운행 방식</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                className={`h-12 rounded-full px-4 text-sm font-semibold transition ${
                                                    newTrip.tripType ===
                                                    'oneway'
                                                        ? 'bg-black text-white'
                                                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
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
                                                className={`h-12 rounded-full px-4 text-sm font-semibold transition ${
                                                    newTrip.tripType ===
                                                    'round'
                                                        ? 'bg-black text-white'
                                                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
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
                                            <Input
                                                type="datetime-local"
                                                value={newTrip.goingDateTime}
                                                onChange={(e) =>
                                                    setNewTrip({
                                                        ...newTrip,
                                                        goingDateTime:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <Label>가는날 시간</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={newTrip.goingDateTime}
                                                    onChange={(e) =>
                                                        setNewTrip({
                                                            ...newTrip,
                                                            goingDateTime:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>오는날 시간</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={newTrip.returnDateTime}
                                                    onChange={(e) =>
                                                        setNewTrip({
                                                            ...newTrip,
                                                            returnDateTime:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* 경유지 추가 */}
                            <div className="space-y-3 pt-2">
                                <button
                                    type="button"
                                    className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-semibold transition ${
                                        stopoverOpen
                                            ? 'border-[#e08030]/70 bg-[#fff0e6] hover:bg-[#ffe7d9]'
                                            : 'border-[#e08030]/40 hover:bg-[#fff0e6]'
                                    }`}
                                    onClick={() => {
                                        if (!stopoverOpen) {
                                            setStopoverOpen(true);
                                            return;
                                        }
                                        setStopoverOpen(false);
                                        setNewTrip({
                                            ...newTrip,
                                            stopoverDetail: '',
                                        });
                                    }}
                                >
                                    <span
                                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                            stopoverOpen
                                                ? 'bg-[#e08030] text-white'
                                                : 'border border-[#e08030] text-[#e08030]'
                                        }`}
                                    >
                                        {stopoverOpen ? '−' : '+'}
                                    </span>
                                    <span className="text-gray-900">
                                        {stopoverOpen ? '경유지 삭제' : '경유지 추가'}
                                    </span>
                                </button>

                                {stopoverOpen && (
                                    <div className="rounded-xl border border-[#e08030] bg-white p-4">
                                        <Textarea
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
                            </div>

                            {/* 결제 방식 + 버스 선택 + 추가 사항 */}
                            <div className="space-y-3 pt-4">
                                <Label>결제 방식</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        className={`h-12 rounded-full px-4 text-sm font-semibold transition ${
                                            newTrip.paymentMethod === 'cash'
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-900'
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
                                        className={`h-12 rounded-full px-4 text-sm font-semibold transition ${
                                            newTrip.paymentMethod === 'card'
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-900'
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

                            <div className="space-y-3 pt-4">
                                <Label>버스 선택</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'large'
                                                ? 'border-[#e08030] bg-[#fff0e6]'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
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
                                        className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'medium'
                                                ? 'border-[#e08030] bg-[#fff0e6]'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
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
                                        className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'small'
                                                ? 'border-[#e08030] bg-[#fff0e6]'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
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

                            <div className="space-y-2 pt-4">
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
                            <div className="space-y-3 pt-4">
                                <Label>기사님 동행 여부</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        className={`h-12 rounded-full px-4 text-sm font-semibold transition ${
                                            newTrip.companionType ===
                                            'depart_return'
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-900'
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
                                        className={`h-12 rounded-full px-4 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                                            newTrip.companionType ===
                                            'with_schedule'
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-900'
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
                            <div className="space-y-2 pt-4">
                                <Label>어떤 목적으로 서비스를 이용하세요?</Label>
                                <button
                                    type="button"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
                                    onClick={() => setPurposeDialogOpen(true)}
                                >
                                    {newTrip.servicePurpose
                                        ? newTrip.servicePurpose
                                        : '목적을 선택해주세요'}
                                </button>
                            </div>

                            <div>
                                <Label>승객 수</Label>
                                <Input
                                    type="number"
                                    value={newTrip.paxCount}
                                        min={1}
                                    onChange={(e) =>
                                            setNewTrip({
                                                ...newTrip,
                                                paxCount: (() => {
                                                    const raw =
                                                        e.target.value;
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
                            <Button onClick={createTrip} className="w-full">
                                여정 만들기
                            </Button>
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

                {/* 서비스 목적 선택 */}
                <Dialog
                    open={purposeDialogOpen}
                    onOpenChange={setPurposeDialogOpen}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                어떤 목적으로 버스를 구하실까요?
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-3 pt-2">
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
                                    onClick={() => {
                                        setNewTrip({
                                            ...newTrip,
                                            servicePurpose: purpose,
                                        });
                                    }}
                                    className={`rounded-lg border px-3 py-4 text-sm font-semibold transition ${
                                        newTrip.servicePurpose === purpose
                                            ? 'border-[#e08030] bg-[#fff0e6]'
                                            : 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    {purpose}
                                </button>
                            ))}
                        </div>

                        <Button
                            className="mt-5 h-11 w-full bg-[#e08030] hover:bg-[#d07526]"
                            onClick={() => setPurposeDialogOpen(false)}
                        >
                            선택
                        </Button>
                    </DialogContent>
                </Dialog>

                {/* Edit Trip Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>여정 수정</DialogTitle>
                            <DialogDescription>
                                여정 정보를 수정하세요. 모든 기존 입찰이
                                취소됩니다.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>출발지</Label>
                                <Input
                                    value={editTripData.origin}
                                    onChange={(e) =>
                                        setEditTripData({
                                            ...editTripData,
                                            origin: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label>도착지</Label>
                                <Input
                                    value={editTripData.destination}
                                    onChange={(e) =>
                                        setEditTripData({
                                            ...editTripData,
                                            destination: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label>날짜 및 시간</Label>
                                <Input
                                    type="datetime-local"
                                    value={editTripData.dateTime}
                                    onChange={(e) =>
                                        setEditTripData({
                                            ...editTripData,
                                            dateTime: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label>승객 수</Label>
                                <Input
                                    type="number"
                                    value={editTripData.paxCount}
                                    min={1}
                                    onChange={(e) =>
                                        setEditTripData({
                                            ...editTripData,
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
                            <div>
                                <Label>버스 크기</Label>
                                <Select
                                    value={editTripData.busSize}
                                    onValueChange={(value) =>
                                        setEditTripData({
                                            ...editTripData,
                                            busSize: value as
                                                | 'small'
                                                | 'medium'
                                                | 'large',
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">
                                            미니버스·밴
                                        </SelectItem>
                                        <SelectItem value="medium">
                                            우등버스
                                        </SelectItem>
                                        <SelectItem value="large">
                                            대형버스
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={updateTrip} className="w-full">
                                여정 수정
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {activeTab === 'quote' && (
                    <div className="grid gap-4 w-full max-w-xl mx-auto">
                        {trips.map((trip) => (
                            <Card
                                key={trip.id}
                                className="rounded-none border-gray-200 shadow-sm"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between">
                                        <div>
                                            <CardTitle className="text-[19px] font-semibold tracking-tight">
                                                {trip.origin} →{' '}
                                                {trip.destination}
                                            </CardTitle>
                                            <CardDescription className="mt-1 text-sm">
                                                {format(
                                                    new Date(trip.dateTime),
                                                    'PPP p',
                                                )}
                                            </CardDescription>
                                        </div>
                                        <Badge
                                            variant={
                                                trip.status === 'awarded'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {trip.status === 'awarded'
                                                ? '낙찰됨'
                                                : '진행중'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-1 text-[15px] text-gray-700">
                                    <p>승객 수: {trip.paxCount}</p>
                                    <p>
                                        버스 크기:{' '}
                                        {trip.busSize === 'small'
                                            ? '미니버스·밴'
                                            : trip.busSize === 'medium'
                                              ? '우등버스'
                                              : '대형버스'}
                                    </p>
                                    <p className="mt-2 font-semibold text-gray-900">
                                        입찰 수: {trip.bids?.length || 0}
                                    </p>
                                    {trip.minBidPrice !== null && (
                                        <p className="mt-1 text-sm text-blue-600 font-semibold">
                                            💰 최저 입찰가: ${trip.minBidPrice}
                                        </p>
                                    )}
                                    {trip.bids && trip.bids.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            {trip.bids
                                                .filter(
                                                    (bid: Bid) =>
                                                        bid.status === 'open',
                                                )
                                                .map((bid: Bid) => (
                                                    <Card
                                                        key={bid.id}
                                                        className="rounded-none p-3"
                                                    >
                                                        <div className="flex justify-between">
                                                            <div>
                                                                <p className="font-semibold">
                                                                    ${bid.price}
                                                                </p>
                                                                <p className="text-sm text-gray-600">
                                                                    {bid.note ||
                                                                        '메모 없음'}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    📧{' '}
                                                                    {
                                                                        bid
                                                                            .bidder
                                                                            .email
                                                                    }
                                                                </p>
                                                            </div>
                                                            <Badge variant="secondary">
                                                                {bid.status ===
                                                                'open'
                                                                    ? '진행중'
                                                                    : bid.status ===
                                                                        'awarded'
                                                                      ? '낙찰됨'
                                                                      : bid.status ===
                                                                          'withdrawn'
                                                                        ? '철회됨'
                                                                        : '실패'}
                                                            </Badge>
                                                        </div>
                                                    </Card>
                                                ))}
                                        </div>
                                    )}
                                    {trip.status === 'open' && (
                                        <div className="flex gap-2 mt-4 flex-wrap">
                                            <Button
                                                variant="outline"
                                                className="h-9 rounded-lg text-sm"
                                                onClick={() =>
                                                    openEditDialog(trip)
                                                }
                                            >
                                                여정 수정
                                            </Button>
                                            {trip.bids &&
                                                trip.bids.length > 0 && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button className="h-9 rounded-lg bg-black px-4 text-sm text-white hover:bg-black/90">
                                                                입찰 수주
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>
                                                                    입찰 수주
                                                                </DialogTitle>
                                                            </DialogHeader>
                                                            <Select
                                                                value={
                                                                    selectedBid
                                                                }
                                                                onValueChange={
                                                                    setSelectedBid
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="입찰을 선택하세요" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {trip.bids
                                                                        .filter(
                                                                            (
                                                                                bid: Bid,
                                                                            ) =>
                                                                                bid.status ===
                                                                                'open',
                                                                        )
                                                                        .map(
                                                                            (
                                                                                bid: Bid,
                                                                            ) => (
                                                                                <SelectItem
                                                                                    key={
                                                                                        bid.id
                                                                                    }
                                                                                    value={
                                                                                        bid.id
                                                                                    }
                                                                                >
                                                                                    $
                                                                                    {
                                                                                        bid.price
                                                                                    }
                                                                                    {
                                                                                        ' - '
                                                                                    }
                                                                                    {
                                                                                        bid
                                                                                            .bidder
                                                                                            .email
                                                                                    }
                                                                                </SelectItem>
                                                                            ),
                                                                        )}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                className="mt-3 h-9 rounded-lg bg-black text-sm text-white hover:bg-black/90"
                                                                onClick={() =>
                                                                    awardTrip(
                                                                        trip.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    !selectedBid
                                                                }
                                                            >
                                                                수주하기
                                                            </Button>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                            <Button
                                                variant="outline"
                                                className="h-9 rounded-lg border-orange-200 text-sm text-orange-700 hover:bg-orange-50"
                                                onClick={() =>
                                                    cancelTrip(trip.id)
                                                }
                                            >
                                                여정 취소
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === 'booking' && (
                    <div className="grid gap-4 w-full max-w-xl mx-auto">
                        {awardedTrips.length === 0 ? (
                            <Card className="rounded-none">
                                <CardContent className="p-6 text-sm text-gray-600">
                                    아직 낙찰된 여정이 없습니다.
                                </CardContent>
                            </Card>
                        ) : (
                            awardedTrips.map((trip) => (
                                <Card
                                    key={trip.id}
                                    className="rounded-none border-gray-200 shadow-sm"
                                >
                                    <CardHeader>
                                        <CardTitle className="text-[19px] font-semibold tracking-tight">
                                            {trip.origin} → {trip.destination}
                                        </CardTitle>
                                        <CardDescription>
                                            {format(
                                                new Date(trip.dateTime),
                                                'PPP p',
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-600">
                                            낙찰된 여정입니다. 기사와 채팅으로
                                            일정을 확인하세요.
                                        </p>
                                        <Button
                                            className="mt-3 h-9 rounded-lg bg-black px-4 text-sm text-white hover:bg-black/90"
                                            onClick={() => setChatOpen(true)}
                                        >
                                            기사와 채팅하기
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'chat' && (
                    <Card className="w-full max-w-xl mx-auto rounded-none border-gray-200 shadow-sm">
                        <CardContent className="p-6 space-y-4">
                            <ChatPanel />
                            <p className="hidden">
                                낙찰된 버스기사와의 채팅 영역입니다. 실제 채팅
                                기능은 향후 실시간 기능과 함께 추가됩니다.
                            </p>
                            <Button className="hidden" onClick={() => setChatOpen(true)}>
                                채팅 열기
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'support' && (
                    <Card className="w-full max-w-xl mx-auto rounded-none border-gray-200 shadow-sm">
                        <CardContent className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                문의는 버튼을 눌러 진행해주세요. 상담 기록은
                                추후 저장될 수 있습니다.
                            </p>
                            <Button
                                className="h-9 rounded-lg bg-black px-4 text-sm text-white hover:bg-black/90"
                                onClick={() => {
                                    setSupportOpen(true);
                                    setSupportStep('menu');
                                }}
                            >
                                문의하기
                            </Button>
                        </CardContent>
                    </Card>
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
                    <ChatPanel />
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

            <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
                <DialogContent>
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
                                onClick={() => setSupportStep('form')}
                            >
                                견적 금액 문의
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSupportStep('form')}
                            >
                                예약 진행 문의
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSupportStep('form')}
                            >
                                기타 문의
                            </Button>
                        </div>
                    )}
                    {supportStep === 'form' && (
                        <div className="space-y-4">
                            <div>
                                <Label>문의 내용</Label>
                                <Textarea placeholder="문의 내용을 입력하세요" />
                            </div>
                            <Button onClick={() => setSupportStep('done')}>
                                문의하기
                            </Button>
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
