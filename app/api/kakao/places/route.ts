import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:4000';

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('query')?.trim() || '';
    if (!query) {
        return NextResponse.json(
            { error: 'query is required' },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/kakao/places?query=${encodeURIComponent(query)}`,
            { cache: 'no-store' },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { error: data?.error || 'Kakao places proxy failed' },
                { status: response.status },
            );
        }
        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { error: 'Kakao places proxy request failed' },
            { status: 500 },
        );
    }
}
