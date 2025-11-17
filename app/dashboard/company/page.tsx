'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authAPI, tripsAPI, bidsAPI } from '@/lib/api';
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

export default function CompanyDashboard() {
    const [user, setUser] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [myBids, setMyBids] = useState<Trip[]>([]);
    const [awardedTrips, setAwardedTrips] = useState<Trip[]>([]);
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
            alert('Please enter a valid price (positive numbers only)');
            return;
        }

        try {
            await bidsAPI.create(tripId, bidData.price, bidData.note);
            setBidData({ price: 0, note: '' });
            loadData();
        } catch (error) {
            console.error('Error creating bid:', error);
            alert('Failed to create bid');
        }
    }

    async function handleWithdrawBid(trip: Trip) {
        if (!confirm('Are you sure you want to withdraw this bid?')) {
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
            alert('Failed to withdraw bid');
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Bus Company Dashboard</h1>
                    <div className="flex gap-4 items-center">
                        <span className="text-gray-600">{user?.email}</span>
                        <Button onClick={handleLogout} variant="outline">
                            Logout
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
                        Available Trips
                    </Button>
                    <Button
                        onClick={() => setActiveTab('myBids')}
                        variant={activeTab === 'myBids' ? 'default' : 'outline'}
                        className="w-full sm:w-auto"
                    >
                        My Bids & Awards
                    </Button>
                </div>

                {activeTab === 'myBids' && (
                    <>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-4">
                                Awarded Trips
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
                                                            Awarded
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p>
                                                        Passengers: {trip.paxCount}
                                                    </p>
                                                    <p>
                                                        Bus Size:{' '}
                                                        {trip.busSize}
                                                    </p>
                                                    <div className="mt-4 p-3 bg-green-100 rounded">
                                                        <p className="font-bold text-green-800">
                                                            🎉 Awarded: $
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
                                    No awarded trips
                                </p>
                            )}
                        </div>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-4">
                                My Bids
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
                                                        <Badge>Bid Placed</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p>
                                                        Passengers: {trip.paxCount}
                                                    </p>
                                                    <p>
                                                        Bus Size:{' '}
                                                        {trip.busSize}
                                                    </p>
                                                    <div className="mt-4 p-3 bg-green-50 rounded">
                                                        <p className="font-semibold text-green-700">
                                                            My Bid: $
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
                                                        Withdraw Bid
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    No bids placed
                                </p>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'available' && (
                    <div>
                        <h2 className="text-xl font-bold mb-4">
                            Available Trips
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
                                            <Badge>{trip.status}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p>Passengers: {trip.paxCount}</p>
                                        <p>Bus Size: {trip.busSize}</p>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button className="mt-4">
                                                    Place Bid
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Place Bid
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Enter bid information
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div>
                                                        <Label>Price ($)</Label>
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
                                                            Note (Optional)
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
                                                        Submit Bid
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
