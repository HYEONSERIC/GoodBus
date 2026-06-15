'use client';

import { DashboardSubTabs } from '@/components/layout/DashboardSubTabs';

export const CONTRACT_SUB_TABS = [
    { id: 'reservation' as const, label: '예약주문' },
    { id: 'bidding' as const, label: '입찰' },
    { id: 'completed' as const, label: '운행완료' },
];

export type ContractSubTabId = (typeof CONTRACT_SUB_TABS)[number]['id'];

export function ContractTabPanel({
    activeSubTab,
    onSubTabChange,
    children,
}: {
    activeSubTab: ContractSubTabId;
    onSubTabChange: (tab: ContractSubTabId) => void;
    children: React.ReactNode;
}) {
    return (
        <div className="mx-auto w-full max-w-xl">
            <DashboardSubTabs
                tabs={CONTRACT_SUB_TABS}
                activeTab={activeSubTab}
                onChange={onSubTabChange}
            />
            {children}
        </div>
    );
}
