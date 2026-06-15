'use client';

import { CompanyDashboardContent } from '@/components/company/CompanyDashboardContent';
import { CompanyDashboardProvider } from '@/hooks/useCompanyDashboard';

export default function CompanyDashboard() {
    return (
        <CompanyDashboardProvider>
            <CompanyDashboardContent />
        </CompanyDashboardProvider>
    );
}
