import type { AdminTabId } from '@/types/admin';

export const ADMIN_SECTION_TITLES: Record<AdminTabId, string> = {
    overview: '요약',
    users: '사용자',
    bids: '입찰/낙찰 관리',
    notifications: '알림 히스토리',
    verification: '기사/회사 승인',
    revenue: '매출 (예정)',
    faq: 'FAQ/문의',
    adminCreate: '관리자 계정 생성',
};

export type AdminNavItem = {
    id: AdminTabId;
    label: string;
    visible?: (adminRole: string | null) => boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
    { id: 'overview', label: '요약' },
    { id: 'users', label: '사용자' },
    { id: 'bids', label: '입찰/낙찰 관리' },
    { id: 'notifications', label: '알림 히스토리' },
    { id: 'verification', label: '기사/회사 승인' },
    {
        id: 'revenue',
        label: '매출 (예정)',
        visible: (role) => role !== 'CustomerSupport',
    },
    { id: 'faq', label: 'FAQ/문의' },
    {
        id: 'adminCreate',
        label: '관리자 계정 생성',
        visible: (role) => role === 'Super',
    },
];
