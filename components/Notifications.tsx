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

export function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadNotifications();
        loadUnreadCount();

        // Poll for new notifications every 30 seconds
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
        } catch (error: any) {
            // Silently fail - notifications are not critical
            console.error('Error loading notifications:', error);
            // Set empty array on error to prevent UI issues
            setNotifications([]);
        }
    }

    async function loadUnreadCount() {
        try {
            const data = await notificationsAPI.getUnreadCount();
            setUnreadCount(data.count || 0);
        } catch (error: any) {
            // Silently fail - notifications are not critical
            console.error('Error loading unread count:', error);
            // Set count to 0 on error to prevent UI issues
            setUnreadCount(0);
        }
    }

    async function markAsRead(id: string) {
        try {
            await notificationsAPI.markAsRead(id);
            await loadNotifications();
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
            await loadUnreadCount();
        } catch (error) {
            console.error('Error marking all as read:', error);
        } finally {
            setLoading(false);
        }
    }

    const unreadNotifications = notifications.filter((n) => !n.read);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="relative">
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
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center">
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
                                모두 읽음 처리
                            </Button>
                        )}
                    </div>
                </DialogHeader>
                <div className="space-y-2 mt-4">
                    {notifications.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            알림이 없습니다
                        </p>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                    notification.read
                                        ? 'bg-gray-50 border-gray-200'
                                        : 'bg-blue-50 border-blue-200'
                                }`}
                                onClick={() => {
                                    if (!notification.read) {
                                        markAsRead(notification.id);
                                    }
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm">
                                                {notification.title}
                                            </p>
                                            {!notification.read && (
                                                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                            )}
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
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

