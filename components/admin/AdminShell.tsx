'use client';

import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    ADMIN_NAV_GROUPS,
    ADMIN_NAV_ITEMS,
    ADMIN_SECTION_DESCRIPTIONS,
    ADMIN_SECTION_TITLES,
} from '@/components/admin/adminNav';
import { AdminErrorBanner } from '@/components/admin/AdminErrorBanner';
import type { AdminNavBadges, AdminTabId } from '@/types/admin';

const ADMIN_ROLE_LABELS: Record<string, string> = {
    Super: '최고 관리자',
    CustomerSupport: '고객지원',
    Operations: '운영',
    Finance: '재무',
};

function todayLabel() {
    return new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });
}

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
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const visibleNavItems = ADMIN_NAV_ITEMS.filter(
        (item) => item.visible?.(adminRole) ?? true,
    );
    const roleLabel = adminRole ? ADMIN_ROLE_LABELS[adminRole] ?? adminRole : null;
    const initial = (roleLabel ?? '관')[0];

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {mobileNavOpen ? (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
                    onClick={() => setMobileNavOpen(false)}
                    aria-hidden="true"
                />
            ) : null}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:translate-x-0 ${
                    mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-slate-100 px-5 py-5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-700 text-sm font-bold text-white">
                            GB
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                                GoodBus
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                관리자 콘솔
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="메뉴 닫기"
                        className="shrink-0 text-slate-500 lg:hidden"
                        onClick={() => setMobileNavOpen(false)}
                    >
                        <X className="size-4" />
                    </Button>
                </div>

                <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
                    {ADMIN_NAV_GROUPS.map((group) => {
                        const items = visibleNavItems.filter(
                            (item) => item.group === group,
                        );
                        if (items.length === 0) return null;
                        return (
                            <div key={group}>
                                <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    {group}
                                </p>
                                <div className="flex flex-col gap-0.5">
                                    {items.map((item) => {
                                        const isActive = activeTab === item.id;
                                        const badgeCount =
                                            item.badgeKey && navBadges
                                                ? navBadges[item.badgeKey] ?? 0
                                                : 0;
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    onTabChange(item.id);
                                                    setMobileNavOpen(false);
                                                }}
                                                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium transition-colors ${
                                                    isActive
                                                        ? 'bg-sky-700 text-white shadow-sm'
                                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                }`}
                                            >
                                                <Icon
                                                    className="size-4 shrink-0"
                                                    strokeWidth={2}
                                                />
                                                <span className="min-w-0 flex-1 truncate">
                                                    {item.label}
                                                </span>
                                                {badgeCount > 0 ? (
                                                    <span
                                                        className={`min-w-[1.25rem] shrink-0 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
                                                            isActive
                                                                ? 'bg-white text-sky-700'
                                                                : 'bg-red-500 text-white'
                                                        }`}
                                                    >
                                                        {badgeCount > 99
                                                            ? '99+'
                                                            : badgeCount}
                                                    </span>
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className="shrink-0 border-t border-slate-100 p-3">
                    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                            {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                                {roleLabel ?? '관리자'}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {adminRole ?? '-'}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="로그아웃"
                            title="로그아웃"
                            className="shrink-0 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            onClick={onLogout}
                        >
                            <LogOut className="size-4" />
                        </Button>
                    </div>
                </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="메뉴 열기"
                        className="shrink-0 text-slate-600"
                        onClick={() => setMobileNavOpen(true)}
                    >
                        <Menu className="size-5" />
                    </Button>
                    <span className="truncate text-sm font-semibold text-slate-900">
                        {ADMIN_SECTION_TITLES[activeTab]}
                    </span>
                </div>

                <main className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 md:p-8">
                    <header className="hidden flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4 lg:flex">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                                {ADMIN_SECTION_TITLES[activeTab]}
                            </h2>
                            {ADMIN_SECTION_DESCRIPTIONS[activeTab] ? (
                                <p className="mt-1 text-sm text-slate-500">
                                    {ADMIN_SECTION_DESCRIPTIONS[activeTab]}
                                </p>
                            ) : null}
                        </div>
                        <p className="text-xs text-slate-400">{todayLabel()}</p>
                    </header>
                    {ADMIN_SECTION_DESCRIPTIONS[activeTab] ? (
                        <p className="-mt-2 text-sm text-slate-500 lg:hidden">
                            {ADMIN_SECTION_DESCRIPTIONS[activeTab]}
                        </p>
                    ) : null}
                    {globalError ? (
                        <AdminErrorBanner
                            message={globalError}
                            onDismiss={onDismissGlobalError}
                        />
                    ) : null}
                    {children}
                </main>
            </div>
        </div>
    );
}
