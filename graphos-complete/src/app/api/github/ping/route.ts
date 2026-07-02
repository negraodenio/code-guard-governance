import { NextResponse } from 'next/server';
import { gh } from '@/lib/github/client';
import { isInternalRequest } from '@/lib/security/internal-auth';

export async function GET(req: Request) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEBUG_ENDPOINTS !== 'true') {
        return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }

    if (process.env.INTERNAL_WORKER_SECRET && !isInternalRequest(req.headers)) {
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!process.env.GITHUB_TOKEN) {
        return NextResponse.json({ ok: false, error: 'Missing GITHUB_TOKEN' }, { status: 400 });
    }
    try {
        const me = await gh('/user');
        return NextResponse.json({ ok: true, login: me.login, id: me.id });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
