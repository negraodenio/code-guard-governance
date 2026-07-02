import { createAdminClient } from '@/lib/supabase/admin';
import { addEvent } from '@/lib/council/events';
import { redactPII } from '@/lib/privacy/redact';
import { apiOk, apiError } from '@/lib/api/error';
import { embedMistralCached } from '@/lib/embeddings/mistral';
import { CouncilIAEngine } from '@/services/councilia/engine';
import { requireAuthContext, forbid, notFound } from '@/lib/security/auth-context';
import { hasTenantOrUserAccess } from '@/lib/security/ownership';



export const maxDuration = 800;

// v12.0.0 - Scientific Authority Engine
// Removed legacy stochastic callers. All LLM traffic redirected to centralized provider.

// ——— Main Worker ———————————————————

export async function POST(req: Request) {
    console.log('[Worker] v12.0.0 Scientific Authority — Engine starting');
    let body: any = {};
    try {
        const auth = await requireAuthContext();
        if (!auth.ok) return auth.response;

        body = await req.json() || {};
        const { validationId, runId, idea } = body;

        if (!validationId || !runId || !idea) return apiError('Missing params', 400);

        const supabase = createAdminClient();

        const { data: run } = await supabase
            .from('debate_runs')
            .select('*')
            .eq('id', runId)
            .maybeSingle();

        if (!run) return notFound();
        if (!hasTenantOrUserAccess(run, { tenantId: auth.ctx.tenantId, userId: auth.ctx.user.id })) return forbid();

        if (run.validation_id && run.validation_id !== validationId) {
            return apiError('Run/validation mismatch', 400);
        }

        const { data: validationRow } = await supabase
            .from('validations')
            .select('*')
            .eq('id', validationId)
            .maybeSingle();

        if (!validationRow) return notFound();
        if (!hasTenantOrUserAccess(validationRow, { tenantId: auth.ctx.tenantId, userId: auth.ctx.user.id })) return forbid();

        const { redacted: ideaRedacted } = redactPII(idea);
        
        // --- RAG RETRIEVAL (v12.0.0) ---
        let ragDocs: any[] = [];
        try {
            await addEvent(supabase, runId, 'system', null, { msg: '🔍 Recuperando Contexto Científico (RAG)...' });
            const [embedding] = await embedMistralCached([ideaRedacted || '']);
            const { data: matches, error: rpcError } = await supabase.rpc('match_code_chunks', {
                repo_filter: 'general',
                query_embedding: embedding,
                match_threshold: 0.3,
                match_count: 5
            });

            if (!rpcError && matches) {
                ragDocs = matches.map((m: any) => ({
                    id: crypto.randomUUID(),
                    content: m.content || m.code || '',
                    source: m.file_path || m.source || 'Conhecimento Institucional',
                    sourceType: 'scientific',
                    confidence: 'high'
                }));
                console.log(`[Worker] RAG retrieved ${ragDocs.length} documents.`);
            }
        } catch (_err) { console.error('[Worker] RAG error:', _err); }

        await addEvent(supabase, runId, 'system', null, { msg: '🔄 CouncilIA v12.0.0 Engine Initializing...' });

        // --- NEW v12.0.0 ENGINE EXECUTION ---
        const engine = new CouncilIAEngine();
        
        const input: any = {
            proposal: ideaRedacted,
            domain: 'general',
            jurisdiction: 'BR',
            ragDocuments: ragDocs, 
            metadata: {
                userId: auth.ctx.user.id,
                organizationId: auth.ctx.tenantId,
                sessionId: runId,
                consent: {
                    consentId: 'LGPD-AUTO-POC',
                    purposes: ['DECISION_ANALYSIS', 'AUDIT_TRAIL'] as any[],
                    grantedAt: new Date().toISOString()
                }
            }
        };

        const result = await engine.execute(input, async (event) => {
            await addEvent(supabase, runId, event.type, event.personaId, event.payload);
        });

        // --- PERSISTENCE (v7.3.1 Compatible) ---
        await supabase.from('validations').update({ 
            status: 'complete', 
            consensus_score: result.executiveVerdict.score, 
            full_result: {
                ...result,
                protocol: 'v12.0.0'
            }
        }).eq('id', validationId);

        await supabase.from('debate_runs').update({ status: 'complete' }).eq('id', runId);

        return apiOk({ runId, validationId, score: result.executiveVerdict.score });
    } catch (error: any) { 
        console.error('[Worker] Fatal Error (v12.0.0):', error); 
        const supabase = createAdminClient();
        if (body?.validationId) {
            await supabase.from('validations').update({ status: 'error' }).eq('id', body.validationId);
        }
        if (body?.runId) {
            await supabase.from('debate_runs').update({ status: 'error' }).eq('id', body.runId);
        }
        return apiError(error.message, 500);
    }
}
