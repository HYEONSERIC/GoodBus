/** 관리자 화면용 — API 값은 영문 유지, 표시만 한국어 */

import type { AdminStatusTone } from '@/components/admin/AdminStatusBadge';

const TRIP_STATUS_LABELS: Record<string, string> = {
    open: '진행 중',
    awarded: '낙찰',
    cancelled: '취소',
};

const BID_STATUS_LABELS: Record<string, string> = {
    open: '진행 중',
    withdrawn: '철회',
    awarded: '낙찰',
    lost: '탈락',
};

export const TRIP_STATUS_FILTER_OPTIONS = [
    { value: '', label: '전체' },
    { value: 'open', label: TRIP_STATUS_LABELS.open },
    { value: 'awarded', label: TRIP_STATUS_LABELS.awarded },
    { value: 'cancelled', label: TRIP_STATUS_LABELS.cancelled },
] as const;

export const BID_STATUS_FILTER_OPTIONS = [
    { value: '', label: '전체' },
    { value: 'open', label: BID_STATUS_LABELS.open },
    { value: 'withdrawn', label: BID_STATUS_LABELS.withdrawn },
    { value: 'awarded', label: BID_STATUS_LABELS.awarded },
    { value: 'lost', label: BID_STATUS_LABELS.lost },
] as const;

export function formatTripStatusLabel(status: string | null | undefined) {
    if (!status) return '—';
    return TRIP_STATUS_LABELS[status] ?? status;
}

export function formatBidStatusLabel(status: string | null | undefined) {
    if (!status) return '—';
    return BID_STATUS_LABELS[status] ?? status;
}

const TRIP_STATUS_TONES: Record<string, AdminStatusTone> = {
    open: 'info',
    awarded: 'success',
    cancelled: 'neutral',
};

const BID_STATUS_TONES: Record<string, AdminStatusTone> = {
    open: 'info',
    withdrawn: 'neutral',
    awarded: 'success',
    lost: 'danger',
};

export function tripStatusTone(status: string | null | undefined): AdminStatusTone {
    return (status && TRIP_STATUS_TONES[status]) || 'neutral';
}

export function bidStatusTone(status: string | null | undefined): AdminStatusTone {
    return (status && BID_STATUS_TONES[status]) || 'neutral';
}

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
    pending: '승인 대기',
    approved: '승인 완료',
    rejected: '반려',
};

/** 기사/회사 서류 승인 탭 필터 — value는 API 그대로 */
export const VERIFICATION_STATUS_FILTER_OPTIONS = [
    { value: 'pending', label: VERIFICATION_STATUS_LABELS.pending },
    { value: 'approved', label: VERIFICATION_STATUS_LABELS.approved },
    { value: 'rejected', label: VERIFICATION_STATUS_LABELS.rejected },
] as const;

export function formatVerificationStatusLabel(
    status: string | null | undefined,
) {
    if (!status) return '—';
    return VERIFICATION_STATUS_LABELS[status] ?? status;
}

const VERIFICATION_STATUS_TONES: Record<string, AdminStatusTone> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
};

export function verificationStatusTone(
    status: string | null | undefined,
): AdminStatusTone {
    return (status && VERIFICATION_STATUS_TONES[status]) || 'neutral';
}
