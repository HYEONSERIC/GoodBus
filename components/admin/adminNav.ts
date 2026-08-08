import {
    LayoutDashboard,
    Users,
    Gavel,
    Bell,
    BadgeCheck,
    BarChart3,
    MessageCircleQuestion,
    UserPlus,
    type LucideIcon,
} from 'lucide-react';
import type { AdminNavBadges, AdminTabId } from '@/types/admin';

export const ADMIN_SECTION_TITLES: Record<AdminTabId, string> = {
    overview: '요약',
    users: '사용자',
    bids: '입찰/낙찰 관리',
    notifications: '알림 히스토리',
    verification: '기사/회사 승인',
    revenue: '매출·거래',
    faq: 'FAQ/문의',
    adminCreate: '관리자 계정 생성',
};

export const ADMIN_SECTION_DESCRIPTIONS: Partial<Record<AdminTabId, string>> = {
    overview: '오늘·이번 주 낙찰 현황과 처리 대기 건을 한눈에 확인하세요',
    users: '이메일·역할·상태로 회원을 찾아 상세 정보를 확인하고 계정을 차단·해제하세요',
    bids: '이메일·출발지·도착지·기간으로 입찰·낙찰 내역을 조회합니다 (최대 50건 표시)',
    notifications: '발송된 알림 히스토리를 검색어와 기간으로 확인합니다',
    verification: '기사·회사가 제출한 서류를 검토해 승인 또는 반려하세요',
    revenue: '낙찰 기준 월별 거래액과 추정 수수료를 확인합니다',
    faq: '공지·FAQ를 작성하고 1:1 문의에 답변하세요',
    adminCreate: '운영·고객지원·재무 역할의 서브 관리자 계정을 생성합니다',
};

export type AdminNavGroup = '운영' | '관리';

export type AdminNavItem = {
    id: AdminTabId;
    label: string;
    icon: LucideIcon;
    group: AdminNavGroup;
    /** overview.navBadges 키와 연결 */
    badgeKey?: keyof AdminNavBadges;
    visible?: (adminRole: string | null) => boolean;
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = ['운영', '관리'];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
    { id: 'overview', label: '요약', icon: LayoutDashboard, group: '운영' },
    { id: 'users', label: '사용자', icon: Users, group: '운영' },
    { id: 'bids', label: '입찰/낙찰 관리', icon: Gavel, group: '운영' },
    { id: 'notifications', label: '알림 히스토리', icon: Bell, group: '운영' },
    {
        id: 'verification',
        label: '기사/회사 승인',
        icon: BadgeCheck,
        group: '운영',
        badgeKey: 'verification',
    },
    {
        id: 'faq',
        label: 'FAQ/문의',
        icon: MessageCircleQuestion,
        group: '운영',
        badgeKey: 'faq',
    },
    {
        id: 'revenue',
        label: '매출·거래',
        icon: BarChart3,
        group: '관리',
        visible: (role) => role !== 'CustomerSupport',
    },
    {
        id: 'adminCreate',
        label: '관리자 계정 생성',
        icon: UserPlus,
        group: '관리',
        visible: (role) => role === 'Super',
    },
];
