'use client';

import { DriverDashboardContent } from '@/components/driver/DriverDashboardContent';
import { DriverDashboardProvider } from '@/hooks/useDriverDashboard';

export default function DriverDashboard() {
    return (
        <DriverDashboardProvider>
            <DriverDashboardContent />
        </DriverDashboardProvider>
    );
}
