import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthContext, forbid, notFound } from '@/lib/security/auth-context';
import { hasTenantOrUserAccess } from '@/lib/security/ownership';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const runId = url.searchParams.get('runId');

    if (!runId) {
        return new Response('Missing runId', { status: 400 });
    }

    const auth = await requireAuthContext();
    if (!auth.ok) return auth.response;

    const { data: run } = await auth.admin
        .from('debate_runs')
        .select('*')
        .eq('id', runId)
        .maybeSingle();

    if (!run) return notFound();
    if (!hasTenantOrUserAccess(run, { tenantId: auth.ctx.tenantId, userId: auth.ctx.user.id })) return forbid();

    const encoder = new TextEncoder();
    let closed = false;
    let lastTs = '';

    const stream = new ReadableStream({
        async start(controller) {
            const supabase = createAdminClient();

            function send(eventType: string, data: any) {
                if (closed) return;
                try {
                    controller.enqueue(
                        encoder.encode('event: ' + eventType + '\ndata: ' + JSON.stringify(data) + '\n\n')
                    );
                } catch {
                    closed = true;
                }
            }

            send('heartbeat', { ts: Date.now() });

            const poll = setInterval(async () => {
                if (closed) {
                    clearInterval(poll);
                    return;
                }

                try {
                    let query = supabase
                        .from('debate_events')
                        .select('*')
                        .eq('run_id', runId)
                        .order('ts', { ascending: true });

                    if (lastTs) {
                        query = query.gt('ts', lastTs);
                    }

                    const { data: events, error } = await query;

                    if (error) {
                        console.error('[Stream] Query error:', error.message);
                        return;
                    }

                    if (!events || events.length === 0) return;

                    for (const ev of events) {
                        if (ev.ts) lastTs = ev.ts;

                        const payload = ev.payload || {};

                        switch (ev.event_type) {
                            case 'model_msg':
                                send('model_msg', {
                                    model: ev.model,
                                    text: payload.text || '',
                                    phase: payload.phase || '',
                                    persona: payload.persona || '',
                                    emoji: payload.emoji || '',
                                    ts: ev.ts,
                                });
                                break;

                            case 'judge_note':
                                send('judge_note', {
                                    model: 'judge',
                                    text: payload.text || '',
                                    type: payload.type || '',
                                    ts: ev.ts,
                                });
                                break;

                            case 'consensus':
                                send('consensus', {
                                    coreSync: payload.coreSync ?? 0,
                                    global: payload.global ?? 0,
                                    phase: payload.phase || '',
                                });
                                break;

                            case 'complete':
                                send('complete', {
                                    validationId: payload.validationId || '',
                                    consensus_score: payload.consensus_score ?? 0,
                                });
                                clearInterval(poll);
                                setTimeout(() => {
                                    if (!closed) {
                                        try { controller.close(); } catch { }
                                    }
                                }, 1000);
                                return;

                            case 'system':
                                send('model_msg', {
                                    model: 'system',
                                    text: payload.msg || '',
                                    ts: ev.ts,
                                });
                                break;

                            case 'error':
                                send('model_msg', {
                                    model: ev.model || 'system',
                                    text: 'Warning: ' + (payload.msg || 'Unknown error'),
                                    ts: ev.ts,
                                });
                                break;

                            case 'lang':
                                send('lang', { lang: payload.lang || 'English' });
                                break;

                            default:
                                send('model_msg', {
                                    model: ev.model || 'system',
                                    text: payload.text || payload.msg || '',
                                    ts: ev.ts,
                                });
                        }
                    }
                } catch (err) {
                    console.error('[Stream] Poll error:', err);
                }
            }, 1500);

            setTimeout(() => {
                closed = true;
                clearInterval(poll);
                try { controller.close(); } catch { }
            }, 600000);
        },

        cancel() {
            closed = true;
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
