export function getServicePurposeLabel(purpose?: string | null): string | null {
    if (!purpose?.trim()) return null;
    if (purpose === 'MT/학교') return '학교 행사/MT';
    return purpose.trim();
}

/** 공개 후기용 — 이름·이메일 일부만 표시 (예: 9***님) */
export function formatMaskedReviewerName(passenger?: {
    displayName?: string | null;
    email?: string;
}): string {
    const name = passenger?.displayName?.trim();
    if (name) {
        return `${name.charAt(0)}***님`;
    }
    const local = passenger?.email?.split('@')[0]?.trim();
    if (local) {
        return `${local.charAt(0)}***님`;
    }
    return '이용자님';
}

/** 예: 9***님 골프 후기 */
export function formatReviewHeadline(
    passenger?: { displayName?: string | null; email?: string },
    servicePurpose?: string | null,
): string {
    const masked = formatMaskedReviewerName(passenger);
    const purpose = getServicePurposeLabel(servicePurpose);
    if (purpose) {
        return `${masked} ${purpose} 후기`;
    }
    return `${masked} 이용 후기`;
}

/** 본인 리뷰 카드용 */
export function formatOwnReviewHeadline(servicePurpose?: string | null): string {
    const purpose = getServicePurposeLabel(servicePurpose);
    if (purpose) {
        return `${purpose} 이용 후기`;
    }
    return '내 이용 후기';
}
