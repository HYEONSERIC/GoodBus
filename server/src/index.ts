import './loadEnv';
import './instrument';
import * as Sentry from '@sentry/node';
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/auth';
import tripsRoutes from './routes/trips';
import bidsRoutes from './routes/bids';
import notificationsRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import kakaoRoutes from './routes/kakao';
import chatsRoutes from './routes/chats';
import verificationRoutes from './routes/verification';
import profileRoutes from './routes/profile';
import supportRoutes from './routes/support';
import reviewsRoutes from './routes/reviews';
import paymentsRoutes from './routes/payments';
import { handleTossWebhook } from './routes/paymentsWebhook';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    })
);

app.use(cookieParser());

// HMAC 서명 검증을 위해 원본 바이트가 필요하므로, 이 라우트만 전역
// express.json()보다 먼저 express.raw()로 등록한다 (Stripe 웹훅과 동일 패턴).
app.post(
    '/payments/webhook',
    express.raw({ type: '*/*' }),
    handleTossWebhook
);

app.use(express.json());
app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
        setHeaders: (res) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        },
    })
);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/trips', tripsRoutes);
app.use('/bids', bidsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/admin', adminRoutes);
app.use('/kakao', kakaoRoutes);
app.use('/chats', chatsRoutes);
app.use('/verification', verificationRoutes);
app.use('/profile', profileRoutes);
app.use('/support', supportRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/payments', paymentsRoutes);

Sentry.setupExpressErrorHandler(app);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: '업로드할 수 없는 파일입니다.' });
    }
    console.error('Unhandled error:', req.method, req.path, err);
    return res.status(500).json({ error: 'Internal server error' });
});

// Defense-in-depth: Express 4 doesn't auto-catch rejected promises from async route
// handlers, and Node's default behavior since v15 is to crash the process on an
// unhandled rejection. Route-level validation is the real fix, but this keeps one
// missed case from taking down the whole server for every user.
process.on('unhandledRejection', (reason) => {
    Sentry.captureException(reason);
    console.error('Unhandled promise rejection:', reason);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
