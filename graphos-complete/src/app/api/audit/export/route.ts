import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_req: Request) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('tenant_id,role').eq('id', user.id).single();

    // Basic security: require profile and check tenant context
    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: rows } = await supabase.from('audit_trail').select('*').eq('tenant_id', profile.tenant_id);

    if (!rows || rows.length === 0) return NextResponse.json({ error: 'No data' }, { status: 404 });

    // Convert to CSV
    const headers = Object.keys(rows[0]);
    const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => JSON.stringify(r[h])).join(','))
    ].join('\n');

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit_${Date.now()}.csv"`
        }
    });
}
