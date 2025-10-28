import { PrismaClient } from '@prisma/client';
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
        },
    });

    const driver = await prisma.user.upsert({
        where: { email: 'driver@example.com' },
        update: {},
        create: {
            email: 'driver@example.com',
            passwordHash,
            role: 'Driver',
        },
    });

    const company = await prisma.user.upsert({
        where: { email: 'company@example.com' },
        update: {},
        create: {
            email: 'company@example.com',
            passwordHash,
            role: 'BusCompany',
        },
    });

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
    console.log('Created users:', { passenger, driver, company });
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
