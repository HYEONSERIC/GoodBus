'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { notificationsAPI } from '@/lib/api';
import { format } from 'date-fns';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    tripId?: string;
    bidId?: string;
    createdAt: string;
}

interface NotificationHistory {
    id: string;
    type: string;
    title: string;
    tripId?: string;
    bidId?: string;
    notificationCreatedAt: string;
    readAt: string;
    trip?: {
        id: string;
        origin: string;
        destination: string;
        dateTime: string;
    } | null;
    bid?: {
        id: string;
        price: string;
        status: string;
        trip?: {
            id: string;
            origin: string;
            destination: string;
            dateTime: string;
        } | null;
    } | null;
}

function formatType(item: NotificationHistory) {
    if (item.bid?.status === 'awarded' || item.type === 'BID_AWARDED') {
        return '입찰 성공';
    }
    if (['lost', 'withdrawn'].includes(item.bid?.status || '')) {
        return '입찰 실패';
    }
    if (item.title.toLowerCase().includes('cancel')) {
        return '입찰 실패';
    }
    return '입찰 대기';
}

function formatTrip(item: NotificationHistory) {
    const trip = item.trip || item.bid?.trip;
    if (!trip) return '-';
    return `${trip.origin} -> ${trip.destination}`;
}

function formatPrice(item: NotificationHistory) {
    if (!item.bid?.price) return '-';
    return Number(item.bid.price).toLocaleString();
}

import { getErrorMessage } from '@/lib/errors';

