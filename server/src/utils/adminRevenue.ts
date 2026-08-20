import { BidStatus, TripStatus } from '@prisma/client';
import prisma from './db';
import { DEFAULT_PLATFORM_COMMISSION_RATE } from './platformCommissionCore';

export { DEFAULT_PLATFORM_COMMISSION_RATE };

const awardedBidSelect = {
    id: true,
    price: true,
    bidder: {
        select: {
            email: true,
            displayName: true,
            companyName: true,
            role: true,
        },
    },
    trip: {
        select: {
            id: true,
            origin: true,
            destination: true,
            awardedAt: true,
            createdAt: true,
        },
    },
} as const;

type AwardedBidRow = {
    id: string;
    price: unknown;
    bidder: {
        email: string | null;
        displayName: string | null;
        companyName: string | null;
        role: string;
    };
    trip: {
        id: string;
        origin: string;
        destination: string;
        awardedAt: Date | null;
        createdAt: Date;
    };
};

export type RevenueMonthRow = {
    year: number;
    month: number;
    label: string;
    awardCount: number;
    gmvManWon: number;
    estimatedRevenueManWon: number;
};

export type RevenueAwardRow = {
    bidId: string;
    tripId: string;
    origin: string;
    destination: string;
    route: string;
    priceManWon: number;
    awardedAt: string | null;
    countedAt: string;
    usedCreatedAtFallback: boolean;
    bidderEmail: string | null;
    bidderDisplayName: string;
    bidderRole: string;
};

export type AdminRevenueStats = {
    fromYear: number;
    fromMonth: number;
    toYear: number;
    toMonth: number;
    commissionRate: number;
    commissionRatePercent: number;
    awardCount: number;
    gmvManWon: number;
    estimatedRevenueManWon: number;
    awardedAtMissingCount: number;
    monthly: RevenueMonthRow[];
};

function monthKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number) {
    return `${year}년 ${month}월`;
}

export function parseYearMonth(value: unknown): { year: number; month: number } | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
        return null;
    }
    const [y, m] = value.split('-').map(Number);
    if (m < 1 || m > 12) return null;
    return { year: y, month: m };
}

export function monthRangeBounds(
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number,
) {
    const start = new Date(fromYear, fromMonth - 1, 1, 0, 0, 0, 0);
    const end = new Date(toYear, toMonth, 0, 23, 59, 59, 999);
    return { start, end };
}

export function singleMonthBounds(year: number, month: number) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
}

function effectiveAwardedAt(trip: {
    awardedAt: Date | null;
    createdAt: Date;
}): Date {
    return trip.awardedAt ?? trip.createdAt;
}

function bidderDisplayName(bidder: AwardedBidRow['bidder']) {
    return (
        bidder.displayName?.trim() ||
        bidder.companyName?.trim() ||
        bidder.email ||
        '기사'
    );
}

function toAwardRow(bid: AwardedBidRow): RevenueAwardRow {
    const countedAt = effectiveAwardedAt(bid.trip);
    const usedCreatedAtFallback = bid.trip.awardedAt == null;
    return {
        bidId: bid.id,
        tripId: bid.trip.id,
        origin: bid.trip.origin,
        destination: bid.trip.destination,
        route: `${bid.trip.origin} → ${bid.trip.destination}`,
        priceManWon: Number(bid.price),
        awardedAt: bid.trip.awardedAt?.toISOString() ?? null,
        countedAt: countedAt.toISOString(),
        usedCreatedAtFallback,
        bidderEmail: bid.bidder.email,
        bidderDisplayName: bidderDisplayName(bid.bidder),
        bidderRole: bid.bidder.role,
    };
}

async function loadAwardedBids(): Promise<AwardedBidRow[]> {
    return prisma.bid.findMany({
        where: {
            status: BidStatus.awarded,
            trip: { status: TripStatus.awarded },
        },
        select: awardedBidSelect,
        orderBy: { createdAt: 'desc' },
    });
}

