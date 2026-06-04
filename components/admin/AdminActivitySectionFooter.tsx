'use client';

import { Button } from '@/components/ui/button';

/** 관리자 사용자 활동 목록: API take 상한과 동일 */
export const ADMIN_ACTIVITY_LIST_MAX = 50;

type AdminActivitySectionFooterProps = {
    shownCount: number;
    totalCount?: number;
    activityTake: number;
    onLoadMore: () => void;
};

export function AdminActivitySectionFooter({
    shownCount,
    totalCount,
    activityTake,
    onLoadMore,
}: AdminActivitySectionFooterProps) {
    const canLoadMore =
        shownCount >= activityTake && activityTake < ADMIN_ACTIVITY_LIST_MAX;
    const atCap = activityTake >= ADMIN_ACTIVITY_LIST_MAX;
    const hasMoreTotal =
        totalCount !== undefined && totalCount > shownCount;

    return (
        <div className="mt-2 space-y-1">
            {totalCount !== undefined && totalCount > 0 ? (
                <p className="text-xs text-gray-500">
                    전체 {totalCount.toLocaleString('ko-KR')}건 · 아래{' '}
                    {shownCount.toLocaleString('ko-KR')}건 표시
                </p>
            ) : null}
            {canLoadMore ? (
                <Button size="sm" variant="outline" onClick={onLoadMore}>
                    더보기 (+10건, 최대 {ADMIN_ACTIVITY_LIST_MAX}건)
                </Button>
            ) : null}
            {atCap && hasMoreTotal ? (
                <p className="text-xs text-amber-800">
                    목록은 최대 {ADMIN_ACTIVITY_LIST_MAX}건까지 불러옵니다.
                    상단 평균·건수 요약은 전체 기준입니다.
                </p>
            ) : null}
        </div>
    );
}
