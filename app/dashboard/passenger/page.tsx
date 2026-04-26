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
        dateTime: '',
        paxCount: 1,
        busSize: 'small',
    });
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
                !newTrip.dateTime
            ) {
                alert('출발지, 도착지, 날짜 및 시간을 입력해주세요');
                return;
            }
            await tripsAPI.create({
                ...newTrip,
                dateTime: new Date(newTrip.dateTime).toISOString(),
            });
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
        <div className="min-h-screen bg-gray-50">
            <div className="border-b border-orange-100 bg-orange-50">
                <div className="max-w-6xl mx-auto relative flex items-center justify-center px-4 sm:px-6 py-4">
                    <div className="absolute left-4 sm:left-6">
                        <Button
                            variant="outline"
                            onClick={() => setMenuOpen(true)}
                        >
                            메뉴
                        </Button>
                    </div>
                    <span className="text-lg font-semibold">GOODBUS</span>
                    <div className="absolute right-4 sm:right-6 flex items-center gap-3">
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
                                    setActiveTab('quote');
                                    setMenuOpen(false);
                                }}
                            >
                                견적
                            </button>
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={() => {
                                    setActiveTab('booking');
                                    setMenuOpen(false);
                                }}
                            >
                                예약
                            </button>
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

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-gray-500">
                                회원등급
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-lg font-semibold">
                            일반회원
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-gray-500">
                                적립금
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-lg font-semibold">
                            0원
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-gray-500">
                                추천 혜택
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-lg font-semibold">
                            월 100만원
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>
                            굿버스에서 가격비교 하고 적립금도 받아가세요.
                        </CardTitle>
                        <CardDescription>
                            원하는 여정을 등록하면 기사/업체가 입찰을
                            제안합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => setOpenDialog(true)}>
                            견적 등록하기
                        </Button>
                    </CardContent>
                </Card>

                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogContent>
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
                                <Input
                                    type="datetime-local"
                                    value={newTrip.dateTime}
                                    onChange={(e) =>
                                        setNewTrip({
                                            ...newTrip,
                                            dateTime: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label>승객 수</Label>
                                <Input
                                    type="number"
                                    value={newTrip.paxCount}
                                    onChange={(e) =>
                                        setNewTrip({
                                            ...newTrip,
                                            paxCount: parseInt(e.target.value),
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label>버스 크기</Label>
                                <Select
                                    value={newTrip.busSize}
                                    onValueChange={(value) =>
                                        setNewTrip({
                                            ...newTrip,
                                            busSize: value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">
                                            소형
                                        </SelectItem>
                                        <SelectItem value="medium">
                                            중형
                                        </SelectItem>
                                        <SelectItem value="large">
                                            대형
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={createTrip} className="w-full">
                                여정 만들기
                            </Button>
                        </div>
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
                                    onChange={(e) =>
                                        setEditTripData({
                                            ...editTripData,
                                            paxCount: parseInt(e.target.value),
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
                                            소형
                                        </SelectItem>
                                        <SelectItem value="medium">
                                            중형
                                        </SelectItem>
                                        <SelectItem value="large">
                                            대형
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
                    <div className="grid gap-6">
                        {trips.map((trip) => (
                            <Card key={trip.id}>
                                <CardHeader>
                                    <div className="flex justify-between">
                                        <div>
                                            <CardTitle>
                                                {trip.origin} →{' '}
                                                {trip.destination}
                                            </CardTitle>
                                            <CardDescription>
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
                                <CardContent>
                                    <p>승객 수: {trip.paxCount}</p>
                                    <p>
                                        버스 크기:{' '}
                                        {trip.busSize === 'small'
                                            ? '소형'
                                            : trip.busSize === 'medium'
                                              ? '중형'
                                              : '대형'}
                                    </p>
                                    <p className="mt-2 font-semibold">
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
                                                        className="p-3"
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
                                                            <Button>
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
                                                className="border-orange-200 text-orange-700 hover:bg-orange-50"
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
                    <div className="grid gap-6">
                        {awardedTrips.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-sm text-gray-600">
                                    아직 낙찰된 여정이 없습니다.
                                </CardContent>
                            </Card>
                        ) : (
                            awardedTrips.map((trip) => (
                                <Card key={trip.id}>
                                    <CardHeader>
                                        <CardTitle>
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
                                            className="mt-3"
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
                    <Card>
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
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                문의는 버튼을 눌러 진행해주세요. 상담 기록은
                                추후 저장될 수 있습니다.
                            </p>
                            <Button
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

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between">
                    <Button
                        variant={activeTab === 'quote' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('quote')}
                        className="text-xs sm:text-sm"
                    >
                        견적
                    </Button>
                    <Button
                        variant={activeTab === 'booking' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('booking')}
                        className="text-xs sm:text-sm"
                    >
                        예약
                    </Button>
                    <Button
                        variant={activeTab === 'chat' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('chat')}
                        className="text-xs sm:text-sm"
                    >
                        채팅
                    </Button>
                    <Button
                        variant={activeTab === 'support' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('support')}
                        className="text-xs sm:text-sm"
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
