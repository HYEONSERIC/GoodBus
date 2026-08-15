import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:4000';

export async function GET(request: NextRequest) {
    const originX = request.nextUrl.searchParams.get('originX')?.trim() || '';
    const originY = request.nextUrl.searchParams.get('originY')?.trim() || '';
    const destX = request.nextUrl.searchParams.get('destX')?.trim() || '';
    const destY = request.nextUrl.searchParams.get('destY')?.trim() || '';

    if (!originX || !originY || !destX || !destY) {
        return NextResponse.json(
            { error: 'originX, originY, destX, destY are required' },
            { status: 400 },
        );
    }

    const query = new URLSearchParams({
        originX,
        originY,
        destX,
        destY,
    });

    try {
        const response = await fetch(
            `${API_BASE_URL}/kakao/directions?${query.toString()}`,
            { cache: 'no-store' },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { error: data?.error || 'Kakao directions proxy failed' },
                { status: response.status },
            );
        }
        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { error: 'Kakao directions proxy request failed' },
            { status: 500 },
        );
    }
}
