import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../utils/db';
import { generateToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';
import { normalizePhoneNumber, issueOtp, consumeOtp } from '../utils/otp';
import { sendOtpSms } from '../utils/aligo';

const router = express.Router();

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['Passenger', 'Driver', 'BusCompany']),
    displayName: z.string().trim().min(1).max(50).optional(),
    // Required for Passenger signups only — Driver/BusCompany add a phone
    // number later via their profile screen instead (see PROJECT_STATUS.md).
    phoneNumber: z.string().trim().optional(),
    phoneOtpCode: z.string().trim().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const requestOtpSchema = z.object({
    phoneNumber: z.string().trim().min(1),
    purpose: z.enum(['signup', 'login']),
});

const phoneLoginSchema = z.object({
    phoneNumber: z.string().trim().min(1),
    code: z.string().trim().min(1),
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

router.post('/signup', async (req, res) => {
    try {
        const {
            email,
            password,
            role,
            displayName,
            phoneNumber: rawPhoneNumber,
            phoneOtpCode,
        } = signupSchema.parse(req.body);

        let phoneNumber: string | null = null;
        if (role === 'Passenger') {
            if (!rawPhoneNumber || !phoneOtpCode) {
                return res
                    .status(400)
                    .json({ error: '휴대전화 인증이 필요합니다' });
            }

            phoneNumber = normalizePhoneNumber(rawPhoneNumber);
            if (!phoneNumber) {
                return res
                    .status(400)
                    .json({ error: '올바른 휴대전화번호를 입력해주세요' });
            }

            const otpResult = await consumeOtp(
                phoneNumber,
                'signup',
                phoneOtpCode
            );
            if (!otpResult.ok) {
                return res
                    .status(400)
                    .json({ error: otpErrorMessage(otpResult.error) });
            }
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        if (phoneNumber) {
            const existingPhone = await prisma.user.findUnique({
                where: { phoneNumber },
            });
            if (existingPhone) {
                return res
                    .status(400)
                    .json({ error: '이미 가입에 사용된 휴대전화번호입니다' });
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: role as any,
                displayName,
                phoneNumber,
                phoneVerifiedAt: phoneNumber ? new Date() : null,
            },
            select: {
                id: true,
                email: true,
                role: true,
                displayName: true,
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
                .json({ error: '이미 사용 중인 이메일 또는 휴대전화번호입니다' });
        }
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/phone/request-otp', async (req, res) => {
    try {
        const { phoneNumber: rawPhoneNumber, purpose } =
            requestOtpSchema.parse(req.body);

        const phoneNumber = normalizePhoneNumber(rawPhoneNumber);
        if (!phoneNumber) {
            return res
                .status(400)
                .json({ error: '올바른 휴대전화번호를 입력해주세요' });
        }

        if (purpose === 'login') {
            const user = await prisma.user.findUnique({
                where: { phoneNumber },
            });
            if (!user || user.role === 'Admin') {
                return res
                    .status(404)
                    .json({ error: '가입되지 않은 휴대전화번호입니다' });
            }
            if (user.status === 'Blocked') {
                return res.status(403).json({ error: '차단된 계정입니다' });
            }
        } else {
            const existing = await prisma.user.findUnique({
                where: { phoneNumber },
            });
            if (existing) {
                return res
                    .status(400)
                    .json({ error: '이미 가입에 사용된 휴대전화번호입니다' });
            }
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

router.post('/phone/login', async (req, res) => {
    try {
        const { phoneNumber: rawPhoneNumber, code } = phoneLoginSchema.parse(
            req.body
        );

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

        const user = await prisma.user.findUnique({ where: { phoneNumber } });
        if (!user || user.role === 'Admin') {
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

router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status === 'Blocked') {
            return res.status(403).json({ error: 'Account is blocked' });
        }

        const isValidPassword = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isValidPassword) {
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
