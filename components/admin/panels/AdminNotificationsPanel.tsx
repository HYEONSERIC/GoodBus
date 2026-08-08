'use client';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
<AdminFilterBar>
                        <AdminFilterField label="사용자/메시지 검색">
                            <Input
                                value={notificationSearch}
                                onChange={(e) =>
                                    setNotificationSearch(e.target.value)
                                }
                                placeholder="email, title, message"
                            />
                        </AdminFilterField>
                        <AdminFilterField label="타입">
                            <select
                                className={ADMIN_SELECT_CLASS}
                                value={notificationTypeFilter}
                                onChange={(e) =>
                                    setNotificationTypeFilter(e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                <option value="BID_RECEIVED">입찰 도착</option>
                                <option value="BID_AWARDED">입찰 완료</option>
                            </select>
                        </AdminFilterField>
                        <AdminFilterField label="시작일">
                            <Input
                                type="date"
                                value={notificationStartDate}
                                onChange={(e) =>
                                    setNotificationStartDate(e.target.value)
                                }
                            />
                        </AdminFilterField>
                        <AdminFilterField label="종료일">
                            <Input
                                type="date"
                                value={notificationEndDate}
                                onChange={(e) =>
                                    setNotificationEndDate(e.target.value)
                                }
                            />
                        </AdminFilterField>
                        <Button
                            variant="outline"
                            onClick={() => handleNotificationHistorySearch(1)}
                        >
                            검색
                        </Button>
                    </AdminFilterBar>

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
                        emptyMessage="조건에 맞는 알림이 없습니다. 검색어나 기간을 넓혀 보세요."
                    >
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                                    <th className="py-2.5 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-slate-500">날짜</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">사용자</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">여정</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {ADMIN_AMOUNT_HEADERS.price}
                                    </th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">타입</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notificationHistory.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="py-3 pr-4 pl-4 whitespace-nowrap text-slate-500">
                                            {new Date(item.readAt).toLocaleString()}
                                        </td>
                                        <td className="py-3 pr-4 text-slate-900">
                                            {item.user.email}
                                        </td>
                                        <td className="py-3 pr-4 text-slate-600">
                                            {item.trip || item.bid?.trip
                                                ? `${(item.trip || item.bid?.trip)!.origin} -> ${(item.trip || item.bid?.trip)!.destination}`
                                                : '-'}
                                        </td>
                                        <td className="py-3 pr-4 tabular-nums whitespace-nowrap text-slate-700">
                                            {formatManWonOrDash(
                                                item.bid?.price != null
                                                    ? Number(item.bid.price)
                                                    : null,
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-slate-600">
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
