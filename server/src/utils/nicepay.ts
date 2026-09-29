import crypto from 'crypto';

const NICEPAY_API_BASE =
    process.env.NICEPAY_ENV === 'production'
        ? 'https://api.nicepay.co.kr'
        : 'https://sandbox-api.nicepay.co.kr';

type NicepayResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; errorText: string; isTimeout?: boolean };

function getAuthHeader(): string {
    const clientKey = process.env.NICEPAY_CLIENT_KEY;
    const secretKey = process.env.NICEPAY_SECRET_KEY;
    if (!clientKey || !secretKey) {
        throw new Error(
            'NICEPAY_CLIENT_KEY/NICEPAY_SECRET_KEY environment variables are required',
        );
    }
    return `Basic ${Buffer.from(`${clientKey}:${secretKey}`).toString('base64')}`;
}

function getSecretKey(): string {
    const secretKey = process.env.NICEPAY_SECRET_KEY;
    if (!secretKey) {
        throw new Error('NICEPAY_SECRET_KEY environment variable is required');
    }
    return secretKey;
}

/** 매뉴얼 명세: hex(sha256(fields.join('') + SecretKey)) */
function signData(...fields: string[]): string {
    return crypto
        .createHash('sha256')
        .update(fields.join('') + getSecretKey())
        .digest('hex');
}

/**
 * encMode=A2(AES-256/CBC/PKCS5padding). 키는 SecretKey(32byte) 그대로, IV는
 * SecretKey 앞 16자 — 나이스페이 매뉴얼(api/payment-subscribe.md) 명세대로.
 * Node의 'aes-256-cbc' 기본 패딩(PKCS7)은 16byte 블록에서 PKCS5와 동일하다.
 */
export function encryptCardData(fields: {
    cardNo: string;
    expYear: string;
    expMonth: string;
    idNo: string;
    cardPw: string;
}): string {
    const secretKey = getSecretKey();
    const plaintext = `cardNo=${fields.cardNo}&expYear=${fields.expYear}&expMonth=${fields.expMonth}&idNo=${fields.idNo}&cardPw=${fields.cardPw}`;
    const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(secretKey, 'utf8'),
        Buffer.from(secretKey.slice(0, 16), 'utf8'),
    );
    return Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]).toString(
        'hex',
    );
}

const CONNECT_TIMEOUT_MS = 5000;
const READ_TIMEOUT_MS = 30000;

