/**
 * QStash Webhook Handler v7.1
 * Asynchronously processes CouncilIA rounds and stores the final result.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: any) {
  if (!process.env.QSTASH_TOKEN || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ ok: false, reason: 'QStash not configured' }, { status: 200 });
  }
  try {
    const { verifySignatureAppRouter } = await import("@upstash/qstash/dist/nextjs");
    const { CouncilIAEngine } = await import('@/services/councilia/engine');
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const handler = async (req: any) => {
      const body = await req.json();
      if (body.type !== 'execute-councilia-session') {
        return NextResponse.json({ error: 'Unsupported task type' }, { status: 400 });
      }
      const { payload } = body;
      try {
        const engine = new CouncilIAEngine();
        const result = await engine.execute({
          proposal: payload.proposal,
          domain: (payload.domain as any) || 'general',
          jurisdiction: (payload.jurisdiction as any) || 'BR',
          ragDocuments: payload.rag_documents || [],
          metadata: {
            userId: payload.metadata?.user_id || 'system_async',
            organizationId: payload.metadata?.organization_id || 'default',
            sessionId: payload.session_id,
            consent: {
              consentId: `ASYNC_CONSENT_${payload.session_id}`,
              grantedAt: new Date().toISOString(),
              purposes: ['DECISION_ANALYSIS', 'REGULATORY_COMPLIANCE']
            }
          }
        });
        const { error } = await supabaseAdmin
          .from('councilia_reports')
          .update({
            status: 'COMPLETED', full_report: result,
            score: result.executiveVerdict.score, verdict: result.executiveVerdict.verdict,
            completed_at: new Date().toISOString()
          })
          .eq('session_id', payload.session_id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      } catch (error) {
        await supabaseAdmin
          .from('councilia_reports')
          .update({ status: 'FAILED', error_log: error instanceof Error ? error.message : 'Unknown error' })
          .eq('session_id', payload.session_id);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
      }
    }
    return verifySignatureAppRouter(handler)(req);
  } catch (err: any) {
    console.error('[Councilia Webhook] Init error:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