export function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [history, setHistory] = useState<NotificationHistory[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeView, setActiveView] = useState<'current' | 'history'>(
        'current'
    );
    const [historyType, setHistoryType] = useState('');
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const historyPageSize = 10;

    useEffect(() => {
        loadNotifications();
        loadHistory(1);
        loadUnreadCount();

        const interval = setInterval(() => {
            loadNotifications();
            loadUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    async function loadNotifications() {
        try {
            const data = await notificationsAPI.getAll();
            setNotifications(data.notifications || []);
        } catch (error: unknown) {
            console.error(
                'Error loading notifications:',
                getErrorMessage(error, 'Unknown error')
            );
            setNotifications([]);
        }
    }

    async function loadHistory(page = historyPage) {
        try {
            const data = await notificationsAPI.getHistory({
                page,
                pageSize: historyPageSize,
                type: historyType || undefined,
                startDate: historyStartDate || undefined,
                endDate: historyEndDate || undefined,
            });
            setHistory(data.history || []);
            setHistoryPage(data.pagination?.page || page);
            setHistoryTotalPages(data.pagination?.totalPages || 1);
        } catch (error: unknown) {
            console.error(
                'Error loading notification history:',
                getErrorMessage(error, 'Unknown error')
            );
            setHistory([]);
            setHistoryTotalPages(1);
        }
    }

    async function loadUnreadCount() {
        try {
            const data = await notificationsAPI.getUnreadCount();
            setUnreadCount(data.count || 0);
        } catch (error: unknown) {
            console.error(
                'Error loading unread count:',
                getErrorMessage(error, 'Unknown error')
            );
            setUnreadCount(0);
        }
    }

    async function markAsRead(id: string) {
        try {
            setNotifications((prev) =>
                prev.filter((notification) => notification.id !== id)
            );
            await notificationsAPI.markAsRead(id);
            await loadNotifications();
            await loadHistory(1);
            await loadUnreadCount();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async function markAllAsRead() {
        try {
            setLoading(true);
            await notificationsAPI.markAllAsRead();
            await loadNotifications();
            await loadHistory(1);
            await loadUnreadCount();
        } catch (error) {
            console.error('Error marking all as read:', error);
        } finally {
            setLoading(false);
        }
    }

    async function deleteHistory(id: string) {
        setHistory((prev) => prev.filter((item) => item.id !== id));

        try {
            await notificationsAPI.deleteHistory(id);
            await loadHistory(history.length === 1 ? Math.max(historyPage - 1, 1) : historyPage);
        } catch (error) {
            console.error('Error deleting notification history:', error);
            await loadHistory(historyPage);
        }
    }

    async function clearHistory() {
        if (!window.confirm('알림 히스토리를 모두 삭제할까요?')) return;

        try {
            await notificationsAPI.clearHistory();
            await loadHistory(1);
        } catch (error) {
            console.error('Error clearing notification history:', error);
        }
    }

    const unreadNotifications = notifications.filter((n) => !n.read);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-7 w-7 p-0 text-gray-700 hover:bg-transparent hover:text-black"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                            variant="destructive"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center gap-4">
                        <div>
                            <DialogTitle>알림</DialogTitle>
                            <DialogDescription>
                                {unreadCount > 0
                                    ? `읽지 않은 알림 ${unreadCount}개`
                                    : '읽지 않은 알림이 없습니다'}
                            </DialogDescription>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={markAllAsRead}
                                disabled={loading}
                            >
                                모두 읽음
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button
                        variant={activeView === 'current' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setActiveView('current');
                            loadNotifications();
                        }}
                    >
                        New
                    </Button>
                    <Button
                        variant={activeView === 'history' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setActiveView('history');
                            loadHistory(1);
                        }}
                    >
                        History
                    </Button>
                </div>

                <div className="space-y-2 mt-4">
                    {activeView === 'current' && notifications.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            알림이 없습니다
                        </p>
                    ) : activeView === 'current' ? (
                        unreadNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className="p-3 rounded-lg border cursor-pointer transition-colors bg-blue-50 border-blue-200"
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm">
                                                {notification.title}
                                            </p>
                                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {format(
                                                new Date(notification.createdAt),
                                                'MMM d, yyyy h:mm a'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="space-y-3">
                            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                                <select
                                    className="border rounded px-2 py-2 text-sm"
                                    value={historyType}
                                    onChange={(e) => setHistoryType(e.target.value)}
                                >
                                    <option value="">전체 타입</option>
                                    <option value="BID_RECEIVED">입찰 도착</option>
                                    <option value="BID_AWARDED">입찰 완료</option>
                                </select>
                                <Input
                                    type="date"
                                    value={historyStartDate}
                                    onChange={(e) =>
                                        setHistoryStartDate(e.target.value)
                                    }
                                />
                                <Input
                                    type="date"
                                    value={historyEndDate}
                                    onChange={(e) =>
                                        setHistoryEndDate(e.target.value)
                                    }
                                />
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="px-3 whitespace-nowrap"
                                        onClick={() => loadHistory(1)}
                                    >
                                        검색
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="px-3 whitespace-nowrap"
                                        onClick={clearHistory}
                                        disabled={history.length === 0}
                                    >
                                        전체 삭제
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-lg border overflow-hidden">
                                <table className="w-full table-fixed text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50 text-left">
                                            <th className="py-2 px-3 w-[28%]">날짜</th>
                                            <th className="py-2 px-3 w-[30%]">여정</th>
                                            <th className="py-2 px-3 w-[13%]">가격</th>
                                            <th className="py-2 px-3 w-[17%]">타입</th>
                                            <th className="py-2 px-2 w-[12%] text-center">
                                                관리
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.length === 0 ? (
                                            <tr>
                                                <td
                                                    className="py-6 px-3 text-center text-gray-500"
                                                    colSpan={5}
                                                >
                                                    히스토리가 없습니다
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((item) => (
                                                <tr key={item.id} className="border-b">
                                                    <td className="py-2 px-3 whitespace-nowrap">
                                                        {format(
                                                            new Date(item.readAt),
                                                            'yyyy-MM-dd HH:mm'
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 break-words">
                                                        {formatTrip(item)}
                                                    </td>
                                                    <td className="py-2 px-3 truncate">
                                                        {formatPrice(item)}
                                                    </td>
                                                    <td className="py-2 px-3 break-keep">
                                                        {formatType(item)}
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 px-2 text-xs"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                deleteHistory(item.id);
                                                            }}
                                                        >
                                                            삭제
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span>
                                    {historyPage} / {Math.max(historyTotalPages, 1)}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={historyPage <= 1}
                                        onClick={() => loadHistory(historyPage - 1)}
                                    >
                                        이전
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={historyPage >= historyTotalPages}
                                        onClick={() => loadHistory(historyPage + 1)}
                                    >
                                        다음
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
