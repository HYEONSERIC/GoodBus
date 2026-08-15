import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

let tossPaymentsPromise: ReturnType<typeof loadTossPayments> | null = null;

function getClientKey(): string {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
        throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.');
    }
    return clientKey;
}

/** customerKey별 결제 인스턴스 — 카드 등록(빌링)과 단건결제 모두 이걸로 시작 */
export async function getTossPaymentInstance(customerKey: string) {
    if (!tossPaymentsPromise) {
        tossPaymentsPromise = loadTossPayments(getClientKey());
    }
    const tossPayments = await tossPaymentsPromise;
    return tossPayments.payment({ customerKey });
}
