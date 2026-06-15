import type { AdminNotificationHistoryRow } from '@/types/admin';

export function formatNotificationResult(item: AdminNotificationHistoryRow) {
    if (item.bid?.status === 'awarded' || item.type === 'BID_AWARDED') {
        return '입찰 성공';
    }
    if (['lost', 'withdrawn'].includes(item.bid?.status || '')) {
        return '입찰 실패';
    }
    if (item.title.toLowerCase().includes('cancel')) {
        return '입찰 실패';
    }
    return '입찰 대기';
}