async function nicepayPost<T>(
    path: string,
    body: Record<string, unknown>,
): Promise<NicepayResult<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    try {
        const response = await fetch(`${NICEPAY_API_BASE}${path}`, {
            method: 'POST',
            headers: {
                Authorization: getAuthHeader(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorBody: any = await response.json().catch(() => null);
            return {
                ok: false,
                status: response.status,
                errorText:
                    errorBody?.resultMsg ||
                    errorBody?.message ||
                    `NICEPAY API error (${response.status})`,
            };
        }

        const data = (await response.json()) as any;
        if (data?.resultCode && data.resultCode !== '0000') {
            return {
                ok: false,
                status: 400,
                errorText: data.resultMsg || `NICEPAY error (${data.resultCode})`,
            };
        }

        return { ok: true, data: data as T };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            // Read-timeout — 나이스페이 문서가 명시하는 "망취소 필요" 상황.
            // 호출부(payments.ts/trips.ts)가 isTimeout을 보고 cancelPayment/
            // deleteBillingKey로 미확정 거래를 정리해야 한다.
            return {
                ok: false,
                status: 0,
                errorText: '결제 응답 시간이 초과되었습니다',
                isTimeout: true,
            };
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export type NicepayBillingKeyResult = {
    resultCode: string;
    resultMsg: string;
    bid: string;
    tid: string;
    authDate: string;
    cardCode: string;
    cardName: string;
};

/** 카드정보(cardNo/expYear/expMonth/idNo/cardPw)를 암호화해 빌키(BID) 발급 */
export function issueBillingKey(params: {
    cardNo: string;
    expYear: string;
    expMonth: string;
    idNo: string;
    cardPw: string;
    orderId: string;
    buyerName?: string;
    buyerTel?: string;
    buyerEmail?: string;
}) {
    const ediDate = new Date().toISOString();
    const encData = encryptCardData(params);
    return nicepayPost<NicepayBillingKeyResult>('/v1/subscribe/regist', {
        encData,
        orderId: params.orderId,
        encMode: 'A2',
        ediDate,
        signData: signData(params.orderId, ediDate),
        buyerName: params.buyerName,
        buyerTel: params.buyerTel,
        buyerEmail: params.buyerEmail,
    });
}

export type NicepayChargeResult = {
    resultCode: string;
    resultMsg: string;
    tid: string;
    orderId: string;
    status: string;
    amount: number;
};

function chargeBillingKeyRaw(
    bid: string,
    amount: number,
    orderId: string,
    goodsName: string,
) {
    const ediDate = new Date().toISOString();
    return nicepayPost<NicepayChargeResult>(`/v1/subscribe/${bid}/payments`, {
        orderId,
        amount,
        goodsName,
        cardQuota: '00',
        useShopInterest: false,
        ediDate,
        signData: signData(orderId, bid, ediDate),
    });
}

async function nicepayGet<T>(path: string): Promise<NicepayResult<T>> {
    const response = await fetch(`${NICEPAY_API_BASE}${path}`, {
        headers: { Authorization: getAuthHeader() },
    });
    if (!response.ok) {
        const errorBody: any = await response.json().catch(() => null);
        return {
            ok: false,
            status: response.status,
            errorText:
                errorBody?.resultMsg || `NICEPAY API error (${response.status})`,
        };
    }
    const data = (await response.json()) as any;
    if (data?.resultCode && data.resultCode !== '0000') {
        return {
            ok: false,
            status: 400,
            errorText: data.resultMsg || `NICEPAY error (${data.resultCode})`,
        };
    }
    return { ok: true, data: data as T };
}

/** orderId로 거래 조회 — 망취소 시 실제 승인 여부/tid 확인용 */
function findTransactionByOrderId(orderId: string) {
    return nicepayGet<NicepayChargeResult>(`/v1/payments/find/${orderId}`);
}

/**
 * 발급된 빌키(bid)로 정기/즉시 과금 실행 — Toss와 달리 customerKey 불필요.
 * Read-timeout(망취소 대상)이 발생하면 나이스페이 문서 권고대로 orderId로 실제
 * 승인 여부를 조회해, 승인이 실제로는 성공했다면 취소(cancelPayment)까지 자동
 * 처리한 뒤 실패로 반환한다 — 호출부가 타임아웃을 몰라도 되게 감싸는 안전 래퍼.
 */
export async function chargeBillingKey(
    bid: string,
    amount: number,
    orderId: string,
    goodsName: string,
): Promise<NicepayResult<NicepayChargeResult>> {
    const result = await chargeBillingKeyRaw(bid, amount, orderId, goodsName);
    if (result.ok || !result.isTimeout) {
        return result;
    }

    const lookup = await findTransactionByOrderId(orderId);
    if (lookup.ok && lookup.data.status === 'paid') {
        const cancelled = await cancelPayment(
            lookup.data.tid,
            '망취소(응답 시간초과 후 승인 확인됨)',
            orderId,
        );
        if (!cancelled.ok) {
            console.error(
                `[net-cancel] orderId=${orderId} tid=${lookup.data.tid} 취소 실패: ${cancelled.errorText}`,
            );
        }
    }
    return result;
}

/** 결제 전액/부분 취소(환불) */
export function cancelPayment(tid: string, reason: string, orderId: string) {
    const ediDate = new Date().toISOString();
    return nicepayPost<NicepayChargeResult>(`/v1/payments/${tid}/cancel`, {
        reason,
        orderId,
        ediDate,
        signData: signData(tid, ediDate),
    });
}

export type NicepayExpireResult = {
    resultCode: string;
    resultMsg: string;
    tid: string;
    orderId: string;
    bid: string;
    authDate: string;
};

/** 빌키 삭제(만료) — 카드 삭제 시 로컬 DB row 삭제 전에 호출해 원격 빌키도 정리 */
export function deleteBillingKey(bid: string, orderId: string) {
    const ediDate = new Date().toISOString();
    return nicepayPost<NicepayExpireResult>(`/v1/subscribe/${bid}/expire`, {
        orderId,
        ediDate,
        signData: signData(orderId, bid, ediDate),
    });
}
