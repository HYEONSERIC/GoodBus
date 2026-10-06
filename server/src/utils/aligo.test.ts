import { describe, expect, it, vi } from 'vitest';
import { postAlimtalk, AlimtalkPayload } from './aligo';

const payload: AlimtalkPayload = {
    apiKey: 'k',
    userId: 'u',
    sender: '01000000000',
    senderKey: 'sk',
    tplCode: 'UL_9798',
    receiver: '01012345678',
    message: '본문',
    fallbackSubject: '제목',
    fallbackText: '대체',
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('postAlimtalk', () => {
    it('result_code 1이면 성공', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ result_code: '1' }));
        const result = await postAlimtalk(payload, fetchImpl);
        expect(result).toEqual({ ok: true });
    });

    it('알림톡 API는 code 0을 성공으로 응답', async () => {
        const fetchImpl = vi.fn(async () =>
            jsonResponse({ code: 0, message: '성공적으로 전송요청 하였습니다.' }),
        );
        const result = await postAlimtalk(payload, fetchImpl);
        expect(result).toEqual({ ok: true });
    });

    it('네트워크 예외는 재시도 대상', async () => {
        const fetchImpl = vi.fn(async () => {
            throw new TypeError('fetch failed');
        });
        const result = await postAlimtalk(payload, fetchImpl);
        expect(result).toEqual({ ok: false, error: 'network', retryable: true });
    });

    it('5xx는 재시도 대상', async () => {
        const fetchImpl = vi.fn(async () => new Response('err', { status: 503 }));
        const result = await postAlimtalk(payload, fetchImpl);
        expect(result).toMatchObject({ ok: false, retryable: true });
    });

    it('4xx는 재시도하지 않음', async () => {
        const fetchImpl = vi.fn(async () => new Response('bad', { status: 400 }));
        const result = await postAlimtalk(payload, fetchImpl);
        expect(result).toMatchObject({ ok: false, retryable: false });
    });

    it('result_code 오류(미승인 템플릿 등)는 재시도하지 않음', async () => {
        const fetchImpl = vi.fn(async () =>
            jsonResponse({ result_code: '-100', message: '승인되지 않은 템플릿' }),
        );
        const result = await postAlimtalk(payload, fetchImpl);
        expect(result).toEqual({
            ok: false,
            error: '승인되지 않은 템플릿',
            retryable: false,
        });
    });

    it('JSON이 아닌 응답은 실패로 처리', async () => {
        const fetchImpl = vi.fn(async () => new Response('<html>', { status: 200 }));
        const result = await postAlimtalk(payload, fetchImpl);
        expect(result).toMatchObject({ ok: false, retryable: false });
    });

    it('버튼 JSON이 있으면 button_1 파라미터로 실린다', async () => {
        const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) =>
            jsonResponse({ result_code: '1' }),
        );
        await postAlimtalk({ ...payload, buttonJson: '{"button":[]}' }, fetchImpl);
        const body = fetchImpl.mock.calls[0][1].body as URLSearchParams;
        expect(body.get('button_1')).toBe('{"button":[]}');
        expect(body.get('failover')).toBe('Y');
        expect(body.get('fmessage_1')).toBe('대체');
    });
});
