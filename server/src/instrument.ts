import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

// 카드 등록 라우트(POST /payments/billing-key/register)는 카드번호/비밀번호를
// req.body로 직접 받는다 — 지금은 sendDefaultPii가 꺼져있어(기본값) Sentry가
// 요청 바디를 자동 캡처하지 않지만, 나중에 SDK 기본값이 바뀌거나 누군가
// sendDefaultPii를 켜도 이 라우트만은 절대 새지 않도록 명시적으로 걸러낸다.
Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === 'production' && !!dsn,
    tracesSampleRate: 0.1,
    beforeSend(event) {
        if (event.request?.url?.includes('/payments/billing-key/register')) {
            delete event.request.data;
        }
        return event;
    },
});
