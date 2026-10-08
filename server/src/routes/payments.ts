import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    UserRole,
    PaymentTransactionKind,
    PaymentTransactionStatus,
} from '@prisma/client';
import { issueBillingKey, chargeBillingKey, deleteBillingKey } from '../utils/nicepay';
import { normalizePhoneNumber, issueOtp, consumeOtp } from '../utils/otp';
import { sendOtpSms } from '../utils/aligo';
import { createIpRateLimiter } from '../utils/ipRateLimit';
import {
    MEMBERSHIP_PRICES_WON,
    MIN_BID_ADDON_PRICE_WON,
} from '../utils/paymentPricing';
import { withPaymentLock } from '../utils/paymentLock';
import { sendAlimtalk, formatKstDateTime } from '../utils/alimtalk';

const router = express.Router();

// 카드 등록은 도난 카드번호를 대량으로 찔러보는 카딩(carding) 공격의 표적이 되기
// 쉬운 엔드포인트라 OTP 요청/카드 등록 각각에 별도 IP 레이트리밋을 둔다. 계정
// 단위 제한은 매 등록 시도마다 유효한 OTP 소비를 요구하는 것으로 대신한다(OTP
// 자체가 전화번호당 쿨다운/일일 한도를 이미 갖고 있음 — server/src/utils/otp.ts).
const cardOtpRateLimiter = createIpRateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    message: '잠시 후 다시 시도해주세요',
});

const cardRegisterRateLimiter = createIpRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: '너무 많은 카드 등록 시도가 있었습니다. 잠시 후 다시 시도해주세요',
});

/** Luhn 체크섬 — 나이스페이 API 호출 전에 형식이 명백히 잘못된 카드번호를 걸러낸다. */
function isValidLuhn(cardNo: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = cardNo.length - 1; i >= 0; i--) {
        let digit = Number(cardNo[i]);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
}

function addOneMonth(date: Date): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    return next;
}

/**
 * Query-string values are attacker-controlled. Prisma throws PrismaClientValidationError
 * for enum values outside the schema, which — with no try/catch on these routes and no
 * unhandledRejection handler — crashes the whole process (Express 4 doesn't auto-catch
 * async rejections). Always parse untrusted enum input through this instead of `as any`.
 */
function parseEnumQuery<T extends Record<string, string>>(
    enumObj: T,
    value: unknown,
): T[keyof T] | undefined {
    if (typeof value !== 'string') return undefined;
    return (Object.values(enumObj) as string[]).includes(value)
        ? (value as T[keyof T])
        : undefined;
}

