import bcrypt from 'bcrypt';
import { PhoneVerificationPurpose } from '@prisma/client';
import prisma from './db';

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_REQUESTS_PER_DAY = 5;
const MAX_VERIFY_ATTEMPTS = 5;

export function normalizePhoneNumber(raw: string): string | null {
    const digits = raw.replace(/[^0-9]/g, '');
    return /^01[0-9]{8,9}$/.test(digits) ? digits : null;
}

function generateCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

type IssueOtpResult =
    | { ok: true; code: string }
    | { ok: false; error: 'cooldown' | 'daily_limit' };

export async function issueOtp(
    phoneNumber: string,
    purpose: PhoneVerificationPurpose
): Promise<IssueOtpResult> {
    const now = new Date();

    const recent = await prisma.phoneVerification.findFirst({
        where: {
            phoneNumber,
            purpose,
            createdAt: { gte: new Date(now.getTime() - RESEND_COOLDOWN_MS) },
        },
        orderBy: { createdAt: 'desc' },
    });
    if (recent) {
        return { ok: false, error: 'cooldown' };
    }

    const countToday = await prisma.phoneVerification.count({
        where: {
            phoneNumber,
            purpose,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
    });
    if (countToday >= MAX_REQUESTS_PER_DAY) {
        return { ok: false, error: 'daily_limit' };
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    await prisma.phoneVerification.create({
        data: {
            phoneNumber,
            purpose,
            codeHash,
            expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        },
    });

    return { ok: true, code };
}

type ConsumeOtpResult =
    | { ok: true }
    | {
          ok: false;
          error: 'not_found' | 'expired' | 'too_many_attempts' | 'invalid_code';
      };

export async function consumeOtp(
    phoneNumber: string,
    purpose: PhoneVerificationPurpose,
    code: string
): Promise<ConsumeOtpResult> {
    const record = await prisma.phoneVerification.findFirst({
        where: { phoneNumber, purpose, consumedAt: null },
        orderBy: { createdAt: 'desc' },
    });

    if (!record) {
        return { ok: false, error: 'not_found' };
    }
    if (record.expiresAt < new Date()) {
        return { ok: false, error: 'expired' };
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        return { ok: false, error: 'too_many_attempts' };
    }

    const valid = await bcrypt.compare(code, record.codeHash);
    if (!valid) {
        await prisma.phoneVerification.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
        });
        return { ok: false, error: 'invalid_code' };
    }

    await prisma.phoneVerification.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
    });

    return { ok: true };
}
