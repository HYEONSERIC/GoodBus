'use client';

import { useCallback, useState } from 'react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { Button } from '@/components/ui/button';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import {
    AdminFilterBar,
    AdminFilterField,
    ADMIN_SELECT_CLASS,
} from '@/components/admin/AdminFilterBar';
import {
    ADMIN_AMOUNT_HEADERS,
    AMOUNT_UNIT_MANWON,
    formatManWon,
    yearMonthValue,
} from '@/lib/adminRevenueDisplay';
import { adminAPI } from '@/lib/api';
import { downloadRevenueAwardsCsv } from '@/lib/exportRevenueCsv';
import { AdminErrorBanner } from '@/components/admin/AdminErrorBanner';
import { AdminLoadingSkeleton } from '@/components/admin/AdminLoadingSkeleton';
import { getErrorMessage } from '@/lib/errors';
import type { AdminRevenueAwardRow, AdminRevenueMonthRow } from '@/types/admin';

function MonthSelect({
    year,
    month,
    onYearChange,
    onMonthChange,
    yearOptions,
    monthOptions,
}: {
    year: number;
    month: number;
    onYearChange: (y: number) => void;
    onMonthChange: (m: number) => void;
    yearOptions: number[];
    monthOptions: number[];
}) {
    return (
        <div className="flex gap-2">
            <select
                className={ADMIN_SELECT_CLASS}
                value={year}
                onChange={(e) => onYearChange(Number(e.target.value))}
            >
                {yearOptions.map((y) => (
                    <option key={y} value={y}>
                        {y}년
                    </option>
                ))}
            </select>
            <select
                className={ADMIN_SELECT_CLASS}
                value={month}
                onChange={(e) => onMonthChange(Number(e.target.value))}
            >
                {monthOptions.map((m) => (
                    <option key={m} value={m}>
                        {m}월
                    </option>
                ))}
            </select>
        </div>
    );
}

