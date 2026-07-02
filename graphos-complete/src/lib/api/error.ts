import { NextResponse } from 'next/server';

export function apiError(message: string, status = 500, details?: any) {
    return NextResponse.json(
        { ok: false, error: message, details },
        { status }
    );
}

export function apiOk(data: any) {
    return NextResponse.json({ ok: true, ...data });
}
