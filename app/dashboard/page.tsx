'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadUser() {
            try {
                const data = await authAPI.getMe();
                setUser(data.user);
            } catch {
                router.push('/login');
            } finally {
                setLoading(false);
            }
        }
        loadUser();
    }, [router]);

    useEffect(() => {
        if (!loading && user) {
            const rolePath = {
                Passenger: '/dashboard/passenger',
                Driver: '/dashboard/driver',
                BusCompany: '/dashboard/company',
            }[user.role];

            if (rolePath) {
                router.push(rolePath);
            }
        }
    }, [user, loading, router]);

    const handleLogout = async () => {
        await authAPI.logout();
        router.push('/login');
    };

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    if (!user) return null;

    return <div className="p-8">Redirecting...</div>;
}
