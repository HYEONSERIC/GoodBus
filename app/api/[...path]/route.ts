import { NextRequest } from 'next/server';

function getBackendBaseUrl() {
    const url =
        process.env.API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_URL;
    if (!url) {
        throw new Error(
            'Missing backend URL. Set API_URL (recommended) on the Next.js server.'
        );
    }
    return url.replace(/\/+$/, '');
}

async function handler(
    req: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const backendBaseUrl = getBackendBaseUrl();
    const params = await context.params;
    const path = (params?.path || []).join('/');
    const search = req.nextUrl.search;
    const targetUrl = `${backendBaseUrl}/${path}${search}`;

    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('content-length');

    const method = req.method.toUpperCase();
    const hasBody = !['GET', 'HEAD'].includes(method);

    const upstreamRes = await fetch(targetUrl, {
        method,
        headers,
        body: hasBody ? await req.arrayBuffer() : undefined,
        redirect: 'manual',
    });

    const resHeaders = new Headers(upstreamRes.headers);
    // Avoid leaking backend-specific CORS headers; this route is same-origin.
    resHeaders.delete('access-control-allow-origin');
    resHeaders.delete('access-control-allow-credentials');
    resHeaders.delete('access-control-allow-headers');
    resHeaders.delete('access-control-allow-methods');

    return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: resHeaders,
    });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
