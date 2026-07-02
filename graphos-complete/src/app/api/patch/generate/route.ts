import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { embedMistralCached } from '@/lib/embeddings/mistral';
import crypto from 'crypto';
import { requireAuthContext, forbid, notFound } from '@/lib/security/auth-context';
import { hasTenantOrUserAccess } from '@/lib/security/ownership';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function callJudgeOpenRouter(messages: any[]) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || '',
            'X-Title': process.env.OPENROUTER_X_TITLE || 'CouncilIA'
        },
        body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages
        })
    });
    const bodyText = await r.text();
    if (!r.ok) {
        console.error(`OpenRouter error: ${r.status} - ${bodyText}`);
        throw new Error(`OpenRouter judge failed: ${r.status}`);
    }
    return JSON.parse(bodyText);
}

export async function POST(req: Request) {
    console.log('--- PATCH GENERATE REQUEST RECEIVED ---');
    try {
        const auth = await requireAuthContext();
        if (!auth.ok) return auth.response;

        const { validation_id, repo_id, objective } = await req.json();
        if (!validation_id || !repo_id || !objective) {
            return NextResponse.json({ error: 'validation_id, repo_id, objective are required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { data: validationRow } = await supabase
            .from('validations')
            .select('*')
            .eq('id', validation_id)
            .maybeSingle();

        if (!validationRow) return notFound();
        if (!hasTenantOrUserAccess(validationRow, { tenantId: auth.ctx.tenantId, userId: auth.ctx.user.id })) return forbid();

        const { data: repo } = await supabase
            .from('repositories')
            .select('*')
            .eq('id', repo_id)
            .maybeSingle();

        if (!repo) return notFound();
        if (!hasTenantOrUserAccess(repo, { tenantId: auth.ctx.tenantId, userId: auth.ctx.user.id })) return forbid();

        // 1) RAG context
        console.log('Fetching RAG context...');
        const [qEmb] = await embedMistralCached([objective]);

        const { data: ctx, error: ctxErr } = await supabase.rpc('match_code_chunks', {
            repo_filter: repo_id,
            query_embedding: qEmb,
            match_threshold: 0.1,
            match_count: 12
        });

        if (ctxErr) return NextResponse.json({ error: ctxErr.message }, { status: 500 });
        console.log(`Context found: ${ctx?.length || 0} chunks`);

        // 2) Prompt pro Judge gerar patches (unified diff)
        const messages = [
            {
                role: 'system',
                content:
                    [
                        'You are CouncilIA Patch Engine (Senior Engineer).',
                        'Goal: propose 1-3 small safe patches that improve the code for the given objective.',
                        'Output MUST be strict JSON array. No markdown.',
                        'Each item:',
                        '{ "file_path": string, "diff_unified": string, "reasoning": string, "effort_hours": number }',
                        'Rules:',
                        '- diff_unified must be a valid unified diff for ONE file.',
                        '- Use only files that exist in context.',
                        '- Keep patches small and reversible.',
                    ].join('\n')
            },
            {
                role: 'user',
                content: JSON.stringify({
                    objective,
                    repo_id,
                    context: (ctx ?? []).map((c: any) => ({
                        file_path: c.file_path,
                        similarity: c.similarity,
                        content: c.content
                    }))
                })
            }
        ];

        console.log('Calling OpenRouter judge...');
        const out = await callJudgeOpenRouter(messages);
        const text = out?.choices?.[0]?.message?.content ?? '[]';

        let patches: any[] = [];
        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            patches = JSON.parse(cleanText);
        } catch {
            return NextResponse.json({ error: 'Judge returned non-JSON output', raw: text }, { status: 500 });
        }

        console.log(`Judge generated ${patches.length} patches`);

        // 3) Persist
        let saved = 0;
        for (const p of patches.slice(0, 3)) {
            if (!p?.file_path || !p?.diff_unified || !p?.reasoning) continue;

            const { error } = await supabase.from('code_patches').insert({
                id: `patch_${crypto.randomUUID()}`,
                validation_id,
                tenant_id: auth.ctx.tenantId,
                repo_id,
                file_path: p.file_path,
                diff: p.diff_unified,
                reasoning: p.reasoning,
                estimated_effort_hours: p.effort_hours ?? 1,
                status: 'pending'
            });

            if (error) {
                console.error('Supabase patch insert error:', error);
            } else {
                saved++;
            }
        }

        return NextResponse.json({ ok: true, saved, patches: patches.slice(0, 3) });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
