'use client';

import { cn } from '@/lib/utils';

export function AdminPanelCard({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm',
                className,
            )}
        >
            {children}
        </div>
    );
}
