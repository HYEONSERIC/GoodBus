'use client';

import { PassengerDashboardContent } from '@/components/passenger/PassengerDashboardContent';
import { PassengerDashboardProvider } from '@/hooks/usePassengerDashboard';

export default function PassengerDashboard() {
    return (
        <PassengerDashboardProvider>
            <PassengerDashboardContent />
        </PassengerDashboardProvider>
    );
}
