import { UserRole } from '@prisma/client';
import prisma from './db';

export type AdminBidderAwardStats = {
    awardedCount: number;
    gmvManWon: number;
};

export type AdminReviewSummary = {
    count: number;
    avgRating: number | null;
    /** 기사·회사: 받은 리뷰, 승객: 작성한 리뷰 */
    as: 'received' | 'written';
};

export async function computeBidderAwardStats(
    userId: string,
): Promise<AdminBidderAwardStats> {
    const agg = await prisma.bid.aggregate({
        where: { bidderId: userId, status: 'awarded' },
        _count: { _all: true },
        _sum: { price: true },
    });
    return {
        awardedCount: agg._count._all,
        gmvManWon: Number(agg._sum.price ?? 0),
    };
}

export async function computeReviewSummaryForUser(
    userId: string,
    role: UserRole,
): Promise<AdminReviewSummary | null> {
    if (role === UserRole.Driver || role === UserRole.BusCompany) {
        const reviews = await prisma.tripReview.findMany({
            where: { driverId: userId },
            select: { rating: true },
        });
        const count = reviews.length;
        if (count === 0) {
            return { count: 0, avgRating: null, as: 'received' };
        }
        const avg =
            reviews.reduce((s, r) => s + r.rating, 0) / count;
        return { count, avgRating: Math.round(avg * 10) / 10, as: 'received' };
    }
    if (role === UserRole.Passenger) {
        const reviews = await prisma.tripReview.findMany({
            where: { passengerId: userId },
            select: { rating: true },
        });
        const count = reviews.length;
        if (count === 0) {
            return { count: 0, avgRating: null, as: 'written' };
        }
        const avg =
            reviews.reduce((s, r) => s + r.rating, 0) / count;
        return { count, avgRating: Math.round(avg * 10) / 10, as: 'written' };
    }
    return null;
}
