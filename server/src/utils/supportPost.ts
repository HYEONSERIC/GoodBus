import { AdminRole, SupportPostKind } from '@prisma/client';

export function formatSupportAuthorLabel(role: AdminRole): string {
    switch (role) {
        case AdminRole.Super:
            return '관리자';
        case AdminRole.CustomerSupport:
            return '고객센터';
        case AdminRole.Operations:
            return '운영팀';
        case AdminRole.Finance:
            return '재무';
        default:
            return '관리자';
    }
}

export function parseSupportPostKind(
    value: unknown,
): SupportPostKind | undefined {
    const k = String(value || '').trim().toLowerCase();
    if (k === 'notice') return SupportPostKind.notice;
    if (k === 'faq') return SupportPostKind.faq;
    return undefined;
}
