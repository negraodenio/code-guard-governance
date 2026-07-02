import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { invite_id } = await req.json();

    const { data: invite, error: invErr } = await supabase
        .from('invites')
        .select('*')
        .eq('id', invite_id)
        .eq('email', user.email)
        .eq('status', 'pending')
        .single();

    if (invErr || !invite) {
        return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
    }

    if (new Date(invite.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
    }

    // Update profile to new tenant
    await supabase
        .from('profiles')
        .update({ tenant_id: invite.tenant_id, role: invite.role })
        .eq('id', user.id);

    // Mark invite as accepted
    await supabase.from('invites').update({ status: 'accepted' }).eq('id', invite_id);

    return NextResponse.json({ ok: true, tenant_id: invite.tenant_id });
}
