import { Request, Response } from 'express';
import prisma from '../utils/db';
import { verifyTossWebhookSignature } from '../utils/tossWebhookVerify';

/**
 * 안전망 채널 — confirm/billing 승인 API의 동기 응답이 authoritative하므로
 * 핵심 결제 처리 경로는 아니다. 여기선 결제취소 등 우리가 직접 트리거하지
 * 않은 상태 변경을 거래기록에 반영하는 역할만 한다.
 *
 * 헤더 이름(tosspayments-webhook-signature)은 구현·테스트 시
 * docs.tosspayments.com/reference/using-api/webhook-events 에서 재확인할 것.
 */
export async function handleTossWebhook(req: Request, res: Response) {
    const rawBody = req.body as Buffer;
    const transmissionTime = String(
        req.header('tosspayments-webhook-transmission-time') || '',
    );
    const signature = String(
        req.header('tosspayments-webhook-signature') || '',
    );

    if (
        !Buffer.isBuffer(rawBody) ||
        !verifyTossWebhookSignature(rawBody, transmissionTime, signature)
    ) {
        console.error('Toss webhook signature verification failed');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
        const orderId = payload?.data?.orderId;
        const status = payload?.data?.status;
        if (
            orderId &&
            (status === 'CANCELED' || status === 'PARTIAL_CANCELED')
        ) {
            await prisma.paymentTransaction.updateMany({
                where: { tossOrderId: orderId },
                data: { status: 'cancelled' },
            });
        }
    } catch (error) {
        console.error('Toss webhook processing error:', error);
    }

    res.status(200).json({ received: true });
}
