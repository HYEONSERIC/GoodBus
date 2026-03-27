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
    const [activeTab, setActiveTab] = useState<'available' | 'myBids'>(
        'available'
    );

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'myBids') {
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

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">운전자 대시보드</h1>
                    <div className="flex gap-4 items-center">
                        <Notifications />
                        <span className="text-gray-600">{user?.email}</span>
                        <Button onClick={handleLogout} variant="outline">
                            로그아웃
                        </Button>
                    </div>
                </div>

                {/* 탭 버튼 */}
                <div className="flex gap-4 mb-6">
                    <Button
                        onClick={() => setActiveTab('available')}
                        variant={
                            activeTab === 'available' ? 'default' : 'outline'
                        }
                        className="w-full sm:w-auto"
                    >
                        가능한 여정
                    </Button>
                    <Button
                        onClick={() => setActiveTab('myBids')}
                        variant={activeTab === 'myBids' ? 'default' : 'outline'}
                        className="w-full sm:w-auto"
                    >
                        내 입찰 및 낙찰
                    </Button>
                </div>

                {activeTab === 'myBids' && (
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
                        <h2 className="text-xl font-bold mb-4">
                            가능한 여정
                        </h2>
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
                                    <CardContent>
                                        <p>승객 수: {trip.paxCount}</p>
                                        <p>버스 크기: {trip.busSize === 'small' ? '소형' : trip.busSize === 'medium' ? '중형' : '대형'}</p>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button className="mt-4">
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
            </div>
        </div>
    );
}
