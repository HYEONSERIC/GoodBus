import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Raw client IP for logging/fail2ban matching (not rate-limit bucketing).
 * Express only sees requests via Next.js's same-host proxy (app/api/[...path]/route.ts),
 * so req.ip here is always 127.0.0.1 — Nginx sets X-Real-IP to the real client address
 * (deploy/nginx/goodbus.conf) and the Next proxy forwards it through unmodified.
 */
export function getClientIp(req: Request): string {
    const realIp = req.headers['x-real-ip'];
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    return ip || req.ip || 'unknown';
}

/** Shared IP-based rate limiter factory — see getClientIp for the X-Real-IP reasoning. */
export function createIpRateLimiter(opts: {
    windowMs: number;
    limit: number;
    message: string;
}) {
    return rateLimit({
        windowMs: opts.windowMs,
        limit: opts.limit,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            const realIp = req.headers['x-real-ip'];
            const ip = Array.isArray(realIp) ? realIp[0] : realIp;
            // ipKeyGenerator collapses IPv6 addresses to a /56 subnet — without it,
            // an attacker can cycle through effectively unlimited IPv6 addresses
            // within their own subnet to bypass this limiter entirely.
            return ip || ipKeyGenerator(req.ip ?? 'unknown');
        },
        message: { error: opts.message },
    });
}
