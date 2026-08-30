'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, Home, Menu } from 'lucide-react';
import { Notifications } from '@/components/Notifications';
import {
    DashboardBottomTabs,
    type BottomTabItem,
} from '@/components/layout/DashboardBottomTabs';

export type DashboardHeaderVariant =
    | 'menu'
    | 'membership'
    | 'paymentCards'
    | 'paymentHistory';

export function DashboardMobileShell<T extends string>({
    children,
    showHeader = true,
    headerVariant = 'menu',
    headerTitle = '버스대절',
    onMenuClick,
    onBack,
    onHome,
    bottomTabs,
    contentMaxWidth = 'xl',
    footer,
}: {
    children: ReactNode;
    showHeader?: boolean;
    headerVariant?: DashboardHeaderVariant;
    headerTitle?: string;
    onMenuClick?: () => void;
    onBack?: () => void;
    onHome?: () => void;
    bottomTabs?: {
        tabs: readonly BottomTabItem<T>[];
        activeTab: T;
        onChange: (tab: T) => void;
        columnClass?: string;
        hidden?: boolean;
    };
    contentMaxWidth?: 'xl' | '4xl';
    /** 헤더·본문·하단탭 밖에 두는 오버레이(다이얼로그 등) */
    footer?: ReactNode;
}) {
    const maxW = contentMaxWidth === '4xl' ? 'max-w-4xl' : 'max-w-xl';
    const contentPad =
        'pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]';

    return (
        <div className="min-h-screen bg-[#f3f3f5]">
            {showHeader ? (
                <div className="border-b border-gray-200 bg-white/90 backdrop-blur">
                    <div className="relative flex w-full items-center justify-center px-3 py-4 sm:px-4">
                        {headerVariant === 'membership' ||
                        headerVariant === 'paymentCards' ||
                        headerVariant === 'paymentHistory' ? (
                            <>
                                <div className="absolute left-3 sm:left-4">
                                    <button
                                        type="button"
                                        aria-label="뒤로가기"
                                        className="-m-2.5 flex size-11 items-center justify-center text-gray-600 hover:text-black"
                                        onClick={onBack}
                                    >
                                        <ArrowLeft className="size-5" strokeWidth={2} />
                                    </button>
                                </div>
                                <span className="text-lg font-semibold">
                                    {headerTitle}
                                </span>
                                <div className="absolute right-3 sm:right-4">
                                    <button
                                        type="button"
                                        aria-label="홈으로"
                                        className="-m-2.5 flex size-11 items-center justify-center text-gray-600 hover:text-black"
                                        onClick={onHome}
                                    >
                                        <Home className="size-5" strokeWidth={2} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="absolute left-3 sm:left-4">
                                    <button
                                        type="button"
                                        aria-label="메뉴 열기"
                                        className="-m-2.5 inline-flex min-h-11 items-center gap-1 px-2.5 text-sm text-gray-700 hover:text-black"
                                        onClick={onMenuClick}
                                    >
                                        <Menu className="size-4.5" strokeWidth={2} />
                                        <span>메뉴</span>
                                    </button>
                                </div>
                                <span className="text-lg font-semibold">
                                    {headerTitle}
                                </span>
                                <div className="absolute right-3 flex items-center gap-3 sm:right-4">
                                    <Notifications />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}

            <div
                className={`mx-auto w-full ${maxW} space-y-4 px-4 pt-5 sm:px-5 sm:pt-6 ${contentPad}`}
            >
                {children}
            </div>

            {bottomTabs && !bottomTabs.hidden ? (
                <DashboardBottomTabs
                    tabs={bottomTabs.tabs}
                    activeTab={bottomTabs.activeTab}
                    onChange={bottomTabs.onChange}
                    columnClass={bottomTabs.columnClass}
                />
            ) : null}

            {footer}
        </div>
    );
}
