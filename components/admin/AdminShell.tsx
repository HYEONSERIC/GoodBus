'use client';

import { Button } from '@/components/ui/button';
import {
    ADMIN_NAV_ITEMS,
    ADMIN_SECTION_TITLES,
} from '@/components/admin/adminNav';
import { AdminErrorBanner } from '@/components/admin/AdminErrorBanner';
import type { AdminNavBadges, AdminTabId } from '@/types/admin';

export function AdminShell({
    adminRole,
    activeTab,
    onTabChange,
    onLogout,
    navBadges,
    globalError,
    onDismissGlobalError,
    children,
}: {
    adminRole: string | null;
    activeTab: AdminTabId;
    onTabChange: (tab: AdminTabId) => void;
    onLogout: () => void;
    navBadges?: AdminNavBadges;
    globalError?: string;
    onDismissGlobalError?: () => void;
    children: React.ReactNode;
}) {
    function navItemClass(tab: AdminTabId) {
        return `w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            activeTab === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
        }`;
    }

    const visibleNavItems = ADMIN_NAV_ITEMS.filter(
        (item) => item.visible?.(adminRole) ?? true,
    );

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            <aside className="flex h-full w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
                <div className="shrink-0 border-b border-slate-100 px-4 py-5">
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
                <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
                    {visibleNavItems.map((item) => {
                        const badgeCount =
                            item.badgeKey && navBadges
                                ? navBadges[item.badgeKey] ?? 0
                                : 0;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`${navItemClass(item.id)} flex items-center justify-between gap-2`}
                                onClick={() => onTabChange(item.id)}
                            >
                                <span>{item.label}</span>
                                {badgeCount > 0 ? (
                                    <span
                                        className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
                                            activeTab === item.id
                                                ? 'bg-white text-slate-900'
                                                : 'bg-red-500 text-white'
                                        }`}
                                    >
                                        {badgeCount > 99 ? '99+' : badgeCount}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                    <div className="mt-2 border-t border-slate-100 pt-2">
                        <Button
                            variant="outline"
                            className="w-full border-slate-200 text-slate-800 hover:bg-slate-50"
                            onClick={onLogout}
                        >
                            로그아웃
                        </Button>
                    </div>
                </nav>
            </aside>

            <main className="min-h-0 min-w-0 flex-1 space-y-8 overflow-y-auto p-6 md:p-8">
                <header className="border-b border-slate-200/80 pb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                        {ADMIN_SECTION_TITLES[activeTab]}
                    </h2>
                </header>
                {globalError ? (
                    <AdminErrorBanner
                        message={globalError}
                        onDismiss={onDismissGlobalError}
                    />
                ) : null}
                {children}
            </main>
        </div>
    );
}
