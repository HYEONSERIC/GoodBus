'use client';

import { DashboardSubTabs } from '@/components/layout/DashboardSubTabs';

export const PASSENGER_BOOKING_SUB_TABS = [
    { id: 'reservation' as const, label: '예약주문' },
    { id: 'completed' as const, label: '운행완료' },
] as const;

export type PassengerBookingSubTabId =
    (typeof PASSENGER_BOOKING_SUB_TABS)[number]['id'];

export function PassengerBookingTabPanel({
    activeSubTab,
    onSubTabChange,
    children,
}: {
    activeSubTab: PassengerBookingSubTabId;
    onSubTabChange: (tab: PassengerBookingSubTabId) => void;
    children: React.ReactNode;
}) {
    return (
        <div className="mx-auto w-full max-w-xl">
            <DashboardSubTabs
                tabs={PASSENGER_BOOKING_SUB_TABS}
                activeTab={activeSubTab}
                onChange={onSubTabChange}
                columnClass="grid-cols-2"
                wrapperClassName="mb-4 grid border-b border-gray-200 bg-white shadow-sm"
            />
            {children}
        </div>
    );
}
