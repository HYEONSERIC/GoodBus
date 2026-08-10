'use client';

import { Button } from '@/components/ui/button';

/** 관리자 사용자 활동 목록: API take 상한과 동일 */
export const ADMIN_ACTIVITY_LIST_MAX = 50;

type AdminActivitySectionFooterProps = {
    shownCount: number;
    totalCount?: number;
    activityTake: number;
    onLoadMore: () => void;
    /** 목록이 불러올 수 있는 최대 건수. 기본값은 사용자 활동 목록 상한. */
    max?: number;
    /** "더보기" 클릭 시 늘어나는 건수(안내 문구에만 사용). 기본값 10. */
    step?: number;
};

export function AdminActivitySectionFooter({
    shownCount,
    totalCount,
    activityTake,
    onLoadMore,
    max = ADMIN_ACTIVITY_LIST_MAX,
    step = 10,
}: AdminActivitySectionFooterProps) {
    const canLoadMore = shownCount >= activityTake && activityTake < max;
    const atCap = activityTake >= max;
    const hasMoreTotal =
        totalCount !== undefined && totalCount > shownCount;

    return (
        <div className="mt-2 space-y-1">
            {totalCount !== undefined && totalCount > 0 ? (
                <p className="text-xs text-slate-500">
                    전체 {totalCount.toLocaleString('ko-KR')}건 · 아래{' '}
                    {shownCount.toLocaleString('ko-KR')}건 표시
                </p>
            ) : null}
            {canLoadMore ? (
                <Button size="sm" variant="outline" onClick={onLoadMore}>
                    더보기 (+{step}건, 최대 {max}건)
                </Button>
            ) : null}
            {atCap && hasMoreTotal ? (
                <p className="text-xs text-amber-800">
                    목록은 최대 {max}건까지 불러옵니다. 상단 평균·건수 요약은
                    전체 기준입니다.
                </p>
            ) : null}
        </div>
    );
}
