import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../utils/db';
import { generateToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';
import { normalizePhoneNumber, issueOtp, consumeOtp } from '../utils/otp';
import { sendOtpSms, isAligoDevMode } from '../utils/aligo';
import { createIpRateLimiter, getClientIp } from '../utils/ipRateLimit';

const router = express.Router();

// otp.ts already caps requests per *phone number* (cooldown + daily limit), but an
// attacker rotating through numbers faces no limit at all — each triggers a real,
// billable SMS/알림톡 send once Aligo is on a live key. This caps requests per IP.
const otpRequestRateLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    message: '잠시 후 다시 시도해주세요',
});

// Generous per-IP ceiling (shared office/NAT IPs are common) that still stops
// scripted credential-stuffing/brute-force — the real per-account defense is
// bcrypt's cost factor plus the [SECURITY] log below feeding a fail2ban jail.
const loginRateLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    message: '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요',
});

const signupRateLimiter = createIpRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요',
});

// All three public-signup roles authenticate by phone+OTP only — no email/password.
// Required fields vary by role: Passenger needs just a phone; Driver additionally
// needs a name; BusCompany needs a company name and a contact-person name
// (stored in `displayName`, same column Driver's name uses).
const signupSchema = z.object({
    role: z.enum(['Passenger', 'Driver', 'BusCompany']),
    displayName: z.string().trim().min(1).max(50).optional(),
    companyName: z.string().trim().min(1).max(100).optional(),
    phoneNumber: z.string().trim().min(1),
    phoneOtpCode: z.string().trim().min(1),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// 승객과 기사·회사는 같은 번호로 각각 계정을 만들 수 있어야 해서(둘 다 개인 휴대폰을
// 씀), phoneNumber 하나만으로는 계정을 특정할 수 없다. 로그인/OTP 요청 시 어느
// "계정군"을 찾는지 프론트가 명시해야 함 — 승객 로그인/가입 화면은 'passenger',
// 기사·회사 로그인/가입 화면은 'business'를 보낸다. 기사와 회사는 같은 번호로
// 동시에 둘 다는 못 만들게 이 그룹 안에서 막는다(운영 편의상 한 번호=한 사업자).
const AccountType = z.enum(['passenger', 'business']);
type AccountType = z.infer<typeof AccountType>;

function accountTypeRoleFilter(accountType: AccountType) {
    return accountType === 'passenger'
        ? ('Passenger' as const)
        : { in: ['Driver', 'BusCompany'] as ('Driver' | 'BusCompany')[] };
}

function roleToAccountType(role: 'Passenger' | 'Driver' | 'BusCompany'): AccountType {
    return role === 'Passenger' ? 'passenger' : 'business';
}

const requestOtpSchema = z.object({
    phoneNumber: z.string().trim().min(1),
    purpose: z.enum(['signup', 'login']),
    accountType: AccountType,
});

const phoneLoginSchema = z.object({
    phoneNumber: z.string().trim().min(1),
    code: z.string().trim().min(1),
    accountType: AccountType,
});

function otpErrorMessage(
    error: 'not_found' | 'expired' | 'too_many_attempts' | 'invalid_code'
): string {
    switch (error) {
        case 'invalid_code':
            return '인증번호가 올바르지 않습니다';
        case 'expired':
            return '인증번호가 만료되었습니다. 다시 요청해주세요';
        case 'too_many_attempts':
            return '인증 시도 횟수를 초과했습니다. 다시 요청해주세요';
        default:
            return '인증번호를 먼저 요청해주세요';
    }
}

router.post('/signup', signupRateLimiter, async (req, res) => {
    try {
        const {
            role,
            displayName,
            companyName,
            phoneNumber: rawPhoneNumber,
            phoneOtpCode,
        } = signupSchema.parse(req.body);

        if (role === 'Driver' && !displayName) {
            return res.status(400).json({ error: '이름을 입력해주세요' });
        }
        if (role === 'BusCompany' && (!companyName || !displayName)) {
            return res
                .status(400)
                .json({ error: '회사명과 담당자 이름을 입력해주세요' });
        }

        const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
        if (!phoneNumber) {
            return res
                .status(400)
                .json({ error: '올바른 휴대전화번호를 입력해주세요' });
        }

        const otpResult = await consumeOtp(phoneNumber, 'signup', phoneOtpCode);
        if (!otpResult.ok) {
            return res
                .status(400)
                .json({ error: otpErrorMessage(otpResult.error) });
        }

        // 같은 번호라도 승객/기사·회사 계정군이 다르면 허용 — 기사·회사끼리는
        // (Driver/BusCompany) 같은 그룹으로 취급해 한 번호에 하나만 허용.
        const existingPhone = await prisma.user.findFirst({
            where: {
                phoneNumber,
                role: accountTypeRoleFilter(roleToAccountType(role)),
            },
        });
        if (existingPhone) {
            return res.status(400).json({
                error:
                    role === 'Passenger'
                        ? '이미 승객으로 가입된 휴대전화번호입니다'
                        : '이미 기사·회사로 가입된 휴대전화번호입니다',
            });
        }

        const user = await prisma.user.create({
            data: {
                role: role as any,
                displayName: role === 'Passenger' ? undefined : displayName,
                companyName: role === 'BusCompany' ? companyName : undefined,
                phoneNumber,
                phoneVerifiedAt: new Date(),
            },
            select: {
                id: true,
                role: true,
                displayName: true,
                companyName: true,
                phoneNumber: true,
                createdAt: true,
            },
        });

        const token = generateToken({
            userId: user.id,
            role: user.role as any,
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({ user, token });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res
                .status(400)
                .json({ error: 'Invalid input', details: error.errors });
        }
        if ((error as { code?: string })?.code === 'P2002') {
            return res
                .status(400)
                .json({ error: '이미 가입에 사용된 휴대전화번호입니다' });
        }
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/phone/request-otp', otpRequestRateLimiter, async (req, res) => {
    try {
        const { phoneNumber: rawPhoneNumber, purpose, accountType } =
            requestOtpSchema.parse(req.body);

        const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
        if (!phoneNumber) {
            return res
                .status(400)
                .json({ error: '올바른 휴대전화번호를 입력해주세요' });
        }

        // 가입 여부를 응답으로 노출하면 무작위 번호 스캔으로 가입자 명단을
        // 추출할 수 있어, 대상이 아닌 경우에도 겉보기엔 같은 성공 응답을
        // 반환하되 실제 인증번호는 발송하지 않는다. accountType으로 승객/기사·회사
        // 계정군을 나눠서 찾으므로 같은 번호라도 다른 계정군엔 영향 없음.
        const user = await prisma.user.findFirst({
            where: { phoneNumber, role: accountTypeRoleFilter(accountType) },
        });
        const eligible =
            purpose === 'login'
                ? !!user && user.status !== 'Blocked'
                : !user;

        if (!eligible) {
            // devMode도 실제 발송 여부와 무관하게(서버 설정에만 의존) 동일한 값을
            // 채워, 이 필드의 유무로 가입 여부를 구분할 수 없게 한다.
            return res.json({
                message: '인증번호가 발송되었습니다',
                devMode: isAligoDevMode(),
            });
        }

        const issued = await issueOtp(phoneNumber, purpose);
        if (!issued.ok) {
            const message =
                issued.error === 'cooldown'
                    ? '잠시 후 다시 시도해주세요'
                    : '오늘 요청 가능한 인증 횟수를 초과했습니다';
            return res.status(429).json({ error: message });
        }

        const sms = await sendOtpSms(phoneNumber, issued.code);
        if (!sms.ok) {
            return res
                .status(502)
                .json({ error: '인증번호 발송에 실패했습니다' });
        }

        res.json({
            message: '인증번호가 발송되었습니다',
            devMode: sms.devMode,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res
                .status(400)
                .json({ error: 'Invalid input', details: error.errors });
        }
        console.error('request-otp error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/phone/login', loginRateLimiter, async (req, res) => {
    try {
        const { phoneNumber: rawPhoneNumber, code, accountType } =
            phoneLoginSchema.parse(req.body);

        const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
        if (!phoneNumber) {
            return res
                .status(400)
                .json({ error: '올바른 휴대전화번호를 입력해주세요' });
        }

        const otpResult = await consumeOtp(phoneNumber, 'login', code);
        if (!otpResult.ok) {
            return res
                .status(400)
                .json({ error: otpErrorMessage(otpResult.error) });
        }

        const user = await prisma.user.findFirst({
            where: { phoneNumber, role: accountTypeRoleFilter(accountType) },
        });
        if (!user) {
            return res
                .status(404)
                .json({ error: '가입되지 않은 휴대전화번호입니다' });
        }
        if (user.status === 'Blocked') {
            return res.status(403).json({ error: '차단된 계정입니다' });
        }

        if (!user.phoneVerifiedAt) {
            await prisma.user.update({
                where: { id: user.id },
                data: { phoneVerifiedAt: new Date() },
            });
        }

        const token = generateToken({ userId: user.id, role: user.role });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                displayName: user.displayName,
                companyName: user.companyName,
                phoneNumber: user.phoneNumber,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res
                .status(400)
                .json({ error: 'Invalid input', details: error.errors });
        }
        console.error('phone login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', loginRateLimiter, async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.warn(
                `[SECURITY] failed login ip=${getClientIp(req)} email=${email}`
            );
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status === 'Blocked') {
            return res.status(403).json({ error: 'Account is blocked' });
        }

        if (!user.passwordHash) {
            console.warn(
                `[SECURITY] failed login ip=${getClientIp(req)} email=${email}`
            );
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isValidPassword) {
            console.warn(
                `[SECURITY] failed login ip=${getClientIp(req)} email=${email}`
            );
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken({ userId: user.id, role: user.role });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res
                .status(400)
                .json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
            id: true,
            email: true,
            role: true,
            adminRole: true,
            createdAt: true,
            displayName: true,
            companyName: true,
            phoneNumber: true,
            garageAddress: true,
            busNumber: true,
            busType: true,
            busYear: true,
            capacity: true,
            driverComment: true,
            profileImageUrl: true,
            vehicleImageUrls: true,
            membershipPlan: true,
            minBidAddonPurchased: true,
        },
    });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({
        user: {
            ...user,
            membershipPlan: { name: user.membershipPlan },
        },
    });
});

export default router;
