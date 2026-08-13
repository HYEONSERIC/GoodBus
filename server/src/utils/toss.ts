const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

type TossResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; errorText: string };

function getAuthHeader(): string {
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
        throw new Error('TOSS_SECRET_KEY environment variable is required');
    }
    return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

async function tossPost<T>(path: string, body: Record<string, unknown>): Promise<TossResult<T>> {
    const response = await fetch(`${TOSS_API_BASE}${path}`, {
        method: 'POST',
        headers: {
            Authorization: getAuthHeader(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody: any = await response.json().catch(() => null);
        return {
            ok: false,
            status: response.status,
            errorText:
                errorBody?.message || `Toss API error (${response.status})`,
        };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
}

export type TossBillingKeyResult = {
    billingKey: string;
    card?: { company?: string; number?: string };
};

/** authKey/customerKey(위젯 리다이렉트로 받은 값)로 빌링키 발급 */
export function issueBillingKey(authKey: string, customerKey: string) {
    return tossPost<TossBillingKeyResult>('/billing/authorizations/issue', {
        authKey,
        customerKey,
    });
}

export type TossPaymentResult = {
    paymentKey: string;
    orderId: string;
    status: string;
    totalAmount: number;
};

/** 저장된 빌링키로 정기/즉시 과금 실행 */
export function chargeBillingKey(
    billingKey: string,
    customerKey: string,
    amount: number,
    orderId: string,
    orderName: string,
) {
    return tossPost<TossPaymentResult>(`/billing/${billingKey}`, {
        customerKey,
        amount,
        orderId,
        orderName,
    });
}

