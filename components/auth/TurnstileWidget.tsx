'use client';

import { useId, useRef } from 'react';
import Script from 'next/script';

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    'expired-callback'?: () => void;
                }
            ) => string;
            remove: (widgetId: string) => void;
        };
    }
}

/**
 * Renders nothing if NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset — same
 * optional-env-var-off pattern as Sentry/Aligo elsewhere in this codebase
 * (e.g. before a Cloudflare account exists yet). The server mirrors this:
 * TURNSTILE_SECRET_KEY unset means verifyTurnstileToken() always passes.
 */
export function TurnstileWidget({
    onVerify,
}: {
    onVerify: (token: string | null) => void;
}) {
    const containerId = useId().replace(/:/g, '');
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const renderedRef = useRef(false);

    if (!siteKey) return null;

    const renderWidget = () => {
        if (renderedRef.current || !window.turnstile) return;
        renderedRef.current = true;
        window.turnstile.render(`#${containerId}`, {
            sitekey: siteKey,
            callback: (token) => onVerify(token),
            'expired-callback': () => onVerify(null),
        });
    };

    return (
        <>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="afterInteractive"
                onLoad={renderWidget}
            />
            <div id={containerId} />
        </>
    );
}
