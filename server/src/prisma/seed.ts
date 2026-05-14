import { PrismaClient, SupportPostKind, AdminRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const passwordHash = await bcrypt.hash('password123', 10);

    // Create users
    const passenger = await prisma.user.upsert({
        where: { email: 'passenger@example.com' },
        update: {},
        create: {
            email: 'passenger@example.com',
            passwordHash,
            role: 'Passenger',
            status: 'Active',
        },
    });

    const driver = await prisma.user.upsert({
        where: { email: 'driver@example.com' },
        update: {},
        create: {
            email: 'driver@example.com',
            passwordHash,
            role: 'Driver',
            status: 'Active',
        },
    });

    const company = await prisma.user.upsert({
        where: { email: 'company@example.com' },
        update: {},
        create: {
            email: 'company@example.com',
            passwordHash,
            role: 'BusCompany',
            status: 'Active',
        },
    });

    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            passwordHash,
            role: 'Admin',
            status: 'Active',
            adminRole: 'Super',
        },
    });

    const supportCount = await prisma.supportPost.count();
    if (supportCount === 0) {
        await prisma.supportPost.createMany({
            data: [
                {
                    kind: SupportPostKind.notice,
                    title: 'GOODBUS 서비스 점검 안내 (5/18 새벽)',
                    body: '서비스 안정화를 위해 5월 18일 새벽 점검이 예정되어 있습니다. 이용에 참고 부탁드립니다.',
                    pinned: true,
                    authorRole: AdminRole.Operations,
                    createdById: admin.id,
                },
                {
                    kind: SupportPostKind.notice,
                    title: '결제 및 환불 정책 안내',
                    body: '결제·환불 절차 및 유의사항입니다. 자세한 내용은 본문을 확인해 주세요.',
                    pinned: false,
                    authorRole: AdminRole.CustomerSupport,
                    createdById: admin.id,
                },
                {
                    kind: SupportPostKind.faq,
                    title: '견적 요청 후 입찰이 얼마나 걸리나요?',
                    body: '지역·시간대에 따라 다르며, 보통 수 시간~48시간 이내에 견적이 올라옵니다.',
                    pinned: false,
                    authorRole: AdminRole.CustomerSupport,
                    createdById: admin.id,
                },
                {
                    kind: SupportPostKind.faq,
                    title: '낙찰 후 일정·경로 변경은 어떻게 하나요?',
                    body: '낙찰 후 변경은 기사님과 채팅으로 협의 후 진행해 주세요.',
                    pinned: false,
                    authorRole: AdminRole.CustomerSupport,
                    createdById: admin.id,
                },
            ],
        });
    }

    // Create a sample trip
    const trip = await prisma.trip.create({
        data: {
            passengerId: passenger.id,
            origin: 'New York',
            destination: 'Boston',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            paxCount: 20,
            busSize: 'medium',
            status: 'open',
        },
    });

    console.log('Seed completed!');
    console.log('Created users:', { passenger, driver, company, admin });
    console.log('Created trip:', trip);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
