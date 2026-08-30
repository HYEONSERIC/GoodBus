import bcrypt from 'bcrypt';
import { PhoneAccountType, PhoneVerificationPurpose } from '@prisma/client';
import prisma from './db';

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
// 예전엔 "하루 5회"만 있어서 하루치를 다 쓰면 다음날까지 완전히 막혔음(정상
// 사용자도 여러 번 로그인/재전송하다 자정까지 잠기는 문제) — 대신 "최근 N분
// 내 M회"로 슬라이딩 윈도우를 두면 시간이 지나면 자연히 풀리고 대기 시간도
// 안내할 수 있다. 하루 상한은 지속적인 남용을 막는 훨씬 넉넉한 백스톱으로만
// 남긴다.
const SHORT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_SHORT_WINDOW = 5;
const MAX_REQUESTS_PER_DAY = 20;
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
    | { ok: false; error: 'cooldown' }
    | { ok: false; error: 'rate_limited'; retryAfterSeconds: number }
    | { ok: false; error: 'daily_limit' };

export async function issueOtp(
    phoneNumber: string,
    purpose: PhoneVerificationPurpose,
    accountType: PhoneAccountType
): Promise<IssueOtpResult> {
    const now = new Date();

    const recent = await prisma.phoneVerification.findFirst({
        where: {
            phoneNumber,
            purpose,
            accountType,
            createdAt: { gte: new Date(now.getTime() - RESEND_COOLDOWN_MS) },
        },
        orderBy: { createdAt: 'desc' },
    });
    if (recent) {
        return { ok: false, error: 'cooldown' };
    }

    const windowStart = new Date(now.getTime() - SHORT_WINDOW_MS);
    const recentInWindow = await prisma.phoneVerification.findMany({
        where: {
            phoneNumber,
            purpose,
            accountType,
            createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
    });
    if (recentInWindow.length >= MAX_REQUESTS_PER_SHORT_WINDOW) {
        const oldest = recentInWindow[0].createdAt;
        const retryAfterMs =
            oldest.getTime() + SHORT_WINDOW_MS - now.getTime();
        return {
            ok: false,
            error: 'rate_limited',
            retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        };
    }

    const countToday = await prisma.phoneVerification.count({
        where: {
            phoneNumber,
            purpose,
            accountType,
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
            accountType,
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
    code: string,
    accountType: PhoneAccountType
): Promise<ConsumeOtpResult> {
    const record = await prisma.phoneVerification.findFirst({
        where: { phoneNumber, purpose, accountType, consumedAt: null },
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

    // 성공(=실제 번호 소유자만 만들 수 있는 결과)했으면 이 번호의 요청 이력을
    // 지워 다음에 다시 인증할 때 이전의 실패/재시도 때문에 쌓인 요청-횟수
    // 제한에 걸리지 않게 한다. 코드 추측 자체를 막는 방어선(코드당 시도
    // 횟수 제한·만료·엔트로피)은 이 초기화와 무관하게 그대로 유지된다.
    await prisma.phoneVerification.deleteMany({
        where: { phoneNumber, purpose, accountType },
    });

    return { ok: true };
}
