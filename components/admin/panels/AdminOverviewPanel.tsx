'use client';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminFilterBar, AdminFilterField, ADMIN_SELECT_CLASS } from '@/components/admin/AdminFilterBar';

export function AdminOverviewPanel() {
  const {
    overview,
    users,
    overviewTripLimit,
    setOverviewTripLimit,
    overviewBidLimit,
    setOverviewBidLimit,
} = useAdminDashboard();
  if (!overview) return null;
  return (
<AdminPanelCard>
<div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">전체 사용자</p>
                            <p className="text-2xl font-semibold">
                                {overview.counts.users}
                            </p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">전체 여정</p>
                            <p className="text-2xl font-semibold">
                                {overview.counts.trips}
                            </p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">전체 입찰</p>
                            <p className="text-2xl font-semibold">
                                {overview.counts.bids}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-lg border p-4">
                            <h2 className="text-lg font-semibold mb-3">최근 여정</h2>
                            <div className="space-y-3 text-sm text-gray-700 max-h-80 overflow-y-auto">
                                {overview.recentTrips
                                    .slice(0, overviewTripLimit)
                                    .map((trip) => (
                                        <div
                                            key={trip.id}
                                            className="rounded border p-3"
                                        >
                                            <div className="font-medium">
                                                {trip.origin} → {trip.destination}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                승객: {trip.passenger.email}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            {overviewTripLimit < overview.recentTrips.length && (
                                <div className="mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setOverviewTripLimit((prev) =>
                                                Math.min(
                                                    prev + 5,
                                                    overview.recentTrips.length
                                                )
                                            )
                                        }
                                    >
                                        더보기
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border p-4">
                            <h2 className="text-lg font-semibold mb-3">최근 입찰</h2>
                            <div className="space-y-3 text-sm text-gray-700 max-h-80 overflow-y-auto">
                                {overview.recentBids
                                    .slice(0, overviewBidLimit)
                                    .map((bid) => (
                                        <div
                                            key={bid.id}
                                            className="rounded border p-3"
                                        >
                                            <div className="font-medium">
                                                {bid.trip.origin} → {bid.trip.destination}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                입찰자: {bid.bidder.email} (
                                                {bid.bidder.role})
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                금액: {Number(bid.price).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            {overviewBidLimit < overview.recentBids.length && (
                                <div className="mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setOverviewBidLimit((prev) =>
                                                Math.min(
                                                    prev + 5,
                                                    overview.recentBids.length
                                                )
                                            )
                                        }
                                    >
                                        더보기
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
</AdminPanelCard>
  );
}
