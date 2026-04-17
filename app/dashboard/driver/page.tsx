'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authAPI, tripsAPI, bidsAPI } from '@/lib/api';
import { Notifications } from '@/components/Notifications';
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
import { format } from 'date-fns';

interface Trip {
    id: string;
    origin: string;
    destination: string;
    dateTime: string;
    paxCount: number;
    busSize: string;
    status: string;
    bids: Bid[];
}

interface Bid {
    id: string;
    price: number;
    note?: string;
    status: string;
    bidder: {
        id: string;
        email: string;
        role: string;
    };
}

export default function DriverDashboard() {
    const [user, setUser] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [myBids, setMyBids] = useState<Trip[]>([]);
    const [awardedTrips, setAwardedTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [bidData, setBidData] = useState({ price: 0, note: '' });
    const [activeTab, setActiveTab] = useState<
        'available' | 'contract' | 'chat' | 'support'
    >('available');
    const [regionFilterOpen, setRegionFilterOpen] = useState(false);
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [paxFilterOpen, setPaxFilterOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [minPax, setMinPax] = useState('');
    const [maxPax, setMaxPax] = useState('');
    const regions = [
        '서울',
        '경기북부',
        '경기남부',
        '인천',
        '강원',
        '대전',
        '세종',
        '충북',
        '충남',
        '광주',
        '전북',
        '전남',
        '부산',
        '대구',
        '울산',
        '경북',
        '경남',
        '제주',
    ];

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
            const tripData = await tripsAPI.getAll('open');
            const allTrips = tripData.trips || [];

            // 내가 입찰한 여정과 입찰하지 않은 여정을 분리
            const tripsWithMyBids = allTrips.filter((trip: Trip) =>
                trip.bids?.some(
                    (bid: Bid) =>
                        bid.bidder.id === userData.user.id &&
                        bid.status === 'open'
                )
            );
            const tripsWithoutMyBids = allTrips.filter(
                (trip: Trip) =>
                    !trip.bids?.some(
                        (bid: Bid) =>
                            bid.bidder.id === userData.user.id &&
                            bid.status === 'open'
                    )
            );

            setTrips(tripsWithoutMyBids);
            setMyBids(tripsWithMyBids);

            // awarded 여정도 가져오기
            const awardedTripData = await tripsAPI.getAll('awarded');

            // 본인이 낙찰받은 여정 필터링 (날짜 관계없이 모두 표시)
            const awardedTrips = (awardedTripData.trips || []).filter(
                (trip: Trip) => {
                    // 본인이 awarded 상태인 bid를 찾음
                    const hasMyAwardedBid = trip.bids?.some(
                        (bid: Bid) =>
                            bid.bidder.id === userData.user.id &&
                            bid.status === 'awarded'
                    );

                    return hasMyAwardedBid;
                }
            );

            setAwardedTrips(awardedTrips);
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

    async function createBid(tripId: string) {
        if (bidData.price <= 0) {
            alert('올바른 가격을 입력해주세요 (양수만 가능)');
            return;
        }

        try {
            await bidsAPI.create(tripId, bidData.price, bidData.note);
            setSelectedTrip(null);
            setBidData({ price: 0, note: '' });
            loadData();
        } catch (error) {
            console.error('Error creating bid:', error);
            alert('입찰 생성에 실패했습니다');
        }
    }

    async function handleWithdrawBid(trip: Trip) {
        if (!confirm('이 입찰을 철회하시겠습니까?')) {
            return;
        }

        const myBid = trip.bids.find(
            (bid: Bid) => bid.bidder.id === user?.id && bid.status === 'open'
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

    function filterTrips(list: Trip[]) {
        return list.filter((trip) => {
            if (selectedRegion && !trip.origin.includes(selectedRegion)) {
                return false;
            }
            if (selectedDate) {
                const tripDate = new Date(trip.dateTime)
                    .toISOString()
                    .slice(0, 10);
                if (tripDate !== selectedDate) {
                    return false;
                }
            }
            if (minPax && trip.paxCount < Number(minPax)) {
                return false;
            }
            if (maxPax && trip.paxCount > Number(maxPax)) {
                return false;
            }
            return true;
        });
    }

    return (
        <>
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="relative flex items-center justify-center mb-6">
                    <div className="absolute left-0">
                        <Button
                            variant="outline"
                            onClick={() => setMenuOpen(true)}
                        >
                            메뉴
                        </Button>
                    </div>
                    <span className="text-lg font-semibold">GOODBUS</span>
                    <div className="absolute right-0 flex items-center gap-3">
                        <Notifications />
                    </div>
                </div>

                {activeTab === 'contract' && (
                    <>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-4">
                                낙찰된 여정
                            </h2>
                            {awardedTrips.length > 0 ? (
                                <div className="grid gap-6">
                                    {awardedTrips.map((trip) => {
                                        const myBid = trip.bids.find(
                                            (bid: Bid) =>
                                                bid.bidder.id === user?.id &&
                                                bid.status === 'awarded'
                                        );
                                        return (
                                            <Card
                                                key={trip.id}
                                                className="border-green-500"
                                            >
                                                <CardHeader>
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <CardTitle>
                                                                {trip.origin} →{' '}
                                                                {
                                                                    trip.destination
                                                                }
                                                            </CardTitle>
                                                            <p className="text-sm text-gray-600">
                                                                {format(
                                                                    new Date(
                                                                        trip.dateTime
                                                                    ),
                                                                    'PPP p'
                                                                )}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-green-500">
                                                            낙찰됨
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p>
                                                        승객 수: {trip.paxCount}
                                                    </p>
                                                    <p>
                                                        버스 크기:{' '}
                                                        {trip.busSize === 'small' ? '소형' : trip.busSize === 'medium' ? '중형' : '대형'}
                                                    </p>
                                                    <div className="mt-4 p-3 bg-green-100 rounded">
                                                        <p className="font-bold text-green-800">
                                                            🎉 낙찰가: $
                                                            {myBid?.price}
                                                        </p>
                                                        {myBid?.note && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {myBid.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    낙찰된 여정이 없습니다
                                </p>
                            )}
                        </div>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-4">
                                내 입찰
                            </h2>
                            {myBids.length > 0 ? (
                                <div className="grid gap-6">
                                    {myBids.map((trip) => {
                                        const myBid = trip.bids.find(
                                            (bid: Bid) =>
                                                bid.bidder.id === user?.id &&
                                                bid.status === 'open'
                                        );
                                        return (
                                            <Card key={trip.id}>
                                                <CardHeader>
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <CardTitle>
                                                                {trip.origin} →{' '}
                                                                {
                                                                    trip.destination
                                                                }
                                                            </CardTitle>
                                                            <p className="text-sm text-gray-600">
                                                                {format(
                                                                    new Date(
                                                                        trip.dateTime
                                                                    ),
                                                                    'PPP p'
                                                                )}
                                                            </p>
                                                        </div>
                                                        <Badge>입찰 완료</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p>
                                                        승객 수: {trip.paxCount}
                                                    </p>
                                                    <p>
                                                        버스 크기:{' '}
                                                        {trip.busSize === 'small' ? '소형' : trip.busSize === 'medium' ? '중형' : '대형'}
                                                    </p>
                                                    <div className="mt-4 p-3 bg-green-50 rounded">
                                                        <p className="font-semibold text-green-700">
                                                            내 입찰가: $
                                                            {myBid?.price}
                                                        </p>
                                                        {myBid?.note && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {myBid.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="destructive"
                                                        className="mt-4"
                                                        onClick={() =>
                                                            handleWithdrawBid(
                                                                trip
                                                            )
                                                        }
                                                    >
                                                        입찰 철회
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    입찰한 내역이 없습니다
                                </p>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'available' && (
                    <div>
                        <div className="mb-6 flex justify-center w-full">
                            <div className="flex flex-wrap gap-2 rounded-full border bg-white px-3 py-2 shadow-sm w-full justify-between sm:justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setRegionFilterOpen(true)}
                                    className="rounded-full"
                                >
                                    {selectedRegion
                                        ? `출발지역: ${selectedRegion}`
                                        : '출발지역'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setDateFilterOpen(true)}
                                    className="rounded-full"
                                >
                                    {selectedDate
                                        ? `출발일: ${selectedDate}`
                                        : '출발일'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setPaxFilterOpen(true)}
                                    className="rounded-full"
                                >
                                    {minPax || maxPax
                                        ? `인원수: ${minPax || '0'}~${
                                              maxPax || '∞'
                                          }`
                                        : '인원수'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setSelectedRegion(null);
                                        setSelectedDate('');
                                        setMinPax('');
                                        setMaxPax('');
                                    }}
                                    className="rounded-full"
                                >
                                    필터 초기화
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            {filterTrips(trips).map((trip) => (
                                <Card key={trip.id} className="w-full">
                                    <CardHeader>
                                        <div className="flex justify-between">
                                            <div>
                                                <CardTitle>
                                                    {trip.origin} →{' '}
                                                    {trip.destination}
                                                </CardTitle>
                                                <p className="text-sm text-gray-600">
                                                    {format(
                                                        new Date(trip.dateTime),
                                                        'PPP p'
                                                    )}
                                                </p>
                                            </div>
                                            <Badge>{trip.status === 'open' ? '진행중' : trip.status === 'awarded' ? '낙찰됨' : '취소됨'}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p>승객 수: {trip.paxCount}</p>
                                        <p>버스 크기: {trip.busSize === 'small' ? '소형' : trip.busSize === 'medium' ? '중형' : '대형'}</p>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button className="mt-2 w-full sm:w-auto">
                                                    입찰하기
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        입찰하기
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        입찰 정보를 입력하세요
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div>
                                                        <Label>가격 ($)</Label>
                                                        <Input
                                                            type="number"
                                                            value={
                                                                bidData.price ===
                                                                    0 ||
                                                                bidData.price
                                                                    ? String(
                                                                          bidData.price
                                                                      )
                                                                    : ''
                                                            }
                                                            onChange={(e) =>
                                                                setBidData({
                                                                    ...bidData,
                                                                    price:
                                                                        e.target
                                                                            .value ===
                                                                        ''
                                                                            ? 0
                                                                            : parseFloat(
                                                                                  e
                                                                                      .target
                                                                                      .value
                                                                              ) ||
                                                                              0,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>
                                                            메모 (선택사항)
                                                        </Label>
                                                        <Textarea
                                                            value={bidData.note}
                                                            onChange={(e) =>
                                                                setBidData({
                                                                    ...bidData,
                                                                    note: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={() =>
                                                            createBid(trip.id)
                                                        }
                                                        disabled={
                                                            bidData.price <= 0
                                                        }
                                                    >
                                                        입찰 제출
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <Card>
                        <CardContent className="p-6 space-y-3 text-sm text-gray-600">
                            낙찰된 승객과의 채팅 영역입니다. 실제 채팅 기능은
                            추후 실시간 기능과 함께 추가됩니다.
                            <Button className="mt-2 w-full sm:w-auto">
                                채팅 열기
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'support' && (
                    <Card>
                        <CardContent className="p-6 space-y-3 text-sm text-gray-600">
                            고객센터 문의 영역입니다. 문의 유형별로 분류하고
                            처리 상태를 추적하도록 확장할 수 있습니다.
                            <Button className="mt-2 w-full sm:w-auto">
                                문의하기
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
        {menuOpen && (
            <div className="fixed inset-0 z-40 bg-black/30">
                <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-lg p-6 space-y-6">
                    <div>
                        <p className="text-lg font-semibold">
                            {user?.email}
                        </p>
                        <p className="text-sm text-gray-500">Driver</p>
                    </div>
                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setActiveTab('available');
                                setMenuOpen(false);
                            }}
                        >
                            주문
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setActiveTab('contract');
                                setMenuOpen(false);
                            }}
                        >
                            계약
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setActiveTab('chat');
                                setMenuOpen(false);
                            }}
                        >
                            채팅
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setActiveTab('support');
                                setMenuOpen(false);
                            }}
                        >
                            고객센터
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleLogout}
                        >
                            로그아웃
                        </Button>
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between">
                <Button
                    variant={activeTab === 'available' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('available')}
                    className="text-xs sm:text-sm"
                >
                    주문
                </Button>
                <Button
                    variant={activeTab === 'contract' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('contract')}
                    className="text-xs sm:text-sm"
                >
                    계약
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
                    고객센터
                </Button>
            </div>
        </div>
        <Dialog open={regionFilterOpen} onOpenChange={setRegionFilterOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>원하는 출발지를 모두 선택하세요</DialogTitle>
                    <DialogDescription>
                        지역을 선택하면 필터에 적용됩니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-2">
                    {regions.map((region) => (
                        <Button
                            key={region}
                            variant={selectedRegion === region ? 'default' : 'outline'}
                            onClick={() => setSelectedRegion(region)}
                        >
                            {region}
                        </Button>
                    ))}
                </div>
                <Button onClick={() => setRegionFilterOpen(false)}>확인</Button>
            </DialogContent>
        </Dialog>

        <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>원하는 출발일을 선택하세요</DialogTitle>
                    <DialogDescription>
                        날짜를 선택하면 필터에 적용됩니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Button
                            variant="outline"
                            onClick={() => setSelectedDate('')}
                        >
                            초기화
                        </Button>
                        <Button onClick={() => setDateFilterOpen(false)}>확인</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={paxFilterOpen} onOpenChange={setPaxFilterOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>인원수를 입력해주세요</DialogTitle>
                    <DialogDescription>
                        최소/최대 인원으로 필터링합니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            type="number"
                            placeholder="최소"
                            value={minPax}
                            onChange={(e) => setMinPax(e.target.value)}
                        />
                        <Input
                            type="number"
                            placeholder="최대"
                            value={maxPax}
                            onChange={(e) => setMaxPax(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setMinPax('');
                                setMaxPax('');
                            }}
                        >
                            초기화
                        </Button>
                        <Button onClick={() => setPaxFilterOpen(false)}>확인</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
