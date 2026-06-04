'use client';

import { Skeleton } from '@/components/ui/skeleton';

export type AdminSkeletonVariant =
    | 'table'
    | 'cards'
    | 'list'
    | 'detail'
    | 'chart'
    | 'page';

type AdminLoadingSkeletonProps = {
    variant?: AdminSkeletonVariant;
    /** table/list 행 수 */
    rows?: number;
    /** table 열 수 */
    columns?: number;
    className?: string;
};

export function AdminLoadingSkeleton({
    variant = 'list',
    rows = 5,
    columns = 5,
    className = '',
}: AdminLoadingSkeletonProps) {
    if (variant === 'page') {
        return (
            <div className={`space-y-6 ${className}`}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (variant === 'cards') {
        return (
            <div
                className={`grid gap-4 sm:grid-cols-2 ${className}`}
                aria-busy
                aria-label="불러오는 중"
            >
                {Array.from({ length: rows }).map((_, i) => (
                    <Skeleton key={i} className="h-36 w-full" />
                ))}
            </div>
        );
    }

    if (variant === 'chart') {
        return (
            <div
                className={`flex items-end gap-2 pt-4 ${className}`}
                aria-busy
                aria-label="불러오는 중"
            >
                {Array.from({ length: rows }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="h-24 min-w-[48px] flex-1 max-w-[56px]"
                    />
                ))}
            </div>
        );
    }

    if (variant === 'detail') {
        return (
            <div
                className={`space-y-3 rounded-lg border p-4 ${className}`}
                aria-busy
                aria-label="불러오는 중"
            >
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        );
    }

    if (variant === 'table') {
        return (
            <div
                className={`space-y-2 ${className}`}
                aria-busy
                aria-label="불러오는 중"
            >
                <div
                    className="grid gap-2 border-b border-slate-100 pb-2"
                    style={{
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    }}
                >
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton key={i} className="h-3 w-full" />
                    ))}
                </div>
                {Array.from({ length: rows }).map((_, row) => (
                    <div
                        key={row}
                        className="grid gap-2 py-1"
                        style={{
                            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        }}
                    >
                        {Array.from({ length: columns }).map((_, col) => (
                            <Skeleton key={col} className="h-4 w-full" />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <ul
            className={`space-y-2 ${className}`}
            aria-busy
            aria-label="불러오는 중"
        >
            {Array.from({ length: rows }).map((_, i) => (
                <li key={i}>
                    <Skeleton className="h-12 w-full" />
                </li>
            ))}
        </ul>
    );
}
