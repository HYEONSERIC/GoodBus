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
    handleBidSearch,
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
                                <option value="">전체</option>
                                <option value="open">open</option>
                                <option value="withdrawn">withdrawn</option>
                                <option value="awarded">awarded</option>
                                <option value="lost">lost</option>
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
                                <option value="">전체</option>
                                <option value="open">open</option>
                                <option value="awarded">awarded</option>
                                <option value="cancelled">cancelled</option>
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

                    {bidError && (
                        <p className="text-sm text-red-500">{bidError}</p>
                    )}

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
                                    <th className="py-2 pr-4">금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bidLoading && (
                                    <tr>
                                        <td
                                            className="py-4 text-sm text-gray-500"
                                            colSpan={8}
                                        >
                                            조회 중...
                                        </td>
                                    </tr>
                                )}
                                {!bidLoading && bidResults.length === 0 && (
                                    <tr>
                                        <td
                                            className="py-4 text-sm text-gray-500"
                                            colSpan={8}
                                        >
                                            검색 결과가 없습니다.
                                        </td>
                                    </tr>
                                )}
                                {bidResults.map((bid) => (
                                    <tr key={bid.id} className="border-b">
                                        <td className="py-2 pr-4">
                                            {new Date(
                                                bid.createdAt
                                            ).toLocaleString()}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.trip.origin} →{' '}
                                            {bid.trip.destination}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.trip.passenger.email}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.bidder.email}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.bidder.role}
                                        </td>
                                        <td className="py-2 pr-4">{bid.status}</td>
                                        <td className="py-2 pr-4">
                                            {bid.trip.status}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {Number(bid.price).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
</AdminPanelCard>
  );
}
