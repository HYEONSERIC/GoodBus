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
import { authAPI, notificationsAPI } from '@/lib/api';

function ConsentRow({
    label,
    checked,
    disabled,
    onToggle,
}: {
    label: string;
    checked: boolean;
    disabled?: boolean;
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
                disabled={disabled}
                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors disabled:opacity-50 ${
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
    const [quoteAlertConsent, setQuoteAlertConsent] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        authAPI
            .getMe()
            .then((data) => {
                if (cancelled) return;
                setQuoteAlertConsent(Boolean(data.user?.quoteAlertConsent));
                setLoaded(true);
            })
            .catch(() => {
                // 로그인 세션이 아직 없는 등 실패 시 토글은 조용히 비활성 상태로 둠
            });
        return () => {
            cancelled = true;
        };
    }, []);

    async function toggleQuoteAlertConsent() {
        const next = !quoteAlertConsent;
        setQuoteAlertConsent(next);
        setSaving(true);
        try {
            await notificationsAPI.updateQuoteAlertConsent(next);
        } catch {
            setQuoteAlertConsent(!next);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-7 w-7 p-0 text-gray-700 hover:bg-transparent hover:text-black"
                    aria-label="알림 설정"
                >
                    <Bell className="h-5 w-5" />
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
                        disabled={!loaded || saving}
                        onToggle={toggleQuoteAlertConsent}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
