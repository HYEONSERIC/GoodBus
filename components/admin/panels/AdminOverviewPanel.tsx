'use client';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { Button } from '@/components/ui/button';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminDeepLink } from '@/components/admin/AdminDeepLink';
import {
    amountColumnHeader,
    formatManWon,
} from '@/lib/adminRevenueDisplay';

export function AdminOverviewPanel() {
    const {
        overview,
        setActiveTab,
        setFaqSectionTab,
        overviewTripLimit,
        setOverviewTripLimit,
        overviewBidLimit,
        setOverviewBidLimit,
        openUserProfile,
        openBidsForTrip,
        openBidsForPassenger,
        openBidsForBidder,
    } = useAdminDashboard();
    if (!overview) return null;

    const { awardsToday, awardsThisWeek, pendingInquiries, pendingVerifications } =
        overview;

    return (
        <AdminPanelCard className="space-y-6">
            <div>
                <h3 className="text-sm font-semibold text-slate-900">
                    낙찰·운영 현황
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                    오늘·이번 주(월요일부터) 낙찰 기준 거래액(만원). 미처리 건은
                    사이드 메뉴 배지에도 표시됩니다.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">오늘 낙찰</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {awardsToday.awardCount}건
                    </p>
                    <p className="mt-0.5 text-sm tabular-nums text-gray-700">
                        거래액 {formatManWon(awardsToday.gmvManWon)}
                    </p>
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">이번 주 낙찰</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {awardsThisWeek.awardCount}건
                    </p>
                    <p className="mt-0.5 text-sm tabular-nums text-gray-700">
                        거래액 {formatManWon(awardsThisWeek.gmvManWon)}
                    </p>
                </div>
                <button
                    type="button"
                    className="rounded-lg border p-4 text-left transition hover:bg-slate-50"
                    onClick={() => {
                        setActiveTab('faq');
                        setFaqSectionTab('inquiries');
                    }}
                >
                    <p className="text-sm text-gray-500">미답변 문의</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-red-600">
                        {pendingInquiries}건
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                        FAQ/문의 → 문의사항
                    </p>
                </button>
                <button
                    type="button"
                    className="rounded-lg border p-4 text-left transition hover:bg-slate-50"
                    onClick={() => setActiveTab('verification')}
                >
                    <p className="text-sm text-gray-500">승인 대기</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">
                        {pendingVerifications}건
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                        기사·회사 서류 검토
                    </p>
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">전체 사용자</p>
                    <p className="text-2xl font-semibold">
                        {overview.counts.users}
                    </p>
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">전체 여정</p>
                    <p className="text-2xl font-semibold">
                        {overview.counts.trips}
                    </p>
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">전체 입찰</p>
                    <p className="text-2xl font-semibold">
                        {overview.counts.bids}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                    <h2 className="mb-3 text-lg font-semibold">최근 여정</h2>
                    <div className="max-h-80 space-y-3 overflow-y-auto text-sm text-gray-700">
                        {overview.recentTrips
                            .slice(0, overviewTripLimit)
                            .map((trip) => (
                                <div
                                    key={trip.id}
                                    className="rounded border p-3 space-y-1"
                                >
                                    <AdminDeepLink
                                        className="font-medium"
                                        onNavigate={() =>
                                            openBidsForTrip(trip.id)
                                        }
                                    >
                                        {trip.origin} → {trip.destination}
                                    </AdminDeepLink>
                                    <div className="text-xs text-gray-500">
                                        승객:{' '}
                                        <AdminDeepLink
                                            className="text-xs"
                                            onNavigate={() =>
                                                openUserProfile(
                                                    trip.passenger.id,
                                                )
                                            }
                                        >
                                            {trip.passenger.email}
                                        </AdminDeepLink>
                                        <span className="mx-1 text-gray-300">
                                            ·
                                        </span>
                                        <AdminDeepLink
                                            className="text-xs text-gray-600"
                                            onNavigate={() =>
                                                openBidsForPassenger({
                                                    passengerId:
                                                        trip.passenger.id,
                                                    email: trip.passenger.email,
                                                })
                                            }
                                        >
                                            입찰 목록
                                        </AdminDeepLink>
                                    </div>
                                </div>
                            ))}
                    </div>
                    {overviewTripLimit < overview.recentTrips.length && (
                        <div className="mt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setOverviewTripLimit((prev) =>
                                        Math.min(
                                            prev + 5,
                                            overview.recentTrips.length,
                                        ),
                                    )
                                }
                            >
                                더보기
                            </Button>
                        </div>
                    )}
                </div>

                <div className="rounded-lg border p-4">
                    <h2 className="mb-3 text-lg font-semibold">최근 입찰</h2>
                    <div className="max-h-80 space-y-3 overflow-y-auto text-sm text-gray-700">
                        {overview.recentBids
                            .slice(0, overviewBidLimit)
                            .map((bid) => (
                                <div
                                    key={bid.id}
                                    className="rounded border p-3 space-y-1"
                                >
                                    <AdminDeepLink
                                        className="font-medium"
                                        onNavigate={() =>
                                            openBidsForTrip(bid.trip.id)
                                        }
                                    >
                                        {bid.trip.origin} →{' '}
                                        {bid.trip.destination}
                                    </AdminDeepLink>
                                    <div className="text-xs text-gray-500">
                                        입찰자:{' '}
                                        <AdminDeepLink
                                            className="text-xs"
                                            onNavigate={() =>
                                                openBidsForBidder({
                                                    bidderId: bid.bidder.id,
                                                    email: bid.bidder.email,
                                                    highlightBidId: bid.id,
                                                })
                                            }
                                        >
                                            {bid.bidder.email}
                                        </AdminDeepLink>
                                        <span className="text-gray-400">
                                            {' '}
                                            ({bid.bidder.role})
                                        </span>
                                        <span className="mx-1 text-gray-300">
                                            ·
                                        </span>
                                        <AdminDeepLink
                                            className="text-xs text-gray-600"
                                            onNavigate={() =>
                                                openUserProfile(bid.bidder.id)
                                            }
                                        >
                                            프로필
                                        </AdminDeepLink>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {amountColumnHeader('금액')}:{' '}
                                        {formatManWon(Number(bid.price))}
                                    </div>
                                </div>
                            ))}
                    </div>
                    {overviewBidLimit < overview.recentBids.length && (
                        <div className="mt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setOverviewBidLimit((prev) =>
                                        Math.min(
                                            prev + 5,
                                            overview.recentBids.length,
                                        ),
                                    )
                                }
                            >
                                더보기
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AdminPanelCard>
    );
}
