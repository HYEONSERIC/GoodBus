'use client';

import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AdminErrorBannerProps = {
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    retryLabel?: string;
    className?: string;
};

export function AdminErrorBanner({
    message,
    onRetry,
    onDismiss,
    retryLabel = '다시 시도',
    className = '',
}: AdminErrorBannerProps) {
    if (!message.trim()) return null;

    return (
        <div
            role="alert"
            className={`flex flex-wrap items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 ${className}`.trim()}
        >
            <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden
            />
            <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
            <div className="flex shrink-0 items-center gap-2">
                {onRetry ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-red-200 bg-white text-red-800 hover:bg-red-100"
                        onClick={onRetry}
                    >
                        {retryLabel}
                    </Button>
                ) : null}
                {onDismiss ? (
                    <button
                        type="button"
                        className="rounded p-1 text-red-700 hover:bg-red-100"
                        aria-label="닫기"
                        onClick={onDismiss}
                    >
                        <X className="h-4 w-4" />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
