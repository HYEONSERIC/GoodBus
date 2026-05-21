'use client';

import { DashboardSubTabs } from '@/components/layout/DashboardSubTabs';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { ADMIN_FAQ_SUB_TABS } from '@/components/admin/adminFaqConstants';
import { AdminFaqPostsPanel } from '@/components/admin/panels/AdminFaqPostsPanel';
import { AdminFaqInquiriesPanel } from '@/components/admin/panels/AdminFaqInquiriesPanel';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

export function AdminFaqPanel() {
    const { faqSectionTab, setFaqSectionTab } = useAdminDashboard();
    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <DashboardSubTabs
                tabs={ADMIN_FAQ_SUB_TABS}
                activeTab={faqSectionTab}
                onChange={setFaqSectionTab}
                columnClass="grid-cols-2"
                wrapperClassName="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            />
            {faqSectionTab === 'inquiries' ? (
                <AdminFaqInquiriesPanel />
            ) : (
                <AdminFaqPostsPanel />
            )}
        </div>
    );
}
