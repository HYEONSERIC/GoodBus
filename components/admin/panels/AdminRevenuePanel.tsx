'use client';

import { AdminPanelCard } from '@/components/admin/AdminPanelCard';

export function AdminRevenuePanel() {
    return (
        <AdminPanelCard className="p-6">
            <h2 className="text-lg font-semibold">매출 (예정)</h2>
            <p className="text-sm text-gray-600">
                결제 기능 연동 이후에 사용할 탭입니다. 결제 데이터가 쌓이면 월/연
                매출, 수수료율, 정산 내역을 시각화할 수 있습니다.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">월 매출</p>
                    <p className="text-2xl font-semibold">$0</p>
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">연 매출</p>
                    <p className="text-2xl font-semibold">$0</p>
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">수수료율</p>
                    <p className="text-2xl font-semibold">0%</p>
                </div>
            </div>
            <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
                차트 자리: 월별 매출 추이
            </div>
        </AdminPanelCard>
    );
}
