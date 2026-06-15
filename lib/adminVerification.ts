import type { VerificationRow } from '@/types/admin';

export function verificationKindForUser(
    user: VerificationRow,
): 'driver' | 'company' {
    return user.role === 'BusCompany' ? 'company' : 'driver';
}

export function verificationDisplayForUser(user: VerificationRow) {
    const kind = verificationKindForUser(user);
    if (kind === 'company') {
        return {
            kind,
            imagePath: user.companyRegistrationUrl,
            status: user.companyRegistrationStatus,
            note: user.companyRegistrationNote,
            docLabel: '사업자등록증',
            roleLabel: '버스회사',
        };
    }
    return {
        kind,
        imagePath: user.driverLicenseUrl,
        status: user.driverLicenseStatus,
        note: user.driverLicenseNote,
        docLabel: '버스면허증',
        roleLabel: '기사',
    };
}
