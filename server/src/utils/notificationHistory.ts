import { NotificationType, Prisma, PrismaClient } from '@prisma/client';
import prisma from './db';

export const NOTIFICATION_HISTORY_RETENTION_DAYS = 30;

export function getNotificationHistoryCutoff(now = new Date()) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - NOTIFICATION_HISTORY_RETENTION_DAYS);
    return cutoff;
}

type NotificationHistoryClient = PrismaClient | Prisma.TransactionClient;

export async function deleteExpiredNotificationHistory(
    client: NotificationHistoryClient = prisma
) {
    return client.notificationHistory.deleteMany({
        where: {
            readAt: {
                lt: getNotificationHistoryCutoff(),
            },
        },
    });
}

export function parsePagination(query: {
    page?: unknown;
    pageSize?: unknown;
}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);

    return {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
    };
}

export function parseNotificationType(type: unknown) {
    if (type === NotificationType.BID_RECEIVED) return NotificationType.BID_RECEIVED;
    if (type === NotificationType.BID_AWARDED) return NotificationType.BID_AWARDED;
    return undefined;
}

export function buildReadAtFilter(startDate?: unknown, endDate?: unknown) {
    const readAt: Prisma.DateTimeFilter = {};

    if (startDate) {
        const start = new Date(String(startDate));
        if (!Number.isNaN(start.getTime())) {
            readAt.gte = start;
        }
    }

    if (endDate) {
        const end = new Date(String(endDate));
        if (!Number.isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            readAt.lte = end;
        }
    }

    return Object.keys(readAt).length ? readAt : undefined;
}

export async function attachNotificationHistoryDetails<T extends {
    tripId: string | null;
    bidId: string | null;
}>(rows: T[]) {
    const tripIds = Array.from(
        new Set(rows.map((row) => row.tripId).filter(Boolean))
    ) as string[];
    const bidIds = Array.from(
        new Set(rows.map((row) => row.bidId).filter(Boolean))
    ) as string[];

    const [trips, bids] = await Promise.all([
        tripIds.length
            ? prisma.trip.findMany({
                  where: { id: { in: tripIds } },
                  select: {
                      id: true,
                      origin: true,
                      destination: true,
                      dateTime: true,
                  },
              })
            : Promise.resolve([]),
        bidIds.length
            ? prisma.bid.findMany({
                  where: { id: { in: bidIds } },
                  select: {
                      id: true,
                      price: true,
                      status: true,
                      trip: {
                          select: {
                              id: true,
                              origin: true,
                              destination: true,
                              dateTime: true,
                          },
                      },
                  },
              })
            : Promise.resolve([]),
    ]);

    const tripMap = new Map(trips.map((trip) => [trip.id, trip]));
    const bidMap = new Map(bids.map((bid) => [bid.id, bid]));

    return rows.map((row) => ({
        ...row,
        trip: row.tripId
            ? tripMap.get(row.tripId) || bidMap.get(row.bidId || '')?.trip || null
            : bidMap.get(row.bidId || '')?.trip || null,
        bid: row.bidId ? bidMap.get(row.bidId) || null : null,
    }));
}
