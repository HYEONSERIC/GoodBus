import crypto from 'crypto';

/**
 * 나이스페이 웹훅 서명 검증.
 * 생성규칙(api/hook.md): hex(sha256(tid + amount + ediDate + SecretKey)) — 토스와
 * 달리 HMAC이 아니라 평문 해시 비교. 실제 필드명/헤더는 구현·테스트 시
 * developers.nicepay.co.kr 웹훅 문서에서 재확인할 것.
 */
export function verifyNicepayWebhookSignature(
    tid: string,
    amount: string | number,
    ediDate: string,
    signature: string,
): boolean {
    const secret = process.env.NICEPAY_SECRET_KEY;
    if (!secret) return false;
    if (!tid || !ediDate || !signature) return false;

    const expected = crypto
        .createHash('sha256')
        .update(`${tid}${amount}${ediDate}${secret}`)
        .digest('hex');

    try {
        const expectedBuf = Buffer.from(expected, 'hex');
        const actualBuf = Buffer.from(signature, 'hex');
        return (
            expectedBuf.length === actualBuf.length &&
            crypto.timingSafeEqual(expectedBuf, actualBuf)
        );
    } catch {
        return false;
    }
}
