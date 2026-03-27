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

export default function PassengerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
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
            dateTime.getTime() - dateTime.getTimezoneOffset() * 60000
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
                '여정 정보를 수정하면 모든 기존 입찰이 취소됩니다. 계속하시겠습니까?'
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

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">승객 대시보드</h1>
                    <div className="flex gap-4 items-center">
                        <Notifications />
                        <span className="text-gray-600">{user?.email}</span>
                        <Button onClick={handleLogout} variant="outline">
                            로그아웃
                        </Button>
                    </div>
                </div>

                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                        <Button>새 여정 만들기</Button>
                    </DialogTrigger>
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
                                <Input
                                    value={newTrip.origin}
                                    onChange={(e) =>
                                        setNewTrip({
                                            ...newTrip,
                                            origin: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label>도착지</Label>
                                <Input
                                    value={newTrip.destination}
                                    onChange={(e) =>
                                        setNewTrip({
                                            ...newTrip,
                                            destination: e.target.value,
                                        })
                                    }
                                />
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
                                여정 정보를 수정하세요. 모든 기존 입찰이 취소됩니다.
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

                <div className="mt-8 grid gap-6">
                    {trips.map((trip) => (
                        <Card key={trip.id}>
                            <CardHeader>
                                <div className="flex justify-between">
                                    <div>
                                        <CardTitle>
                                            {trip.origin} → {trip.destination}
                                        </CardTitle>
                                        <CardDescription>
                                            {format(
                                                new Date(trip.dateTime),
                                                'PPP p'
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
                                <p>버스 크기: {trip.busSize === 'small' ? '소형' : trip.busSize === 'medium' ? '중형' : '대형'}</p>
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
                                            .filter((bid: Bid) => bid.status === 'open')
                                            .map((bid: Bid) => (
                                                <Card key={bid.id} className="p-3">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <p className="font-semibold">
                                                                ${bid.price}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {bid.note || '메모 없음'}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                📧 {bid.bidder.email}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">
                                                            {bid.status === 'open' ? '진행중' : bid.status === 'awarded' ? '낙찰됨' : bid.status === 'withdrawn' ? '철회됨' : '실패'}
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
                                            onClick={() => openEditDialog(trip)}
                                        >
                                            여정 수정
                                        </Button>
                                        {trip.bids && trip.bids.length > 0 && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button>입찰 수주</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>
                                                            입찰 수주
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <Select
                                                        value={selectedBid}
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
                                                                    (bid: Bid) =>
                                                                        bid.status ===
                                                                        'open'
                                                                )
                                                                .map(
                                                                    (bid: Bid) => (
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
                                                                            }{' '}
                                                                            -{' '}
                                                                            {
                                                                                bid
                                                                                    .bidder
                                                                                    .email
                                                                            }
                                                                        </SelectItem>
                                                                    )
                                                                )}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        onClick={() =>
                                                            awardTrip(trip.id)
                                                        }
                                                        disabled={!selectedBid}
                                                    >
                                                        수주하기
                                                    </Button>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        <Button
                                            variant="destructive"
                                            onClick={() => cancelTrip(trip.id)}
                                        >
                                            여정 취소
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
