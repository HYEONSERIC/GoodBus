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
import { AdminErrorBanner } from '@/components/admin/AdminErrorBanner';
import { AdminLoadingSkeleton } from '@/components/admin/AdminLoadingSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

function AdminPageContent() {
    const {
        router,
        loading,
        overview,
        error,
        setError,
        activeTab,
        setActiveTab,
        adminRole,
        previewUrl,
        setPreviewUrl,
        handleLogout,
    } = useAdminDashboard();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 md:p-8">
                <Skeleton className="mb-6 h-8 w-48" />
                <AdminLoadingSkeleton variant="page" />
            </div>
        );
    }

    if (error && !overview) {
        return (
            <div className="min-h-screen space-y-4 bg-slate-50 p-6 md:p-8">
                <AdminErrorBanner message={error} />
                <Button onClick={() => router.push('/login')}>
                    로그인으로 돌아가기
                </Button>
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
            navBadges={overview.navBadges}
            globalError={error}
            onDismissGlobalError={() => setError('')}
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
