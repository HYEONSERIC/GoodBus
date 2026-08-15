import { Prisma } from '@prisma/client';
import prisma from './db';

/** Acquires a transaction-scoped Postgres advisory lock for `key` on `tx`. */
export async function acquireAdvisoryLock(
    tx: Prisma.TransactionClient,
    key: string,
): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

/**
 * Serializes concurrent charge attempts for the same (userId, purpose) pair using a
 * Postgres transaction-scoped advisory lock. Without this, a double-click or a client
 * retry can race two requests through "read current state -> charge via Toss -> write
 * result" before either has committed, charging the billing key twice for one action.
 * The lock is released automatically when the transaction commits or rolls back.
 */
export async function withPaymentLock<T>(
    userId: string,
    purpose: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
    return prisma.$transaction(
        async (tx) => {
            await acquireAdvisoryLock(tx, `${purpose}:${userId}`);
            return fn(tx);
        },
        { timeout: 20000, maxWait: 10000 },
    );
}
