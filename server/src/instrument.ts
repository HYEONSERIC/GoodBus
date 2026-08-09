import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === 'production' && !!dsn,
    tracesSampleRate: 0.1,
});
