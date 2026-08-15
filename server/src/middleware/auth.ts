import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { JWTPayload } from '../types';
import { UserRole, AdminRole } from '@prisma/client';
import prisma from '../utils/db';

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let payload: JWTPayload;
    try {
        payload = verifyToken(token);
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // JWT 서명만으로는 로그인 이후의 차단을 반영하지 못한다 — 토큰 만료가
    // 7일이라 관리자가 계정을 차단해도 기존 세션이 최대 7일간 그대로
    // 유효했다. requireAdminRole과 동일하게 매 요청마다 최신 상태를 조회한다.
    try {
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { status: true },
        });
        if (!user || user.status === 'Blocked') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    } catch (error) {
        console.error('requireAuth status lookup failed:', error);
    }

    req.user = payload;
    next();
}

export function requireRole(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    };
}

// adminRole isn't in the JWT payload, so this looks it up fresh on every
// request — deliberately, so revoking/changing an admin's sub-role doesn't
// require them to log out first.
export function requireAdminRole(...roles: AdminRole[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let admin: { adminRole: AdminRole | null } | null;
        try {
            admin = await prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { adminRole: true },
            });
        } catch (error) {
            console.error('requireAdminRole lookup failed:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!admin?.adminRole || !roles.includes(admin.adminRole)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    };
}

// Used to mask (not block) GMV/revenue-shaped fields for admins who can see
// a route's other data but not the money — mirrors adminNav.ts's frontend
// exclusion of CustomerSupport from revenue views. Fails closed (hides
// revenue) on a DB error rather than throwing, since several call sites
// aren't wrapped in try/catch and Express 4 doesn't catch async rejections.
export async function canViewRevenue(userId: string): Promise<boolean> {
    try {
        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { adminRole: true },
        });
        return !!admin?.adminRole && admin.adminRole !== AdminRole.CustomerSupport;
    } catch (error) {
        console.error('canViewRevenue lookup failed:', error);
        return false;
    }
}
