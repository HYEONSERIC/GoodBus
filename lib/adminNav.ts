import type { AdminTabId } from '@/types/admin';

export type AdminNavQuery = {
    tab?: AdminTabId;
    userId?: string;
    bidSearch?: string;
    bidStatus?: string;
    bidderId?: string;
    passengerId?: string;
    tripId?: string;
};

export function buildAdminHref(query: AdminNavQuery) {
    const params = new URLSearchParams();
    if (query.tab) params.set('tab', query.tab);
    if (query.userId) params.set('userId', query.userId);
    if (query.bidSearch) params.set('bidSearch', query.bidSearch);
    if (query.bidStatus) params.set('bidStatus', query.bidStatus);
    if (query.bidderId) params.set('bidderId', query.bidderId);
    if (query.passengerId) params.set('passengerId', query.passengerId);
    if (query.tripId) params.set('tripId', query.tripId);
    const q = params.toString();
    return q ? `/admin?${q}` : '/admin';
}

export function parseAdminNavQuery(
    searchParams: URLSearchParams,
): AdminNavQuery {
    const tab = searchParams.get('tab');
    const validTabs: AdminTabId[] = [
        'overview',
        'users',
        'bids',
        'notifications',
        'verification',
        'revenue',
        'faq',
        'adminCreate',
    ];
    return {
        tab:
            tab && validTabs.includes(tab as AdminTabId)
                ? (tab as AdminTabId)
                : undefined,
        userId: searchParams.get('userId') || undefined,
        bidSearch: searchParams.get('bidSearch') || undefined,
        bidStatus: searchParams.get('bidStatus') || undefined,
        bidderId: searchParams.get('bidderId') || undefined,
        passengerId: searchParams.get('passengerId') || undefined,
        tripId: searchParams.get('tripId') || undefined,
    };
}
