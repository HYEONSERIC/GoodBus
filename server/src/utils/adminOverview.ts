import { BidStatus, TripStatus, UserRole, VerificationStatus } from '@prisma/client';
import prisma from './db';

export type AwardPeriodSummary = {
    awardCount: number;
    gmvManWon: number;
};

function effectiveAwardedAt(trip: {
    awardedAt: Date | null;
    createdAt: Date;
}): Date {
    return trip.awardedAt ?? trip.createdAt;
}

function startOfLocalDay(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** 월요일 00:00 (로컬) */
function startOfLocalWeek(d = new Date()) {
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    return startOfLocalDay(monday);
}

export function summarizeAwardsInRange(
    bids: {
        price: unknown;
        trip: { awardedAt: Date | null; createdAt: Date };
    }[],
    start: Date,
    end: Date,
): AwardPeriodSummary {
    let awardCount = 0;
    let gmvManWon = 0;
    for (const bid of bids) {
        const at = effectiveAwardedAt(bid.trip);
        if (at.getTime() < start.getTime() || at.getTime() > end.getTime()) {
            continue;
        }
        awardCount += 1;
        gmvManWon += Number(bid.price);
    }
    return { awardCount, gmvManWon };
}

export async function getAdminOverviewExtras() {
    const now = new Date();
    const todayStart = startOfLocalDay(now);
    const weekStart = startOfLocalWeek(now);

    const [
        awardedBids,
        pendingInquiries,
        pendingDriverVerifications,
        pendingCompanyVerifications,
    ] = await Promise.all([
        prisma.bid.findMany({
            where: {
                status: BidStatus.awarded,
                trip: { status: TripStatus.awarded },
            },
            select: {
                price: true,
                trip: {
                    select: {
                        awardedAt: true,
                        createdAt: true,
                    },
                },
            },
        }),
        prisma.supportInquiry.count({ where: { repliedAt: null } }),
        prisma.user.count({
            where: {
                role: UserRole.Driver,
                driverLicenseStatus: VerificationStatus.pending,
            },
        }),
        prisma.user.count({
            where: {
                role: UserRole.BusCompany,
                companyRegistrationStatus: VerificationStatus.pending,
            },
        }),
    ]);

    const pendingVerifications =
        pendingDriverVerifications + pendingCompanyVerifications;

    return {
        awardsToday: summarizeAwardsInRange(awardedBids, todayStart, now),
        awardsThisWeek: summarizeAwardsInRange(awardedBids, weekStart, now),
        pendingInquiries,
        pendingVerifications,
        navBadges: {
            faq: pendingInquiries,
            verification: pendingVerifications,
        },
    };
}
