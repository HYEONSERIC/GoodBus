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
            alert('Failed to create trip');
        }
    }

    async function awardTrip(tripId: string) {
        try {
            await tripsAPI.award(tripId, selectedBid);
            setSelectedTrip(null);
            loadData();
        } catch (error) {
            console.error('Error awarding trip:', error);
            alert('Failed to award bid');
        }
    }

    async function cancelTrip(tripId: string) {
        if (!confirm('Are you sure you want to cancel this trip?')) {
            return;
        }

        try {
            await tripsAPI.cancel(tripId);
            loadData();
        } catch (error) {
            console.error('Error cancelling trip:', error);
            alert('Failed to cancel trip');
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Passenger Dashboard</h1>
                    <div className="flex gap-4 items-center">
                        <span className="text-gray-600">{user?.email}</span>
                        <Button onClick={handleLogout} variant="outline">
                            Logout
                        </Button>
                    </div>
                </div>

                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                        <Button>Create New Trip</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Trip</DialogTitle>
                            <DialogDescription>
                                Enter trip information
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Origin</Label>
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
                                <Label>Destination</Label>
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
                                <Label>Date & Time</Label>
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
                                <Label>Number of Passengers</Label>
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
                                <Label>Bus Size</Label>
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
                                            Small
                                        </SelectItem>
                                        <SelectItem value="medium">
                                            Medium
                                        </SelectItem>
                                        <SelectItem value="large">
                                            Large
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={createTrip} className="w-full">
                                Create Trip
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
                                            ? 'Awarded'
                                            : 'Open'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p>Passengers: {trip.paxCount}</p>
                                <p>Bus Size: {trip.busSize}</p>
                                <p className="mt-2 font-semibold">
                                    Bids: {trip.bids?.length || 0}
                                </p>
                                {trip.bids && trip.bids.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {trip.bids.map((bid: Bid) => (
                                            <Card key={bid.id} className="p-3">
                                                <div className="flex justify-between">
                                                    <div>
                                                        <p className="font-semibold">
                                                            ${bid.price}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {bid.note}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {bid.bidder.email}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary">
                                                        {bid.status}
                                                    </Badge>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                                {trip.status === 'open' && (
                                    <div className="flex gap-2 mt-4">
                                        {trip.bids && trip.bids.length > 0 && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button>Award Bid</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>
                                                            Award Bid
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <Select
                                                        value={selectedBid}
                                                        onValueChange={
                                                            setSelectedBid
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a bid" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {trip.bids.map(
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
                                                        Award
                                                    </Button>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        <Button
                                            variant="destructive"
                                            onClick={() => cancelTrip(trip.id)}
                                        >
                                            Cancel Trip
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
