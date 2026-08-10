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
    bidStatusTone,
    tripStatusTone,
} from '@/lib/adminStatusLabels';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminDeepLink } from '@/components/admin/AdminDeepLink';
import { AdminAsyncContent } from '@/components/admin/AdminAsyncContent';
import { AdminActivitySectionFooter } from '@/components/admin/AdminActivitySectionFooter';
import {
    ADMIN_AMOUNT_HEADERS,
    formatManWon,
} from '@/lib/adminRevenueDisplay';

const BIDS_LIST_MAX = 200;

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
    bidsTake,
    bidsMeta,
    handleBidLoadMore,
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
                        emptyMessage="조건에 맞는 입찰이 없습니다. 검색어나 기간을 조정해 보세요."
                    >
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                                    <th className="py-2.5 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-slate-500">시간</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">여정</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">승객</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">입찰자</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">역할</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">입찰 상태</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">여정 상태</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {ADMIN_AMOUNT_HEADERS.amount}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {bidResults.map((bid) => (
                                    <tr
                                        key={bid.id}
                                        className={`border-b border-slate-100 last:border-0 ${
                                            highlightBidId === bid.id
                                                ? 'bg-amber-50'
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <td className="py-3 pr-4 pl-4 whitespace-nowrap text-slate-500">
                                            {new Date(
                                                bid.createdAt
                                            ).toLocaleString()}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <AdminDeepLink
                                                onNavigate={() =>
                                                    openBidsForTrip(bid.trip.id)
                                                }
                                            >
                                                {bid.trip.origin} →{' '}
                                                {bid.trip.destination}
                                            </AdminDeepLink>
                                        </td>
                                        <td className="py-3 pr-4">
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
                                            <span className="mx-1 text-slate-300">
                                                ·
                                            </span>
                                            <AdminDeepLink
                                                className="text-xs text-slate-500"
                                                onNavigate={() =>
                                                    openUserProfile(
                                                        bid.trip.passenger.id,
                                                    )
                                                }
                                            >
                                                프로필
                                            </AdminDeepLink>
                                        </td>
                                        <td className="py-3 pr-4">
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
                                            <span className="mx-1 text-slate-300">
                                                ·
                                            </span>
                                            <AdminDeepLink
                                                className="text-xs text-slate-500"
                                                onNavigate={() =>
                                                    openUserProfile(bid.bidder.id)
                                                }
                                            >
                                                프로필
                                            </AdminDeepLink>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-600">
                                            {bid.bidder.role}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <AdminStatusBadge tone={bidStatusTone(bid.status)}>
                                                {formatBidStatusLabel(bid.status)}
                                            </AdminStatusBadge>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <AdminStatusBadge tone={tripStatusTone(bid.trip.status)}>
                                                {formatTripStatusLabel(bid.trip.status)}
                                            </AdminStatusBadge>
                                        </td>
                                        <td className="py-3 pr-4 tabular-nums font-medium text-slate-900">
                                            {formatManWon(Number(bid.price))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <AdminActivitySectionFooter
                        shownCount={bidResults.length}
                        totalCount={bidsMeta?.totalMatching}
                        activityTake={bidsTake}
                        onLoadMore={handleBidLoadMore}
                        max={BIDS_LIST_MAX}
                        step={50}
                    />
                    </AdminAsyncContent>
</AdminPanelCard>
  );
}