function RevenueChart({
    monthly,
    selectedMonthKey,
    onSelectMonth,
}: {
    monthly: AdminRevenueMonthRow[];
    selectedMonthKey: string | null;
    onSelectMonth: (year: number, month: number) => void;
}) {
    const maxGmv = Math.max(...monthly.map((m) => m.gmvManWon), 1);

    if (monthly.length === 0) {
        return (
            <p className="text-sm text-gray-500">표시할 기간 데이터가 없습니다.</p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-end gap-2 overflow-x-auto pb-2 pt-4">
                {monthly.map((row) => {
                    const key = `${row.year}-${row.month}`;
                    const heightPct = Math.round((row.gmvManWon / maxGmv) * 100);
                    const selected = selectedMonthKey === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onSelectMonth(row.year, row.month)}
                            className={`flex min-w-[52px] flex-1 flex-col items-center gap-1 rounded-md px-0.5 transition ${
                                selected
                                    ? 'ring-2 ring-[#e08030] ring-offset-1'
                                    : 'hover:bg-slate-50'
                            }`}
                            title={`${row.label} 상세 보기`}
                        >
                            <span className="text-[10px] tabular-nums text-gray-600">
                                {row.gmvManWon > 0
                                    ? formatManWon(row.gmvManWon)
                                    : '—'}
                            </span>
                            <div
                                className="flex w-full max-w-[48px] flex-col justify-end rounded-t bg-[#e08030]/85"
                                style={{
                                    height: `${Math.max(heightPct, row.gmvManWon > 0 ? 8 : 2)}%`,
                                    minHeight: row.gmvManWon > 0 ? 24 : 4,
                                    maxHeight: 160,
                                }}
                            />
                            <span className="text-[10px] whitespace-nowrap text-gray-500">
                                {row.month}월
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500">
                막대 또는 하단 표의 연월을 클릭하면 해당 월 낙찰 목록을 볼 수 있습니다.
            </p>
        </div>
    );
}

function roleLabel(role: string) {
    if (role === 'Driver') return '기사';
    if (role === 'BusCompany') return '버스회사';
    return role;
}

export function AdminRevenuePanel() {
    const {
        revenueFromYear,
        setRevenueFromYear,
        revenueFromMonth,
        setRevenueFromMonth,
        revenueToYear,
        setRevenueToYear,
        revenueToMonth,
        setRevenueToMonth,
        revenueStats,
        revenueLoading,
        revenueError,
        setRevenueError,
        loadRevenueStats,
        revenueYearOptions,
        revenueMonthOptions,
    } = useAdminDashboard();

    const [selectedMonth, setSelectedMonth] = useState<{
        year: number;
        month: number;
    } | null>(null);
    const [monthAwards, setMonthAwards] = useState<AdminRevenueAwardRow[]>([]);
    const [monthDetailLoading, setMonthDetailLoading] = useState(false);
    const [monthDetailError, setMonthDetailError] = useState('');
    const [csvLoading, setCsvLoading] = useState(false);

    const selectedMonthKey = selectedMonth
        ? `${selectedMonth.year}-${selectedMonth.month}`
        : null;

    const loadMonthDetail = useCallback(async (year: number, month: number) => {
        setSelectedMonth({ year, month });
        setMonthDetailLoading(true);
        setMonthDetailError('');
        try {
            const data = await adminAPI.getRevenueAwardsForMonth(year, month);
            setMonthAwards((data.awards || []) as AdminRevenueAwardRow[]);
        } catch (err: unknown) {
            setMonthAwards([]);
            setMonthDetailError(
                getErrorMessage(err, '월별 낙찰 목록을 불러오지 못했습니다.'),
            );
        } finally {
            setMonthDetailLoading(false);
        }
    }, []);

    async function handleLoadStats() {
        setSelectedMonth(null);
        setMonthAwards([]);
        setMonthDetailError('');
        await loadRevenueStats();
    }

    async function handleExportRangeCsv() {
        if (!revenueStats) return;
        setCsvLoading(true);
        try {
            const from = yearMonthValue(
                revenueStats.fromYear,
                revenueStats.fromMonth,
            );
            const to = yearMonthValue(revenueStats.toYear, revenueStats.toMonth);
            const data = await adminAPI.getRevenueAwardsForRange({ from, to });
            const awards = (data.awards || []) as AdminRevenueAwardRow[];
            downloadRevenueAwardsCsv(
                awards,
                `goodbus-revenue_${from}_${to}.csv`,
                {
                    periodLabel: `${from} ~ ${to}`,
                    commissionRate: revenueStats.commissionRate,
                },
            );
        } catch (err: unknown) {
            alert(getErrorMessage(err, 'CSV보내기에 실패했습니다.'));
        } finally {
            setCsvLoading(false);
        }
    }

    function handleExportMonthCsv() {
        if (!selectedMonth || monthAwards.length === 0) return;
        const ym = yearMonthValue(selectedMonth.year, selectedMonth.month);
        downloadRevenueAwardsCsv(monthAwards, `goodbus-revenue_${ym}.csv`, {
            periodLabel: ym,
            commissionRate: revenueStats?.commissionRate,
        });
    }

    return (
        <AdminPanelCard className="space-y-6 p-6">
            <div>
                <h2 className="text-lg font-semibold">낙찰 기준 거래 통계</h2>
                <p className="mt-1 text-sm text-gray-600">
                    낙찰된 여정의 입찰가(만원) 합계를 거래액(GMV)으로 집계합니다.
                    플랫폼 매출은 수수료율을 적용한 추정치이며, 결제·정산 연동
                    전까지는 실수령액이 아닙니다.
                </p>
            </div>

            <AdminFilterBar>
                <AdminFilterField label="시작">
                    <MonthSelect
                        year={revenueFromYear}
                        month={revenueFromMonth}
                        onYearChange={setRevenueFromYear}
                        onMonthChange={setRevenueFromMonth}
                        yearOptions={revenueYearOptions}
                        monthOptions={revenueMonthOptions}
                    />
                </AdminFilterField>
                <AdminFilterField label="종료">
                    <MonthSelect
                        year={revenueToYear}
                        month={revenueToMonth}
                        onYearChange={setRevenueToYear}
                        onMonthChange={setRevenueToMonth}
                        yearOptions={revenueYearOptions}
                        monthOptions={revenueMonthOptions}
                    />
                </AdminFilterField>
                <Button
                    variant="outline"
                    onClick={() => void handleLoadStats()}
                    disabled={revenueLoading}
                >
                    {revenueLoading ? '조회 중…' : '조회'}
                </Button>
                {revenueStats ? (
                    <Button
                        variant="outline"
                        disabled={csvLoading || revenueStats.awardCount === 0}
                        onClick={() => void handleExportRangeCsv()}
                    >
                        {csvLoading ? 'CSV…' : '기간 CSV'}
                    </Button>
                ) : null}
            </AdminFilterBar>

            {revenueError ? (
                <AdminErrorBanner
                    message={revenueError}
                    onRetry={() => void handleLoadStats()}
                    onDismiss={() => setRevenueError('')}
                />
            ) : null}

            {revenueLoading && !revenueStats ? (
                <div className="space-y-4">
                    <AdminLoadingSkeleton variant="cards" rows={4} />
                    <AdminLoadingSkeleton variant="chart" rows={6} />
                    <AdminLoadingSkeleton variant="table" rows={4} columns={4} />
                </div>
            ) : null}

            {revenueStats ? (
                <>
                    {revenueStats.awardedAtMissingCount > 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                            <p className="font-medium">집계 기준 참고</p>
                            <p className="mt-1 text-xs leading-relaxed">
                                선택 기간 중{' '}
                                <strong>
                                    {revenueStats.awardedAtMissingCount}건
                                </strong>
                                은 낙찰 시각(<code>awardedAt</code>)이 없어
                                여정 생성일로 대체 집계되었습니다. 이후 낙찰분은
                                정상 기록됩니다.
                            </p>
                        </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">
                                {ADMIN_AMOUNT_HEADERS.gmvGmv}
                            </p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums">
                                {formatManWon(revenueStats.gmvManWon)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                낙찰 {revenueStats.awardCount}건
                            </p>
                        </div>
                        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
                            <p className="text-sm text-gray-700">
                                추정 플랫폼 매출({AMOUNT_UNIT_MANWON})
                            </p>
                            <p className="mt-1 text-xs font-medium text-amber-800">
                                추정 · 미결제
                            </p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-950">
                                {formatManWon(
                                    revenueStats.estimatedRevenueManWon,
                                )}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                                수수료율 {revenueStats.commissionRatePercent}%
                            </p>
                        </div>
                        <div className="rounded-lg border p-4 sm:col-span-2 lg:col-span-2">
                            <p className="text-sm text-gray-500">집계 기준</p>
                            <ul className="mt-2 list-inside list-disc text-xs leading-relaxed text-gray-600">
                                <li>기간: 낙찰 시각(없으면 여정 생성일)</li>
                                <li>취소 여정·미낙찰 입찰 제외</li>
                                <li>금액 단위: 만원</li>
                            </ul>
                        </div>
                    </div>

                    <div className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                                월별 거래액 추이
                            </h3>
                            <span className="text-xs text-gray-500">
                                단위: {AMOUNT_UNIT_MANWON}
                            </span>
                        </div>
                        <div className="mt-4 min-h-[200px]">
                            <RevenueChart
                                monthly={revenueStats.monthly}
                                selectedMonthKey={selectedMonthKey}
                                onSelectMonth={(y, m) => void loadMonthDetail(y, m)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50 text-left text-gray-600">
                                    <th className="px-3 py-2">연월</th>
                                    <th className="px-3 py-2">낙찰 건수</th>
                                    <th className="px-3 py-2">
                                        {ADMIN_AMOUNT_HEADERS.gmv}
                                    </th>
                                    <th className="px-3 py-2">
                                        {ADMIN_AMOUNT_HEADERS.estimatedRevenue}{' '}
                                        <span className="font-normal text-gray-500">
                                            (미결제)
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {revenueStats.monthly.map((row) => {
                                    const key = `${row.year}-${row.month}`;
                                    const selected = selectedMonthKey === key;
                                    return (
                                        <tr
                                            key={key}
                                            className={`cursor-pointer border-b last:border-0 ${
                                                selected
                                                    ? 'bg-orange-50'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                            onClick={() =>
                                                void loadMonthDetail(
                                                    row.year,
                                                    row.month,
                                                )
                                            }
                                        >
                                            <td className="px-3 py-2 font-medium">
                                                {row.label}
                                            </td>
                                            <td className="px-3 py-2 tabular-nums">
                                                {row.awardCount}
                                            </td>
                                            <td className="px-3 py-2 tabular-nums">
                                                {formatManWon(row.gmvManWon)}
                                            </td>
                                            <td className="px-3 py-2 tabular-nums text-amber-900">
                                                {formatManWon(
                                                    row.estimatedRevenueManWon,
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {selectedMonth ? (
                        <div className="rounded-lg border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    {selectedMonth.year}년 {selectedMonth.month}
                                    월 낙찰 목록
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        monthDetailLoading ||
                                        monthAwards.length === 0
                                    }
                                    onClick={handleExportMonthCsv}
                                >
                                    이 달 CSV
                                </Button>
                            </div>

                            {monthDetailError ? (
                                <AdminErrorBanner
                                    message={monthDetailError}
                                    className="mt-2"
                                />
                            ) : null}

                            {monthDetailLoading ? (
                                <AdminLoadingSkeleton
                                    variant="table"
                                    rows={4}
                                    columns={5}
                                    className="mt-4"
                                />
                            ) : monthAwards.length === 0 ? (
                                <p className="mt-4 text-sm text-gray-500">
                                    이 달 낙찰 건이 없습니다.
                                </p>
                            ) : (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50 text-left text-xs text-gray-600">
                                                <th className="px-2 py-2">
                                                    집계 시각
                                                </th>
                                                <th className="px-2 py-2">
                                                    여정
                                                </th>
                                                <th className="px-2 py-2">
                                                    입찰자
                                                </th>
                                                <th className="px-2 py-2">
                                                    {ADMIN_AMOUNT_HEADERS.amount}
                                                </th>
                                                <th className="px-2 py-2">
                                                    비고
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthAwards.map((a) => (
                                                <tr
                                                    key={a.bidId}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="px-2 py-2 whitespace-nowrap text-xs">
                                                        {new Date(
                                                            a.countedAt,
                                                        ).toLocaleString(
                                                            'ko-KR',
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        {a.route}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <div>
                                                            {a.bidderDisplayName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {roleLabel(
                                                                a.bidderRole,
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2 tabular-nums">
                                                        {formatManWon(
                                                            a.priceManWon,
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 text-xs text-amber-800">
                                                        {a.usedCreatedAtFallback
                                                            ? '낙찰일 대체'
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : null}
                </>
            ) : !revenueLoading && !revenueError ? (
                <p className="text-sm text-gray-500">
                    기간을 선택한 뒤 조회를 눌러 주세요.
                </p>
            ) : null}
        </AdminPanelCard>
    );
}
