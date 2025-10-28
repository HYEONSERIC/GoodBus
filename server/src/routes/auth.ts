import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../utils/db';
import { generateToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['Passenger', 'Driver', 'BusCompany']),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

router.post('/signup', async (req, res) => {
    try {
        const { email, password, role } = signupSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: role as any,
            },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        const token = generateToken({
            userId: user.id,
            role: user.role as any,
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({ user, token });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res
                .status(400)
                .json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken({ userId: user.id, role: user.role });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res
                .status(400)
                .json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
        },
    });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
});

export default router;
