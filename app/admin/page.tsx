'use client';

import { Button } from '@/components/ui/button';
import { AdminDashboardProvider, useAdminDashboard } from '@/hooks/useAdminDashboard';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminImagePreviewDialog } from '@/components/admin/AdminImagePreviewDialog';
import { AdminOverviewPanel } from '@/components/admin/panels/AdminOverviewPanel';
import { AdminUsersPanel } from '@/components/admin/panels/AdminUsersPanel';
import { AdminBidsPanel } from '@/components/admin/panels/AdminBidsPanel';
import { AdminNotificationsPanel } from '@/components/admin/panels/AdminNotificationsPanel';
import { AdminVerificationPanel } from '@/components/admin/panels/AdminVerificationPanel';
import { AdminRevenuePanel } from '@/components/admin/panels/AdminRevenuePanel';
import { AdminFaqPanel } from '@/components/admin/panels/AdminFaqPanel';
import { AdminCreatePanel } from '@/components/admin/panels/AdminCreatePanel';

function AdminPageContent() {
    const {
        router,
        loading,
        overview,
        error,
        activeTab,
        setActiveTab,
        adminRole,
        previewUrl,
        setPreviewUrl,
        handleLogout,
    } = useAdminDashboard();

    if (loading) {
        return <div className="p-8">Loading admin dashboard...</div>;
    }

    if (error && !overview) {
        return (
            <div className="p-8 space-y-4">
                <p className="text-red-600">{error}</p>
                <Button onClick={() => router.push('/login')}>Back to login</Button>
            </div>
        );
    }

    if (!overview) return null;

    return (
        <AdminShell
            adminRole={adminRole}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
        >
            {activeTab === 'overview' && <AdminOverviewPanel />}
            {activeTab === 'users' && <AdminUsersPanel />}
            {activeTab === 'bids' && <AdminBidsPanel />}
            {activeTab === 'notifications' && <AdminNotificationsPanel />}
            {activeTab === 'verification' && <AdminVerificationPanel />}
            {activeTab === 'revenue' && adminRole !== 'CustomerSupport' && (
                <AdminRevenuePanel />
            )}
            {activeTab === 'faq' && <AdminFaqPanel />}
            {activeTab === 'adminCreate' && adminRole === 'Super' && (
                <AdminCreatePanel />
            )}
            <AdminImagePreviewDialog
                previewUrl={previewUrl}
                onClose={() => setPreviewUrl(null)}
            />
        </AdminShell>
    );
}

export default function AdminPage() {
    return (
        <AdminDashboardProvider>
            <AdminPageContent />
        </AdminDashboardProvider>
    );
}
