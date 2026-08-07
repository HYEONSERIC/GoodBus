import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

const JWT_SECRET =
    process.env.JWT_SECRET?.trim() ||
    (() => {
        throw new Error('JWT_SECRET environment variable is required');
    })();

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
}
