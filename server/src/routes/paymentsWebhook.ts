import { Request, Response } from 'express';
import prisma from '../utils/db';
import { verifyNicepayWebhookSignature } from '../utils/nicepayWebhookVerify';
import { getClientIp } from '../utils/ipRateLimit';

/**
 * 나이스페이 웹훅 발신 IP(방화벽 정책 문서 명시값) — 운영에서만 강제한다.
 * 로컬/샌드박스 curl 시뮬레이션까지 막으면 검증이 불가능해지므로 NODE_ENV로 분기.
 */
const NICEPAY_WEBHOOK_IPS = new Set(['121.133.126.86', '121.133.126.87']);

/**
 * 안전망 채널 — 승인/빌키승인 API의 동기 응답이 authoritative하므로
 * 핵심 결제 처리 경로는 아니다. 여기선 결제취소 등 우리가 직접 트리거하지
 * 않은 상태 변경을 거래기록에 반영하는 역할만 한다.
 *
 * 나이스페이는 응답을 Content-Type: text/html에 "OK" 문자열로 받아야 성공으로
 * 처리한다(JSON 200 아님) — 안 하면 실패로 간주해 재전송한다.
 */
export async function handleNicepayWebhook(req: Request, res: Response) {
    if (process.env.NODE_ENV === 'production') {
        const clientIp = getClientIp(req);
        if (!NICEPAY_WEBHOOK_IPS.has(clientIp)) {
            console.error(`Nicepay webhook from unexpected IP: ${clientIp}`);
            return res.status(403).send('Forbidden');
        }
    }

    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody)) {
        return res.status(400).send('Invalid payload');
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
        return res.status(400).send('Invalid payload');
    }

    const { tid, amount, ediDate, signature, orderId, status } = payload ?? {};

    if (
        !verifyNicepayWebhookSignature(
            String(tid || ''),
            amount,
            String(ediDate || ''),
            String(signature || ''),
        )
    ) {
        console.error('Nicepay webhook signature verification failed');
        return res.status(400).send('Invalid signature');
    }

    try {
        if (orderId && (status === 'cancelled' || status === 'partialCancelled')) {
            await prisma.paymentTransaction.updateMany({
                where: { orderId },
                data: { status: 'cancelled' },
            });
        }
    } catch (error) {
        console.error('Nicepay webhook processing error:', error);
    }

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send('OK');
}
