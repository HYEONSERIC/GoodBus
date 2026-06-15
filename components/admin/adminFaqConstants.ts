import type {
    SupportInquiryListSort,
    SupportInquiryListStatus,
} from '@/types/admin';

export const ADMIN_FAQ_SUB_TABS = [
    { id: 'posts' as const, label: '게시글 관리' },
    { id: 'inquiries' as const, label: '문의사항' },
] as const;

export const INQUIRY_STATUS_FILTER_OPTIONS: {
    value: SupportInquiryListStatus;
    label: string;
}[] = [
    { value: 'all', label: '전체' },
    { value: 'pending', label: '답변 대기만' },
    { value: 'replied', label: '답변 완료만' },
];

export const INQUIRY_SORT_OPTIONS: {
    value: SupportInquiryListSort;
    label: string;
}[] = [
    { value: 'unanswered_first', label: '미답변 우선' },
    { value: 'newest', label: '최신 접수순' },
    { value: 'oldest', label: '오래된 순' },
];
