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
import { AdminAsyncContent } from '@/components/admin/AdminAsyncContent';
import { formatNotificationResult } from '@/lib/adminNotifications';
import {
    ADMIN_AMOUNT_HEADERS,
    formatManWonOrDash,
} from '@/lib/adminRevenueDisplay';

export function AdminNotificationsPanel() {
  const {
    notificationHistory,
    notificationSearch,
    setNotificationSearch,
    notificationTypeFilter,
    setNotificationTypeFilter,
    notificationStartDate,
    setNotificationStartDate,
    notificationEndDate,
    setNotificationEndDate,
    notificationPage,
    notificationTotalPages,
    notificationLoading,
    notificationError,
    setNotificationError,
    handleNotificationHistorySearch,
} = useAdminDashboard();
  return (
<AdminPanelCard>
<div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <Label>사용자/메시지 검색</Label>
                            <Input
                                value={notificationSearch}
                                onChange={(e) =>
                                    setNotificationSearch(e.target.value)
                                }
                                placeholder="email, title, message"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>타입</Label>
                            <select
                                className="border rounded px-2 py-1"
                                value={notificationTypeFilter}
                                onChange={(e) =>
                                    setNotificationTypeFilter(e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                <option value="BID_RECEIVED">입찰 도착</option>
                                <option value="BID_AWARDED">입찰 완료</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>시작일</Label>
                            <Input
                                type="date"
                                value={notificationStartDate}
                                onChange={(e) =>
                                    setNotificationStartDate(e.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>종료일</Label>
                            <Input
                                type="date"
                                value={notificationEndDate}
                                onChange={(e) =>
                                    setNotificationEndDate(e.target.value)
                                }
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => handleNotificationHistorySearch(1)}
                        >
                            검색
                        </Button>
                    </div>

                    <AdminAsyncContent
                        loading={notificationLoading}
                        error={notificationError}
                        onRetry={() => handleNotificationHistorySearch(1)}
                        onDismissError={() => setNotificationError('')}
                        skeletonVariant="table"
                        skeletonRows={6}
                        skeletonColumns={5}
                        hasData={notificationHistory.length > 0}
                        empty={
                            !notificationLoading &&
                            notificationHistory.length === 0
                        }
                        emptyMessage="검색 결과가 없습니다."
                    >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pr-4">날짜</th>
                                    <th className="py-2 pr-4">사용자</th>
                                    <th className="py-2 pr-4">여정</th>
                                    <th className="py-2 pr-4">
                                        {ADMIN_AMOUNT_HEADERS.price}
                                    </th>
                                    <th className="py-2 pr-4">타입</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notificationHistory.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="py-2 pr-4 whitespace-nowrap">
                                            {new Date(item.readAt).toLocaleString()}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {item.user.email}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {item.trip || item.bid?.trip
                                                ? `${(item.trip || item.bid?.trip)!.origin} -> ${(item.trip || item.bid?.trip)!.destination}`
                                                : '-'}
                                        </td>
                                        <td className="py-2 pr-4 tabular-nums whitespace-nowrap">
                                            {formatManWonOrDash(
                                                item.bid?.price != null
                                                    ? Number(item.bid.price)
                                                    : null,
                                            )}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {formatNotificationResult(item)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </AdminAsyncContent>

                    <div className="flex items-center justify-between text-sm">
                        <span>
                            {notificationPage} /{' '}
                            {Math.max(notificationTotalPages, 1)}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={notificationPage <= 1}
                                onClick={() =>
                                    handleNotificationHistorySearch(
                                        notificationPage - 1
                                    )
                                }
                            >
                                이전
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    notificationPage >= notificationTotalPages
                                }
                                onClick={() =>
                                    handleNotificationHistorySearch(
                                        notificationPage + 1
                                    )
                                }
                            >
                                다음
                            </Button>
                        </div>
                    </div>
</AdminPanelCard>
  );
}
