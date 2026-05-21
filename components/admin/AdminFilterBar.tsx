'use client';

import { Label } from '@/components/ui/label';

export const ADMIN_SELECT_CLASS = 'border rounded px-2 py-1';

export function AdminFilterBar({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-end gap-4">{children}</div>
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
        <div className="flex flex-col gap-1">
            <Label>{label}</Label>
            {children}
        </div>
    );
}
