import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing database...');

    // Delete in order to respect foreign key constraints
    // 1. Delete notifications first (depends on User, Trip, Bid)
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`Deleted ${deletedNotifications.count} notifications`);

    // 2. Delete bids (depends on Trip and User)
    const deletedBids = await prisma.bid.deleteMany({});
    console.log(`Deleted ${deletedBids.count} bids`);

    // 3. Delete trips (depends on User)
    const deletedTrips = await prisma.trip.deleteMany({});
    console.log(`Deleted ${deletedTrips.count} trips`);

    // Note: Users are kept for testing purposes
    // If you want to delete users too, uncomment the following:
    // const deletedUsers = await prisma.user.deleteMany({});
    // console.log(`Deleted ${deletedUsers.count} users`);

    console.log('Database cleared successfully!');
    console.log('Users are preserved. To delete users too, modify clear.ts');
}

main()
    .catch((e) => {
        console.error('Error clearing database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

