import prisma from '../utils/db';
import { expireExpiredOpenTripsForPassenger } from '../utils/expireOpenTrips';

/** 모든 승객의 만료 open 여정을 일괄 정리 (수동 실행용). */
async function main() {
    const passengers = await prisma.user.findMany({
        where: { role: 'Passenger' },
        select: { id: true, email: true },
    });

    let total = 0;
    for (const p of passengers) {
        const n = await expireExpiredOpenTripsForPassenger(p.id);
        if (n > 0) {
            console.log(`${p.email}: ${n}건`);
            total += n;
        }
    }

    console.log(
        total > 0
            ? `완료: 총 ${total}건 정리됨.`
            : '만료된 open 여정이 없습니다.',
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
