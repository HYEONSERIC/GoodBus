import crypto from 'crypto';

/**
 * 토스페이먼츠 웹훅 서명 검증.
 * signatureHeader 형식: "v1:<base64>,v1:<base64>,..." (여러 값이 콤마로 올 수 있음 — 하나만 맞아도 유효)
 * 실제 헤더 이름/형식은 구현·테스트 시 docs.tosspayments.com/reference/using-api/webhook-events에서 재확인할 것.
 */
export function verifyTossWebhookSignature(
    rawBody: Buffer,
    transmissionTime: string,
    signatureHeader: string,
): boolean {
    const secret = process.env.TOSS_WEBHOOK_SECRET;
    if (!secret) return false;
    if (!transmissionTime || !signatureHeader) return false;

    const payload = `${rawBody.toString('utf8')}:${transmissionTime}`;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest();

    const candidates = signatureHeader
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.startsWith('v1:'))
        .map((v) => v.slice('v1:'.length));

    return candidates.some((candidate) => {
        try {
            const decoded = Buffer.from(candidate, 'base64');
            return (
                decoded.length === expected.length &&
                crypto.timingSafeEqual(decoded, expected)
            );
        } catch {
            return false;
        }
    });
}