function listMonthsInRange(
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number,
) {
    const months: { year: number; month: number }[] = [];
    let y = fromYear;
    let m = fromMonth;
    while (y < toYear || (y === toYear && m <= toMonth)) {
        months.push({ year: y, month: m });
        m += 1;
        if (m > 12) {
            m = 1;
            y += 1;
        }
    }
    return months;
}

function filterBidsInRange(bids: AwardedBidRow[], start: Date, end: Date) {
    return bids.filter((bid) => {
        const at = effectiveAwardedAt(bid.trip);
        return at.getTime() >= start.getTime() && at.getTime() <= end.getTime();
    });
}

export async function listRevenueAwardsInRange(
    start: Date,
    end: Date,
): Promise<RevenueAwardRow[]> {
    const bids = await loadAwardedBids();
    return filterBidsInRange(bids, start, end)
        .map(toAwardRow)
        .sort(
            (a, b) =>
                new Date(b.countedAt).getTime() - new Date(a.countedAt).getTime(),
        );
}

export async function listRevenueAwardsForMonth(year: number, month: number) {
    const { start, end } = singleMonthBounds(year, month);
    return listRevenueAwardsInRange(start, end);
}

export async function computeAdminRevenueStats(params: {
    fromYear: number;
    fromMonth: number;
    toYear: number;
    toMonth: number;
    commissionRate?: number;
}): Promise<AdminRevenueStats> {
    const commissionRate =
        params.commissionRate ?? DEFAULT_PLATFORM_COMMISSION_RATE;
    const { start, end } = monthRangeBounds(
        params.fromYear,
        params.fromMonth,
        params.toYear,
        params.toMonth,
    );

    if (start.getTime() > end.getTime()) {
        throw new Error('시작 연월이 종료 연월보다 늦을 수 없습니다.');
    }

    const awardedBids = await loadAwardedBids();

    const monthBuckets = new Map<
        string,
        { awardCount: number; gmvManWon: number }
    >();
    for (const { year, month } of listMonthsInRange(
        params.fromYear,
        params.fromMonth,
        params.toYear,
        params.toMonth,
    )) {
        monthBuckets.set(monthKey(year, month), {
            awardCount: 0,
            gmvManWon: 0,
        });
    }

    let awardCount = 0;
    let gmvManWon = 0;
    let awardedAtMissingCount = 0;

    for (const bid of awardedBids) {
        const at = effectiveAwardedAt(bid.trip);
        if (at.getTime() < start.getTime() || at.getTime() > end.getTime()) {
            continue;
        }
        const price = Number(bid.price);
        awardCount += 1;
        gmvManWon += price;
        if (bid.trip.awardedAt == null) {
            awardedAtMissingCount += 1;
        }

        const key = monthKey(at.getFullYear(), at.getMonth() + 1);
        const bucket = monthBuckets.get(key);
        if (bucket) {
            bucket.awardCount += 1;
            bucket.gmvManWon += price;
        }
    }

    const estimatedRevenueManWon = gmvManWon * commissionRate;

    const monthly: RevenueMonthRow[] = listMonthsInRange(
        params.fromYear,
        params.fromMonth,
        params.toYear,
        params.toMonth,
    ).map(({ year, month }) => {
        const bucket = monthBuckets.get(monthKey(year, month)) ?? {
            awardCount: 0,
            gmvManWon: 0,
        };
        return {
            year,
            month,
            label: monthLabel(year, month),
            awardCount: bucket.awardCount,
            gmvManWon: bucket.gmvManWon,
            estimatedRevenueManWon: bucket.gmvManWon * commissionRate,
        };
    });

    return {
        fromYear: params.fromYear,
        fromMonth: params.fromMonth,
        toYear: params.toYear,
        toMonth: params.toMonth,
        commissionRate,
        commissionRatePercent: Math.round(commissionRate * 1000) / 10,
        awardCount,
        gmvManWon,
        estimatedRevenueManWon,
        awardedAtMissingCount,
        monthly,
    };
}
