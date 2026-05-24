import { TripStatus } from '@prisma/client';
import prisma from './db';
import { deleteTripFully } from './tripDelete';

/**
 * 출발 시각이 지난 open(견적) 여정을 정리합니다.
 * 여정 삭제 시 채팅방(멤버십·견적·입찰 대화 포함)도 함께 삭제됩니다.
 * awarded(낙찰·운행완료) 여정은 건드리지 않습니다.
 */
export async function expireExpiredOpenTripsForPassenger(
    passengerId: string,
): Promise<number> {
    const expired = await prisma.trip.findMany({
        where: {
            passengerId,
            status: TripStatus.open,
            dateTime: { lt: new Date() },
        },
        select: { id: true },
    });

    if (expired.length === 0) return 0;

    await prisma.$transaction(async (tx) => {
        for (const { id } of expired) {
            await deleteTripFully(id, tx);
        }
    });

    return expired.length;
}
