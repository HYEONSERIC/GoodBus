import { describe, expect, it } from 'vitest';
import { generateToken, verifyToken } from './jwt';
import { UserRole } from '@prisma/client';

describe('generateToken / verifyToken', () => {
    const payload = { userId: 'user-1', role: UserRole.Passenger };

    it('발급한 토큰을 검증하면 원래 payload를 복원한다', () => {
        const token = generateToken(payload);
        const decoded = verifyToken(token);

        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.role).toBe(payload.role);
    });

    it('변조된 토큰은 검증에 실패한다', () => {
        const token = generateToken(payload);
        const tampered = `${token}tampered`;

        expect(() => verifyToken(tampered)).toThrow();
    });

    it('role이 다른 사용자는 payload도 다르게 복원된다', () => {
        const adminToken = generateToken({ userId: 'admin-1', role: UserRole.Admin });
        const decoded = verifyToken(adminToken);
        expect(decoded.role).toBe(UserRole.Admin);
    });
});
