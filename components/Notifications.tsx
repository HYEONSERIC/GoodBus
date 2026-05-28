'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { notificationsAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

const QUOTE_ALERT_CONSENT_KEY = 'goodbus_alert_consent_quote';
const MARKETING_ALERT_CONSENT_KEY = 'goodbus_alert_consent_marketing';

function ConsentRow({
    label,
    checked,
    onToggle,
}: {
    label: string;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="flex items-center justify-between border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm text-gray-800">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={`${label} ${checked ? '켜짐' : '꺼짐'}`}
                onClick={onToggle}
                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                    checked ? 'justify-end' : 'justify-start'
                } ${
                    checked ? 'bg-gray-900' : 'bg-gray-300'
                }`}
            >
                <span
                    className="h-5 w-5 rounded-full bg-white shadow"
                />
            </button>
        </div>
    );
}

export function Notifications() {
    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [quoteAlertConsent, setQuoteAlertConsent] = useState(false);
    const [marketingAlertConsent, setMarketingAlertConsent] = useState(false);

    useEffect(() => {
        try {
            const quoteSaved = localStorage.getItem(QUOTE_ALERT_CONSENT_KEY);
            const marketingSaved = localStorage.getItem(
                MARKETING_ALERT_CONSENT_KEY
            );
            setQuoteAlertConsent(quoteSaved === 'true');
            setMarketingAlertConsent(marketingSaved === 'true');
        } catch {
            setQuoteAlertConsent(false);
            setMarketingAlertConsent(false);
        }
        void loadUnreadCount();

        const interval = setInterval(() => {
            void loadUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

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

    function toggleQuoteAlertConsent() {
        const next = !quoteAlertConsent;
        setQuoteAlertConsent(next);
        try {
            localStorage.setItem(QUOTE_ALERT_CONSENT_KEY, String(next));
        } catch {
            // ignore localStorage failures
        }
    }

    function toggleMarketingAlertConsent() {
        const next = !marketingAlertConsent;
        setMarketingAlertConsent(next);
        try {
            localStorage.setItem(MARKETING_ALERT_CONSENT_KEY, String(next));
        } catch {
            // ignore localStorage failures
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-7 w-7 p-0 text-gray-700 hover:bg-transparent hover:text-black"
                    aria-label="알림 설정"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
                            variant="destructive"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
                <DialogHeader>
                    <DialogTitle>알림</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-1">
                    <ConsentRow
                        label="견적등록 알림"
                        checked={quoteAlertConsent}
                        onToggle={toggleQuoteAlertConsent}
                    />
                    <ConsentRow
                        label="마케팅 수신동의"
                        checked={marketingAlertConsent}
                        onToggle={toggleMarketingAlertConsent}
                    />
                    <p className="px-1 text-xs text-gray-500">
                        현재는 기기 로컬에 저장됩니다. 추후 카카오 알림 연동 시 서버
                        동의 상태와 연동됩니다.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
