import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { embedMistralCached } from '@/lib/embeddings/mistral';
import { requireAuthContext, forbid, notFound } from '@/lib/security/auth-context';
import { hasTenantOrUserAccess } from '@/lib/security/ownership';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const auth = await requireAuthContext();
        if (!auth.ok) return auth.response;

        const { repo_id, limit } = await req.json();
        const supabase = createAdminClient();
        console.log(`--- EMBED REQUEST RECEIVED for repo: ${repo_id} ---`);
        const batchSize = Math.min(Number(limit ?? 32), 128);

        const { data: repo } = await supabase
            .from('repositories')
            .select('*')
            .eq('id', repo_id)
            .maybeSingle();

        if (!repo) return notFound();
        if (!hasTenantOrUserAccess(repo, { tenantId: auth.ctx.tenantId, userId: auth.ctx.user.id })) return forbid();

        if (!process.env.MISTRAL_API_KEY) {
            return NextResponse.json({ error: 'Missing MISTRAL_API_KEY' }, { status: 400 });
        }

        // Buscar chunks sem embedding ainda
        const { data: rows, error } = await supabase
            .from('coding_memory')
            .select('id,content')
            .eq('repo_id', repo_id)
            .is('embedding', null)
            .limit(batchSize);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!rows || rows.length === 0) return NextResponse.json({ ok: true, embedded: 0 });

        const texts = rows.map(r => r.content);
        const vectors = await embedMistralCached(texts);

        // Update row-by-row (v1 simples; depois otimizamos)
        let embedded = 0;
        for (let i = 0; i < rows.length; i++) {
            const id = rows[i].id;
            const embedding = vectors[i];

            const { error: upErr } = await supabase
                .from('coding_memory')
                .update({ embedding })
                .eq('id', id);

            if (!upErr) embedded++;
        }

        return NextResponse.json({ ok: true, embedded });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
