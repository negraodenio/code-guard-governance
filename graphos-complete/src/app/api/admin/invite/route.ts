import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id,role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
        return NextResponse.json({ error: 'email and role required' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    const { data: invite, error } = await supabase
        .from('invites')
        .insert({
            tenant_id: profile.tenant_id,
            email,
            role,
            invited_by: user.id,
            expires_at: expiresAt.toISOString()
        })
        .select('*')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, invite });
}
