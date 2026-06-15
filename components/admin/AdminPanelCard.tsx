'use client';

export function AdminPanelCard({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-lg border p-4 space-y-4 ${className}`.trim()}>
            {children}
        </div>
    );
}
