'use client';

import type { ComponentType } from 'react';
import {
    Gavel,
    CalendarCheck,
    MessageCircleQuestion,
    BadgeCheck,
    Users,
    Route,
    ChevronRight,
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { Button } from '@/components/ui/button';
import { AdminDeepLink } from '@/components/admin/AdminDeepLink';
import { formatManWon } from '@/lib/adminRevenueDisplay';
import { adminPersonLabel } from '@/lib/adminPersonLabel';
import type { AdminPersonRef } from '@/types/admin';

function initialOf(person: AdminPersonRef) {
    return adminPersonLabel(person).trim()[0]?.toUpperCase() ?? '?';
}

function StatCard({
    icon: Icon,
    iconClassName,
    label,
    value,
    sub,
    onClick,
}: {
    icon: ComponentType<{ className?: string }>;
    iconClassName: string;
    label: string;
    value: string;
    sub?: string;
    onClick?: () => void;
}) {
    const Comp = onClick ? 'button' : 'div';
    return (
        <Comp
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm ${
                onClick ? 'transition hover:border-slate-300 hover:shadow-md' : ''
            }`}
        >
            <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
            >
                <Icon className="size-4.5" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">
                    {value}
                </p>
                {sub ? (
                    <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                        {sub}
                    </p>
                ) : null}
            </div>
        </Comp>
    );
}

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
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={Gavel}
                    iconClassName="bg-sky-50 text-sky-700"
                    label="오늘 낙찰"
                    value={`${awardsToday.awardCount}건`}
                    sub={`거래액 ${formatManWon(awardsToday.gmvManWon)}`}
                />
                <StatCard
                    icon={CalendarCheck}
                    iconClassName="bg-slate-100 text-slate-700"
                    label="이번 주 낙찰"
                    value={`${awardsThisWeek.awardCount}건`}
                    sub={`거래액 ${formatManWon(awardsThisWeek.gmvManWon)}`}
                />
                <StatCard
                    icon={MessageCircleQuestion}
                    iconClassName="bg-red-50 text-red-600"
                    label="미답변 문의"
                    value={`${pendingInquiries}건`}
                    sub="FAQ/문의 → 문의사항"
                    onClick={() => {
                        setActiveTab('faq');
                        setFaqSectionTab('inquiries');
                    }}
                />
                <StatCard
                    icon={BadgeCheck}
                    iconClassName="bg-amber-50 text-amber-700"
                    label="승인 대기"
                    value={`${pendingVerifications}건`}
                    sub="기사·회사 서류 검토"
                    onClick={() => setActiveTab('verification')}
                />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200/80 rounded-lg border border-slate-200 bg-slate-50/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                    { icon: Users, label: '전체 사용자', value: overview.counts.users },
                    { icon: Route, label: '전체 여정', value: overview.counts.trips },
                    { icon: Gavel, label: '전체 입찰', value: overview.counts.bids },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2.5 px-4 py-3">
                        <Icon className="size-3.5 shrink-0 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="text-sm font-medium tabular-nums text-slate-700">
                                {value.toLocaleString('ko-KR')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                            최근 여정
                        </h3>
                    </div>
                    <div className="max-h-96 divide-y divide-slate-100 overflow-x-hidden overflow-y-auto">
                        {overview.recentTrips.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-slate-400">
                                최근 여정이 없습니다
                            </p>
                        ) : (
                            overview.recentTrips
                                .slice(0, overviewTripLimit)
                                .map((trip) => (
                                    <div
                                        key={trip.id}
                                        className="flex items-start gap-3 px-4 py-3"
                                    >
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                            {initialOf(trip.passenger)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <AdminDeepLink
                                                className="block truncate text-sm font-medium text-slate-900 hover:text-sky-700"
                                                onNavigate={() =>
                                                    openBidsForTrip(trip.id)
                                                }
                                            >
                                                {trip.origin} → {trip.destination}
                                            </AdminDeepLink>
                                            <div className="mt-0.5 truncate text-xs text-slate-500">
                                                <AdminDeepLink
                                                    className="text-xs"
                                                    onNavigate={() =>
                                                        openUserProfile(
                                                            trip.passenger.id,
                                                        )
                                                    }
                                                >
                                                    {adminPersonLabel(
                                                        trip.passenger,
                                                    )}
                                                </AdminDeepLink>
                                                <span className="mx-1 text-slate-300">
                                                    ·
                                                </span>
                                                <AdminDeepLink
                                                    className="text-xs text-slate-500"
                                                    onNavigate={() =>
                                                        openBidsForPassenger({
                                                            passengerId:
                                                                trip.passenger.id,
                                                            email: trip.passenger
                                                                .email,
                                                        })
                                                    }
                                                >
                                                    입찰 목록
                                                </AdminDeepLink>
                                            </div>
                                        </div>
                                        <ChevronRight className="mt-1 size-3.5 shrink-0 text-slate-300" />
                                    </div>
                                ))
                        )}
                    </div>
                    {overviewTripLimit < overview.recentTrips.length && (
                        <div className="border-t border-slate-100 p-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
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

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                            최근 입찰
                        </h3>
                    </div>
                    <div className="max-h-96 divide-y divide-slate-100 overflow-x-hidden overflow-y-auto">
                        {overview.recentBids.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-slate-400">
                                최근 입찰이 없습니다
                            </p>
                        ) : (
                            overview.recentBids
                                .slice(0, overviewBidLimit)
                                .map((bid) => (
                                    <div
                                        key={bid.id}
                                        className="flex items-start gap-3 px-4 py-3"
                                    >
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold text-sky-700">
                                            {initialOf(bid.bidder)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <AdminDeepLink
                                                className="block truncate text-sm font-medium text-slate-900 hover:text-sky-700"
                                                onNavigate={() =>
                                                    openBidsForTrip(bid.trip.id)
                                                }
                                            >
                                                {bid.trip.origin} →{' '}
                                                {bid.trip.destination}
                                            </AdminDeepLink>
                                            <div className="mt-0.5 truncate text-xs text-slate-500">
                                                <AdminDeepLink
                                                    className="text-xs"
                                                    onNavigate={() =>
                                                        openBidsForBidder({
                                                            bidderId:
                                                                bid.bidder.id,
                                                            email: bid.bidder
                                                                .email,
                                                            highlightBidId:
                                                                bid.id,
                                                        })
                                                    }
                                                >
                                                    {adminPersonLabel(
                                                        bid.bidder,
                                                    )}
                                                </AdminDeepLink>
                                                <span className="text-slate-400">
                                                    {' '}
                                                    ({bid.bidder.role})
                                                </span>
                                            </div>
                                        </div>
                                        <p className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                                            {formatManWon(Number(bid.price))}
                                        </p>
                                    </div>
                                ))
                        )}
                    </div>
                    {overviewBidLimit < overview.recentBids.length && (
                        <div className="border-t border-slate-100 p-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
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
        </div>
    );
}
