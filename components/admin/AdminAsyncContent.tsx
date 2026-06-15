'use client';

import type { ReactNode } from 'react';
import { AdminErrorBanner } from '@/components/admin/AdminErrorBanner';
import {
    AdminLoadingSkeleton,
    type AdminSkeletonVariant,
} from '@/components/admin/AdminLoadingSkeleton';

type AdminAsyncContentProps = {
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
    onDismissError?: () => void;
    skeletonVariant?: AdminSkeletonVariant;
    skeletonRows?: number;
    skeletonColumns?: number;
    /** 로딩 중이고 아직 데이터 없을 때만 스켈레톤 (재조회 시 기존 목록 유지) */
    skeletonOnlyWhenEmpty?: boolean;
    hasData?: boolean;
    empty?: boolean;
    emptyMessage?: string;
    children: ReactNode;
};

export function AdminAsyncContent({
    loading = false,
    error,
    onRetry,
    onDismissError,
    skeletonVariant = 'list',
    skeletonRows = 5,
    skeletonColumns = 5,
    skeletonOnlyWhenEmpty = true,
    hasData = true,
    empty = false,
    emptyMessage = '표시할 항목이 없습니다.',
    children,
}: AdminAsyncContentProps) {
    const showSkeleton =
        loading && (!skeletonOnlyWhenEmpty || !hasData);

    return (
        <div className="space-y-4">
            {error ? (
                <AdminErrorBanner
                    message={error}
                    onRetry={onRetry}
                    onDismiss={onDismissError}
                />
            ) : null}
            {showSkeleton ? (
                <AdminLoadingSkeleton
                    variant={skeletonVariant}
                    rows={skeletonRows}
                    columns={skeletonColumns}
                />
            ) : empty ? (
                <p className="text-sm text-slate-500">{emptyMessage}</p>
            ) : (
                children
            )}
        </div>
    );
}
