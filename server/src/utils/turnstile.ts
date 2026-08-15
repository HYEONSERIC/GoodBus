/**
 * Cloudflare Turnstile verification for signup-business (Driver/BusCompany) —
 * the only signup path without a phone-OTP cost barrier, so the most exposed
 * to scripted mass account creation. Mirrors the Aligo/Sentry pattern in this
 * codebase: no secret configured (e.g. local dev, before Cloudflare signup) ->
 * feature stays off rather than blocking signups.
 */
export async function verifyTurnstileToken(
    token: string | undefined,
    remoteIp?: string
): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        return true;
    }
    if (!token) {
        return false;
    }

    try {
        const response = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    secret,
                    response: token,
                    ...(remoteIp ? { remoteip: remoteIp } : {}),
                }),
            }
        );

        if (!response.ok) {
            return false;
        }

        const data = (await response.json()) as { success?: boolean };
        return data.success === true;
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return false;
    }
}
