import prisma from './db';
import type { Prisma } from '@prisma/client';

type DbClient = Prisma.TransactionClient | typeof prisma;

/** 여정 삭제 시 알림·입찰·채팅 등 연관 데이터를 함께 정리합니다. */
export async function deleteTripFully(
    tripId: string,
    client: DbClient = prisma,
) {
    await client.notification.deleteMany({ where: { tripId } });
    await client.notificationHistory.deleteMany({ where: { tripId } });
    await client.trip.delete({ where: { id: tripId } });
}
