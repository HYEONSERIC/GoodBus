import { TripStatus } from '@prisma/client';
import prisma from '../utils/db';
import { deleteTripFully } from '../utils/tripDelete';

async function main() {
    const cancelled = await prisma.trip.findMany({
        where: { status: TripStatus.cancelled },
        select: { id: true },
    });

    if (cancelled.length === 0) {
        console.log('삭제할 취소(cancelled) 여정이 없습니다.');
        return;
    }

    console.log(`취소 여정 ${cancelled.length}건 삭제 중…`);

    for (const { id } of cancelled) {
        await deleteTripFully(id);
    }

    console.log(`완료: ${cancelled.length}건 삭제됨.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
