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
import {
    BID_STATUS_FILTER_OPTIONS,
    TRIP_STATUS_FILTER_OPTIONS,
    formatBidStatusLabel,
    formatTripStatusLabel,
} from '@/lib/adminStatusLabels';
import { AdminDeepLink } from '@/components/admin/AdminDeepLink';
import { AdminAsyncContent } from '@/components/admin/AdminAsyncContent';
import {
    ADMIN_AMOUNT_HEADERS,
    formatManWon,
} from '@/lib/adminRevenueDisplay';

export function AdminBidsPanel() {
  const {
    bidSearch,
    setBidSearch,
    bidStatusFilter,
    setBidStatusFilter,
    tripStatusFilter,
    setTripStatusFilter,
    bidStartDate,
    setBidStartDate,
    bidEndDate,
    setBidEndDate,
    bidResults,
    bidLoading,
    bidError,
    setBidError,
    highlightBidId,
    handleBidSearch,
    openUserProfile,
    openBidsForBidder,
    openBidsForPassenger,
    openBidsForTrip,
} = useAdminDashboard();
  return (
<AdminPanelCard>
<AdminFilterBar>
                        <AdminFilterField label="검색">
                            <Input
                                value={bidSearch}
                                onChange={(e) => setBidSearch(e.target.value)}
                                placeholder="이메일/출발지/도착지"
                            />
                        </AdminFilterField>
                        <AdminFilterField label="입찰 상태">
                            <select
                                className={ADMIN_SELECT_CLASS}
                                value={bidStatusFilter}
                                onChange={(e) =>
                                    setBidStatusFilter(e.target.value)
                                }
                            >
                                {BID_STATUS_FILTER_OPTIONS.map((opt) => (
                                    <option key={opt.value || 'all'} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </AdminFilterField>
                        <AdminFilterField label="여정 상태">
                            <select
                                className={ADMIN_SELECT_CLASS}
                                value={tripStatusFilter}
                                onChange={(e) =>
                                    setTripStatusFilter(e.target.value)
                                }
                            >
                                {TRIP_STATUS_FILTER_OPTIONS.map((opt) => (
                                    <option key={opt.value || 'all'} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </AdminFilterField>
                        <AdminFilterField label="시작일">
                            <Input
                                type="date"
                                value={bidStartDate}
                                onChange={(e) => setBidStartDate(e.target.value)}
                            />
                        </AdminFilterField>
                        <AdminFilterField label="종료일">
                            <Input
                                type="date"
                                value={bidEndDate}
                                onChange={(e) => setBidEndDate(e.target.value)}
                            />
                        </AdminFilterField>
                        <Button variant="outline" onClick={handleBidSearch}>
                            검색
                        </Button>
                    </AdminFilterBar>

                    <AdminAsyncContent
                        loading={bidLoading}
                        error={bidError}
                        onRetry={() => void handleBidSearch()}
                        onDismissError={() => setBidError('')}
                        skeletonVariant="table"
                        skeletonRows={6}
                        skeletonColumns={8}
                        hasData={bidResults.length > 0}
                        empty={!bidLoading && bidResults.length === 0}
                        emptyMessage="검색 결과가 없습니다."
                    >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pr-4">시간</th>
                                    <th className="py-2 pr-4">여정</th>
                                    <th className="py-2 pr-4">승객</th>
                                    <th className="py-2 pr-4">입찰자</th>
                                    <th className="py-2 pr-4">역할</th>
                                    <th className="py-2 pr-4">입찰 상태</th>
                                    <th className="py-2 pr-4">여정 상태</th>
                                    <th className="py-2 pr-4">
                                        {ADMIN_AMOUNT_HEADERS.amount}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {bidResults.map((bid) => (
                                    <tr
                                        key={bid.id}
                                        className={`border-b ${
                                            highlightBidId === bid.id
                                                ? 'bg-amber-50'
                                                : ''
                                        }`}
                                    >
                                        <td className="py-2 pr-4">
                                            {new Date(
                                                bid.createdAt
                                            ).toLocaleString()}
                                        </td>
                                        <td className="py-2 pr-4">
                                            <AdminDeepLink
                                                onNavigate={() =>
                                                    openBidsForTrip(bid.trip.id)
                                                }
                                            >
                                                {bid.trip.origin} →{' '}
                                                {bid.trip.destination}
                                            </AdminDeepLink>
                                        </td>
                                        <td className="py-2 pr-4">
                                            <AdminDeepLink
                                                onNavigate={() =>
                                                    openBidsForPassenger({
                                                        passengerId:
                                                            bid.trip.passenger.id,
                                                        email: bid.trip.passenger
                                                            .email,
                                                    })
                                                }
                                            >
                                                {bid.trip.passenger.email}
                                            </AdminDeepLink>
                                            <span className="mx-1 text-gray-300">
                                                ·
                                            </span>
                                            <AdminDeepLink
                                                className="text-xs text-gray-600"
                                                onNavigate={() =>
                                                    openUserProfile(
                                                        bid.trip.passenger.id,
                                                    )
                                                }
                                            >
                                                프로필
                                            </AdminDeepLink>
                                        </td>
                                        <td className="py-2 pr-4">
                                            <AdminDeepLink
                                                onNavigate={() =>
                                                    openBidsForBidder({
                                                        bidderId: bid.bidder.id,
                                                        email: bid.bidder.email,
                                                        highlightBidId: bid.id,
                                                    })
                                                }
                                            >
                                                {bid.bidder.email}
                                            </AdminDeepLink>
                                            <span className="mx-1 text-gray-300">
                                                ·
                                            </span>
                                            <AdminDeepLink
                                                className="text-xs text-gray-600"
                                                onNavigate={() =>
                                                    openUserProfile(bid.bidder.id)
                                                }
                                            >
                                                프로필
                                            </AdminDeepLink>
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.bidder.role}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {formatBidStatusLabel(bid.status)}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {formatTripStatusLabel(bid.trip.status)}
                                        </td>
                                        <td className="py-2 pr-4 tabular-nums">
                                            {formatManWon(Number(bid.price))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </AdminAsyncContent>
</AdminPanelCard>
  );
}
