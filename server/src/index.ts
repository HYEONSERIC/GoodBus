import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
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

dotenv.config({
    path: path.resolve(__dirname, '../.env'),
    override: true,
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    })
);

app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
