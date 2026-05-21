'use client';

import { Button } from '@/components/ui/button';
import {
    ADMIN_NAV_ITEMS,
    ADMIN_SECTION_TITLES,
} from '@/components/admin/adminNav';
import type { AdminTabId } from '@/types/admin';

export function AdminShell({
    adminRole,
    activeTab,
    onTabChange,
    onLogout,
    children,
}: {
    adminRole: string | null;
    activeTab: AdminTabId;
    onTabChange: (tab: AdminTabId) => void;
    onLogout: () => void;
    children: React.ReactNode;
}) {
    function navItemClass(tab: AdminTabId) {
        return `w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            activeTab === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
        }`;
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        GoodBus
                    </p>
                    <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                        관리자
                    </h1>
                    {adminRole ? (
                        <p
                            className="mt-1 truncate text-xs text-slate-500"
                            title={adminRole}
                        >
                            {adminRole}
                        </p>
                    ) : null}
                </div>
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
                    {ADMIN_NAV_ITEMS.filter(
                        (item) => item.visible?.(adminRole) ?? true,
                    ).map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={navItemClass(item.id)}
                            onClick={() => onTabChange(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="border-t border-slate-100 p-3">
                    <Button
                        variant="outline"
                        className="w-full border-slate-200 text-slate-800 hover:bg-slate-50"
                        onClick={onLogout}
                    >
                        로그아웃
                    </Button>
                </div>
            </aside>

            <main className="min-h-screen min-w-0 flex-1 space-y-8 overflow-y-auto p-6 md:p-8">
                <header className="border-b border-slate-200/80 pb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                        {ADMIN_SECTION_TITLES[activeTab]}
                    </h2>
                </header>
                {children}
            </main>
        </div>
    );
}
