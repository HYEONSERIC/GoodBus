import { Prisma } from '@prisma/client';
import prisma from './db';
import {
    isAligoDevMode,
    isAligoSendDisabled,
    postAlimtalk,
    AlimtalkPayload,
} from './aligo';
import { normalizePhoneNumber } from './otp';
import {
    AlimtalkRenderError,
    AlimtalkTemplateKey,
    getAlimtalkTemplate,
    isAlimtalkTemplateEnabled,
    renderAlimtalkText,
} from './alimtalkTemplates';

export type SendAlimtalkParams = {
    templateKey: AlimtalkTemplateKey;
    receiverUserId: string | null;
    receiverPhone: string | null | undefined;
    variables: Record<string, string>;
    dedupeKey: string;
    retryDelaysMs?: number[];
};

export type SendAlimtalkOutcome = 'sent' | 'skipped' | 'duplicate' | 'failed';

const DEFAULT_RETRY_DELAYS_MS = [500, 2000];

export function formatKstDateTime(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

function maskPhone(phone: string): string {
    return phone.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function claimLogRow(
    params: SendAlimtalkParams,
    maskedPhone: string | null,
): Promise<boolean> {
    try {
        await prisma.alimtalkLog.create({
            data: {
                templateKey: params.templateKey,
                receiverUserId: params.receiverUserId,
                maskedPhone,
                dedupeKey: params.dedupeKey,
                status: 'pending',
            },
        });
        return true;
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return false;
        }
        throw error;
    }
}

async function finishLogRow(
    dedupeKey: string,
    status: 'sent' | 'failed' | 'dev',
    errorCode: string | null,
): Promise<void> {
    await prisma.alimtalkLog.update({
        where: { dedupeKey },
        data: { status, errorCode },
    });
}

// 호출부는 DB 트랜잭션이 커밋된 뒤에 부른다. 이 함수는 예외를 던지지 않는다 —
// 알림 실패가 낙찰·취소·결제 응답을 바꾸면 안 되기 때문.
export async function sendAlimtalk(
    params: SendAlimtalkParams,
): Promise<SendAlimtalkOutcome> {
    let claimedKey: string | null = null;
    try {
        if (!isAlimtalkTemplateEnabled(params.templateKey)) {
            return 'skipped';
        }

        const phone = normalizePhoneNumber(params.receiverPhone ?? '');
        if (!phone) {
            console.warn(
                `[Alimtalk] ${params.templateKey} skipped: no valid phone for user ${params.receiverUserId}`,
            );
            return 'skipped';
        }

        const template = getAlimtalkTemplate(params.templateKey);
        const message = renderAlimtalkText(template.body, params.variables);
        const fallbackText = renderAlimtalkText(
            template.fallbackText,
            params.variables,
        );

        const claimed = await claimLogRow(params, maskPhone(phone));
        if (!claimed) {
            return 'duplicate';
        }
        claimedKey = params.dedupeKey;

        if (isAligoDevMode() || isAligoSendDisabled()) {
            console.log(
                `[Alimtalk:DEV] ${params.templateKey} -> ${maskPhone(phone)}\n${message}`,
            );
            await finishLogRow(params.dedupeKey, 'dev', null);
            return 'skipped';
        }

        const senderKey = process.env.ALIGO_KAKAO_SENDERKEY;
        if (!senderKey) {
            await finishLogRow(params.dedupeKey, 'failed', 'missing_sender_key');
            console.error('[Alimtalk] ALIGO_KAKAO_SENDERKEY is not set');
            return 'failed';
        }

        const payload: AlimtalkPayload = {
            apiKey: process.env.ALIGO_API_KEY!,
            userId: process.env.ALIGO_USER_ID!,
            sender: process.env.ALIGO_SENDER!,
            senderKey,
            tplCode: template.tplCode,
            receiver: phone,
            message,
            fallbackSubject: template.fallbackSubject,
            fallbackText,
            buttonJson: template.button
                ? JSON.stringify({
                      button: [
                          {
                              name: template.button.name,
                              linkType: 'WL',
                              linkTypeName: '웹링크',
                              linkMo: template.button.linkMo,
                              linkPc: template.button.linkPc,
                          },
                      ],
                  })
                : undefined,
        };

        const delays = params.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
        let lastError = 'unknown';
        for (let attempt = 0; attempt <= delays.length; attempt++) {
            if (attempt > 0) {
                await sleep(delays[attempt - 1]);
            }
            const result = await postAlimtalk(payload);
            if (result.ok) {
                await finishLogRow(params.dedupeKey, 'sent', null);
                return 'sent';
            }
            lastError = result.error;
            if (!result.retryable) {
                break;
            }
        }

        await finishLogRow(params.dedupeKey, 'failed', lastError);
        console.error(
            `[Alimtalk] ${params.templateKey} failed (${lastError}) dedupeKey=${params.dedupeKey}`,
        );
        return 'failed';
    } catch (error) {
        if (error instanceof AlimtalkRenderError) {
            console.error(
                `[Alimtalk] ${params.templateKey} render failed: ${error.message}`,
            );
            return 'failed';
        }
        console.error(`[Alimtalk] ${params.templateKey} unexpected error:`, error);
        if (claimedKey) {
            await finishLogRow(claimedKey, 'failed', 'unexpected').catch(() => {});
        }
        return 'failed';
    }
}
