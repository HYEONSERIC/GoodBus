import { SupportInquiryCategory } from '@prisma/client';

const CATEGORY_VALUES = Object.values(SupportInquiryCategory) as string[];

export function parseSupportInquiryCategory(
    value: unknown
): SupportInquiryCategory | null {
    const s = String(value ?? '').trim();
    return CATEGORY_VALUES.includes(s)
        ? (s as SupportInquiryCategory)
        : null;
}

export function formatSupportInquiryCategory(
    cat: SupportInquiryCategory
): string {
    switch (cat) {
        case SupportInquiryCategory.quote_amount:
            return '견적·금액';
        case SupportInquiryCategory.reservation_progress:
            return '예약·진행';
        case SupportInquiryCategory.verification:
            return '자격증·인증';
        case SupportInquiryCategory.other:
            return '기타';
        default:
            return String(cat);
    }
}
