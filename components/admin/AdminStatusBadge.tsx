'use client';

export type AdminStatusTone = 'success' | 'danger' | 'warning' | 'neutral' | 'info';

const TONE_CLASSES: Record<AdminStatusTone, string> = {
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
    neutral: 'bg-slate-100 text-slate-600',
    info: 'bg-sky-50 text-sky-700',
};

const DOT_CLASSES: Record<AdminStatusTone, string> = {
    success: 'bg-emerald-500',
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    neutral: 'bg-slate-400',
    info: 'bg-sky-500',
};

export function AdminStatusBadge({
    tone,
    children,
}: {
    tone: AdminStatusTone;
    children: React.ReactNode;
}) {
    return (
        <span
            className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
        >
            <span className={`size-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`} />
            {children}
        </span>
    );
}