router.get(
    '/billing-key',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const billingKey = await prisma.billingKey.findUnique({
                where: { userId: req.user!.userId },
                select: { cardBrand: true, cardLast4: true },
            });

            if (!billingKey) {
                return res.json({ registered: false });
            }

            res.json({
                registered: true,
                cardBrand: billingKey.cardBrand,
                cardLast4: billingKey.cardLast4,
            });
        } catch (error) {
            console.error('Get billing key error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.delete(
    '/billing-key',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const subscription = await prisma.membershipSubscription.findUnique({
                where: { userId: req.user!.userId },
            });
            if (subscription?.status === 'active') {
                return res.status(400).json({
                    error: '멤버십 구독을 먼저 해지해야 카드를 삭제할 수 있습니다',
                });
            }

            const billingKey = await prisma.billingKey.findUnique({
                where: { userId: req.user!.userId },
            });
            if (billingKey) {
                // 원격 빌키도 명시적으로 만료시킨다 — 베스트에포트: 실패해도
                // 로컬 삭제는 그대로 진행한다(사용자 입장에선 카드가 지워져야
                // 하고, 나이스페이 쪽 잔존 빌키는 재시도/수동 정리로 처리).
                const deleted = await deleteBillingKey(
                    billingKey.nicepayBillingKey,
                    crypto.randomUUID(),
                );
                if (!deleted.ok) {
                    console.error(
                        `Nicepay 빌키 삭제 실패 (userId=${req.user!.userId}): ${deleted.errorText}`,
                    );
                }
            }

            await prisma.billingKey.deleteMany({
                where: { userId: req.user!.userId },
            });

            if (billingKey) {
                const user = await prisma.user.findUnique({
                    where: { id: req.user!.userId },
                    select: { displayName: true, companyName: true, email: true, phoneNumber: true },
                });
                if (user) {
                    const minuteBucket = Math.floor(Date.now() / 60000);
                    void sendAlimtalk({
                        templateKey: 'CARD_CHANGED',
                        receiverUserId: req.user!.userId,
                        receiverPhone: user.phoneNumber,
                        dedupeKey: `CARD_CHANGED:${req.user!.userId}:delete:${minuteBucket}`,
                        variables: {
                            기사명: user.displayName || user.companyName || user.email || '기사',
                            변경유형: '삭제',
                            카드사: billingKey.cardBrand || '정보 없음',
                            카드번호뒤4자리: billingKey.cardLast4 || '****',
                            처리일시: formatKstDateTime(new Date()),
                        },
                    });
                }
            }

            res.json({ deleted: true });
        } catch (error) {
            console.error('Delete billing key error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

const billingKeyOtpRequestSchema = z.object({});

router.post(
    '/billing-key/otp/request',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    cardOtpRateLimiter,
    async (req, res) => {
        try {
            billingKeyOtpRequestSchema.parse(req.body ?? {});
            const user = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: { phoneNumber: true },
            });
            const phoneNumber = user?.phoneNumber
                ? normalizePhoneNumber(user.phoneNumber)
                : null;
            if (!phoneNumber) {
                return res
                    .status(400)
                    .json({ error: '인증된 휴대전화번호가 없습니다' });
            }

            const issued = await issueOtp(
                phoneNumber,
                'card_registration',
                'business',
            );
            if (!issued.ok) {
                if (issued.error === 'rate_limited') {
                    const minutes = Math.ceil(issued.retryAfterSeconds / 60);
                    return res.status(429).json({
                        error: `요청이 너무 많습니다. ${minutes}분 후 다시 시도해주세요`,
                    });
                }
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

            res.json({ message: '인증번호가 발송되었습니다', devMode: sms.devMode });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            console.error('Billing key OTP request error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

// idNo는 개인(기사)=생년월일 6자리, 법인(운수업체)=사업자등록번호 10자리 —
// 아래 라우트에서 req.user.role로 분기해 길이를 검사한다.
const billingKeyRegisterSchema = z.object({
    cardNo: z.string().regex(/^[0-9]{15,16}$/, '카드번호가 올바르지 않습니다'),
    expYear: z.string().regex(/^[0-9]{2}$/, '유효기간(년)이 올바르지 않습니다'),
    expMonth: z
        .string()
        .regex(/^(0[1-9]|1[0-2])$/, '유효기간(월)이 올바르지 않습니다'),
    idNo: z.string().regex(/^[0-9]{6}$|^[0-9]{10}$/, '생년월일/사업자번호가 올바르지 않습니다'),
    cardPw: z.string().regex(/^[0-9]{2}$/, '카드 비밀번호가 올바르지 않습니다'),
    otpCode: z.string().trim().min(1),
});

router.post(
    '/billing-key/register',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    cardRegisterRateLimiter,
    async (req, res) => {
        // 카드번호/비밀번호는 절대 로그·에러메시지에 원본으로 남기지 않는다 —
        // 아래 어떤 catch/console.error도 req.body를 통째로 찍지 않도록 주의.
        try {
            const body = billingKeyRegisterSchema.parse(req.body);

            const expectedIdNoLength = req.user!.role === 'Driver' ? 6 : 10;
            if (body.idNo.length !== expectedIdNoLength) {
                return res.status(400).json({
                    error:
                        req.user!.role === 'Driver'
                            ? '생년월일 6자리를 입력해주세요'
                            : '사업자등록번호 10자리를 입력해주세요',
                });
            }
            if (!isValidLuhn(body.cardNo)) {
                return res.status(400).json({ error: '카드번호가 올바르지 않습니다' });
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: { phoneNumber: true, displayName: true, companyName: true, email: true },
            });
            const phoneNumber = user?.phoneNumber
                ? normalizePhoneNumber(user.phoneNumber)
                : null;
            if (!phoneNumber) {
                return res
                    .status(400)
                    .json({ error: '인증된 휴대전화번호가 없습니다' });
            }

            const otpResult = await consumeOtp(
                phoneNumber,
                'card_registration',
                body.otpCode,
                'business',
            );
            if (!otpResult.ok) {
                const message =
                    otpResult.error === 'invalid_code'
                        ? '인증번호가 올바르지 않습니다'
                        : otpResult.error === 'expired'
                          ? '인증번호가 만료되었습니다. 다시 요청해주세요'
                          : otpResult.error === 'too_many_attempts'
                            ? '인증 시도 횟수를 초과했습니다. 다시 요청해주세요'
                            : '인증번호를 먼저 요청해주세요';
                return res.status(400).json({ error: message });
            }

            const result = await issueBillingKey({
                cardNo: body.cardNo,
                expYear: body.expYear,
                expMonth: body.expMonth,
                idNo: body.idNo,
                cardPw: body.cardPw,
                orderId: crypto.randomUUID(),
                buyerTel: phoneNumber,
            });
            if (!result.ok) {
                return res.status(400).json({ error: result.errorText });
            }

            const existingBillingKey = await prisma.billingKey.findUnique({
                where: { userId: req.user!.userId },
            });

            await prisma.billingKey.upsert({
                where: { userId: req.user!.userId },
                create: {
                    userId: req.user!.userId,
                    nicepayBillingKey: result.data.bid,
                    cardBrand: result.data.cardName,
                    cardLast4: body.cardNo.slice(-4),
                },
                update: {
                    nicepayBillingKey: result.data.bid,
                    cardBrand: result.data.cardName,
                    cardLast4: body.cardNo.slice(-4),
                },
            });

            const minuteBucket = Math.floor(Date.now() / 60000);
            void sendAlimtalk({
                templateKey: 'CARD_CHANGED',
                receiverUserId: req.user!.userId,
                receiverPhone: phoneNumber,
                dedupeKey: `CARD_CHANGED:${req.user!.userId}:${existingBillingKey ? 'update' : 'register'}:${minuteBucket}`,
                variables: {
                    기사명: user?.displayName || user?.companyName || user?.email || '기사',
                    변경유형: existingBillingKey ? '변경' : '등록',
                    카드사: result.data.cardName,
                    카드번호뒤4자리: body.cardNo.slice(-4),
                    처리일시: formatKstDateTime(new Date()),
                },
            });

            res.json({ registered: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            console.error('Billing key register error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

const subscribeSchema = z.object({
    plan: z.enum(['Plus', 'Premium', 'Business']),
    acknowledgedPlanChange: z.boolean().optional().default(false),
});

router.post(
    '/subscribe',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const { plan, acknowledgedPlanChange } = subscribeSchema.parse(
                req.body,
            );

            const result = await withPaymentLock(
                req.user!.userId,
                'membership_subscribe',
                async (tx) => {
                    const billingKey = await tx.billingKey.findUnique({
                        where: { userId: req.user!.userId },
                    });
                    if (!billingKey) {
                        return {
                            ok: false as const,
                            status: 400,
                            body: { error: '등록된 결제 카드가 없습니다' },
                        };
                    }

                    const existingSubscription =
                        await tx.membershipSubscription.findUnique({
                            where: { userId: req.user!.userId },
                        });
                    const isPlanChange =
                        existingSubscription?.status === 'active' &&
                        existingSubscription.plan !== plan;
                    const isDowngrade =
                        isPlanChange &&
                        MEMBERSHIP_PRICES_WON[plan] <
                            MEMBERSHIP_PRICES_WON[existingSubscription!.plan];

                    // 이미 이 플랜으로 활성 구독 중이면 재과금하지 않는다 — 락은
                    // 동시 요청의 레이스만 막을 뿐, 직렬화된 두 요청이 순서대로
                    // 각각 정상 응답을 받으며 카드에 두 번 청구되는 것까지는
                    // 막지 못한다.
                    if (existingSubscription?.status === 'active' && !isPlanChange) {
                        return { ok: true as const, subscription: existingSubscription };
                    }

                    if (isPlanChange && !acknowledgedPlanChange) {
                        return {
                            ok: false as const,
                            status: 400,
                            body: {
                                error: '플랜 변경 안내를 확인해주세요',
                                requiresAcknowledgement: true,
                            },
                        };
                    }

                    // 다운그레이드는 지금 결제하지 않고, 현재 결제 주기가 끝나는
                    // nextBillingAt에 정기결제 크론이 새 플랜으로 전환+과금한다.
                    if (isDowngrade) {
                        const updated = await tx.membershipSubscription.update({
                            where: { userId: req.user!.userId },
                            data: { pendingPlan: plan },
                        });
                        return { ok: true as const, subscription: updated };
                    }

                    const metadata = isPlanChange
                        ? {
                              changeType: 'plan_change',
                              previousPlan: existingSubscription!.plan,
                              acknowledgedPlanChange: true,
                          }
                        : undefined;

                    const amount = MEMBERSHIP_PRICES_WON[plan];
                    const orderId = crypto.randomUUID();
                    const result = await chargeBillingKey(
                        billingKey.nicepayBillingKey,
                        amount,
                        orderId,
                        `GoodBus 멤버십 ${plan}`,
                    );

                    if (!result.ok) {
                        await tx.paymentTransaction.create({
                            data: {
                                userId: req.user!.userId,
                                kind: 'membership_subscription',
                                status: 'failed',
                                amount,
                                orderId,
                                failReason: result.errorText,
                                metadata,
                            },
                        });
                        return {
                            ok: false as const,
                            status: 400,
                            body: { error: result.errorText },
                        };
                    }

                    await tx.paymentTransaction.create({
                        data: {
                            userId: req.user!.userId,
                            kind: 'membership_subscription',
                            status: 'succeeded',
                            amount,
                            orderId,
                            tid: result.data.tid,
                            metadata,
                        },
                    });
                    await tx.user.update({
                        where: { id: req.user!.userId },
                        data: { membershipPlan: plan },
                    });

                    // 비즈니스는 최저입찰가 열람이 이미 포함돼 있으므로, 업그레이드
                    // 시점에 이미 있던 독립 애드온 구독은 자동 해지한다(안 하면
                    // 같은 혜택을 계속 이중 결제하게 됨). 이번 달 이미 낸 애드온
                    // 요금은 환불하지 않고 다음 결제부터 멈춘다 — 기존 멤버십
                    // 해지(취소) 정책과 동일한 "잔여기간 유지, 재청구만 중단" 방식.
                    if (plan === 'Business') {
                        const activeAddon =
                            await tx.minBidAddonSubscription.findUnique({
                                where: { userId: req.user!.userId },
                            });
                        if (activeAddon?.status === 'active') {
                            await tx.minBidAddonSubscription.update({
                                where: { userId: req.user!.userId },
                                data: {
                                    status: 'cancelled',
                                    cancelledAt: new Date(),
                                },
                            });
                        }
                    }

                    const updatedSubscription =
                        await tx.membershipSubscription.upsert({
                            where: { userId: req.user!.userId },
                            create: {
                                userId: req.user!.userId,
                                plan,
                                status: 'active',
                                nextBillingAt: addOneMonth(new Date()),
                            },
                            update: {
                                plan,
                                pendingPlan: null,
                                status: 'active',
                                nextBillingAt: addOneMonth(new Date()),
                                cancelledAt: null,
                            },
                        });

                    return {
                        ok: true as const,
                        subscription: updatedSubscription,
                        charged: { plan, amount, orderId },
                    };
                },
            );

            if (!result.ok) {
                return res.status(result.status).json(result.body);
            }

            if (result.charged) {
                const user = await prisma.user.findUnique({
                    where: { id: req.user!.userId },
                    select: { displayName: true, companyName: true, email: true, phoneNumber: true },
                });
                if (user) {
                    void sendAlimtalk({
                        templateKey: 'MEMBERSHIP_PAYMENT_COMPLETED',
                        receiverUserId: req.user!.userId,
                        receiverPhone: user.phoneNumber,
                        dedupeKey: `MEMBERSHIP_PAYMENT_COMPLETED:${result.charged.orderId}`,
                        variables: {
                            기사명: user.displayName || user.companyName || user.email || '기사',
                            결제항목: `멤버십(${result.charged.plan})`,
                            결제금액: `${result.charged.amount.toLocaleString('ko-KR')}원`,
                            결제일시: formatKstDateTime(new Date()),
                            다음결제일: formatKstDateTime(
                                result.subscription.nextBillingAt,
                            ).split(' ')[0],
                        },
                    });
                }
            }

            res.json({ subscription: result.subscription });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            console.error('Subscribe error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.post(
    '/subscribe/cancel',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const subscription = await prisma.membershipSubscription.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!subscription || subscription.status !== 'active') {
                return res.status(404).json({ error: 'Active subscription not found' });
            }

            const updated = await prisma.membershipSubscription.update({
                where: { userId: req.user!.userId },
                data: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    pendingPlan: null,
                },
            });

            res.json({ subscription: updated });
        } catch (error) {
            console.error('Subscribe cancel error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.post(
    '/subscribe/downgrade/cancel',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const subscription = await prisma.membershipSubscription.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!subscription?.pendingPlan) {
                return res
                    .status(404)
                    .json({ error: 'Pending downgrade not found' });
            }

            const updated = await prisma.membershipSubscription.update({
                where: { userId: req.user!.userId },
                data: { pendingPlan: null },
            });

            res.json({ subscription: updated });
        } catch (error) {
            console.error('Subscribe downgrade cancel error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.get(
    '/subscribe/status',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const subscription = await prisma.membershipSubscription.findUnique({
                where: { userId: req.user!.userId },
            });
            res.json({ subscription });
        } catch (error) {
            console.error('Subscribe status error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.post(
    '/subscribe/reactivate',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const subscription = await prisma.membershipSubscription.findUnique({
                where: { userId: req.user!.userId },
            });
            if (
                !subscription ||
                subscription.status !== 'cancelled' ||
                subscription.nextBillingAt <= new Date()
            ) {
                return res.status(400).json({
                    error: '재구독 가능한 기간이 지났습니다. 새로 구독해주세요.',
                });
            }

            const [, updated] = await prisma.$transaction([
                prisma.user.update({
                    where: { id: req.user!.userId },
                    data: { membershipPlan: subscription.plan },
                }),
                prisma.membershipSubscription.update({
                    where: { userId: req.user!.userId },
                    data: { status: 'active', cancelledAt: null },
                }),
            ]);

            res.json({ subscription: updated });
        } catch (error) {
            console.error('Subscribe reactivate error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.post(
    '/addon/min-bid/subscribe',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const outcome = await withPaymentLock(
            req.user!.userId,
            'min_bid_addon_subscribe',
            async (tx) => {
                // 비즈니스 등급은 최저입찰가 열람이 이미 무료 포함이라 이 애드온을
                // 또 살 필요가 없다 — 프론트도 구매 버튼을 숨기지만, 우회 호출
                // 대비 서버에서도 방어한다.
                const subscriber = await tx.user.findUnique({
                    where: { id: req.user!.userId },
                    select: { membershipPlan: true },
                });
                if (subscriber?.membershipPlan === 'Business') {
                    return {
                        ok: false as const,
                        status: 400,
                        body: {
                            error: '비즈니스 멤버십에 이미 포함된 혜택입니다',
                        },
                    };
                }

                // 이미 활성 구독이면 재과금하지 않는다 — 락은 동시 요청의 레이스만
                // 막을 뿐, 이 체크가 없으면 직렬화된 두 요청이 순서대로 각각
                // 정상 응답을 받으며 카드에 두 번 청구되는 것까지는 막지 못한다.
                const existingAddon = await tx.minBidAddonSubscription.findUnique({
                    where: { userId: req.user!.userId },
                });
                if (existingAddon?.status === 'active') {
                    return { ok: true as const, subscription: existingAddon };
                }

                const billingKey = await tx.billingKey.findUnique({
                    where: { userId: req.user!.userId },
                });
                if (!billingKey) {
                    return {
                        ok: false as const,
                        status: 400,
                        body: { error: '등록된 결제 카드가 없습니다' },
                    };
                }

                const amount = MIN_BID_ADDON_PRICE_WON;
                const orderId = crypto.randomUUID();
                const result = await chargeBillingKey(
                    billingKey.nicepayBillingKey,
                    amount,
                    orderId,
                    'GoodBus 차량별 최저입찰금액 확인',
                );

                if (!result.ok) {
                    await tx.paymentTransaction.create({
                        data: {
                            userId: req.user!.userId,
                            kind: 'min_bid_addon',
                            status: 'failed',
                            amount,
                            orderId,
                            failReason: result.errorText,
                        },
                    });
                    return {
                        ok: false as const,
                        status: 400,
                        body: { error: result.errorText },
                    };
                }

                await tx.paymentTransaction.create({
                    data: {
                        userId: req.user!.userId,
                        kind: 'min_bid_addon',
                        status: 'succeeded',
                        amount,
                        orderId,
                        tid: result.data.tid,
                    },
                });
                await tx.user.update({
                    where: { id: req.user!.userId },
                    data: { minBidAddonPurchased: true },
                });
                const subscription = await tx.minBidAddonSubscription.upsert({
                    where: { userId: req.user!.userId },
                    create: {
                        userId: req.user!.userId,
                        status: 'active',
                        nextBillingAt: addOneMonth(new Date()),
                    },
                    update: {
                        status: 'active',
                        nextBillingAt: addOneMonth(new Date()),
                        cancelledAt: null,
                    },
                });

                return { ok: true as const, subscription };
            },
        );

        if (!outcome.ok) {
            return res.status(outcome.status).json(outcome.body);
        }
        res.json({ subscription: outcome.subscription });
    },
);

router.post(
    '/addon/min-bid/cancel',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const subscription = await prisma.minBidAddonSubscription.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!subscription || subscription.status !== 'active') {
                return res
                    .status(404)
                    .json({ error: 'Active subscription not found' });
            }

            const updated = await prisma.minBidAddonSubscription.update({
                where: { userId: req.user!.userId },
                data: { status: 'cancelled', cancelledAt: new Date() },
            });

            res.json({ subscription: updated });
        } catch (error) {
            console.error('Addon min-bid cancel error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.get(
    '/addon/min-bid/status',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const subscription = await prisma.minBidAddonSubscription.findUnique({
                where: { userId: req.user!.userId },
            });
            res.json({ subscription });
        } catch (error) {
            console.error('Addon min-bid status error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.post(
    '/addon/min-bid/reactivate',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        try {
            const subscription = await prisma.minBidAddonSubscription.findUnique({
                where: { userId: req.user!.userId },
            });
            if (
                !subscription ||
                subscription.status !== 'cancelled' ||
                subscription.nextBillingAt <= new Date()
            ) {
                return res.status(400).json({
                    error: '재구독 가능한 기간이 지났습니다. 새로 구독해주세요.',
                });
            }

            const [, updated] = await prisma.$transaction([
                prisma.user.update({
                    where: { id: req.user!.userId },
                    data: { minBidAddonPurchased: true },
                }),
                prisma.minBidAddonSubscription.update({
                    where: { userId: req.user!.userId },
                    data: { status: 'active', cancelledAt: null },
                }),
            ]);

            res.json({ subscription: updated });
        } catch (error) {
            console.error('Addon min-bid reactivate error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
);

router.get('/transactions', requireAuth, async (req, res) => {
    try {
        const kind = parseEnumQuery(PaymentTransactionKind, req.query.kind);
        const status = parseEnumQuery(PaymentTransactionStatus, req.query.status);
        const takeRaw = Number(req.query.take);
        const take =
            Number.isFinite(takeRaw) && takeRaw > 0
                ? Math.min(Math.floor(takeRaw), 200)
                : 50;

        const transactions = await prisma.paymentTransaction.findMany({
            where: { userId: req.user!.userId, kind, status },
            orderBy: { createdAt: 'desc' },
            take,
            select: {
                id: true,
                kind: true,
                status: true,
                amount: true,
                tripId: true,
                bidId: true,
                failReason: true,
                createdAt: true,
            },
        });

        res.json({ transactions });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
