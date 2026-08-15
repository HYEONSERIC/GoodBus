'use client';

import { Label } from '@/components/ui/label';

export const ADMIN_SELECT_CLASS =
    'h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 sm:w-auto';

export function AdminFilterBar({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            {children}
        </div>
    );
}

export function AdminFilterField({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex w-full flex-col gap-1 sm:w-auto">
            <Label className="text-xs font-medium text-slate-600">
                {label}
            </Label>
            {children}
        </div>
    );
}
