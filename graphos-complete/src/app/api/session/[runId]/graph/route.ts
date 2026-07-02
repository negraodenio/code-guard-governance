import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { transformCouncilOutputToGraph } from '@/lib/graphos/transformer';
import type { CouncilIAOutput } from '@/types/councilia-universal';

export async function GET(
  _req: NextRequest,
  { params }: { params: { runId: string } },
) {
  try {
    const { runId } = params;
    if (!runId) {
      return NextResponse.json({ ok: false, error: 'Missing runId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: run, error: runErr } = await supabase
      .from('debate_runs')
      .select('id, validation_id, status, created_at')
      .eq('id', runId)
      .single();

    if (runErr || !run) {
      return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
    }

    const { data: events, error: evtErr } = await supabase
      .from('debate_events')
      .select('payload, model, event_type, ts')
      .eq('run_id', runId)
      .order('ts', { ascending: true });

    if (evtErr) {
      return NextResponse.json({ ok: false, error: 'Failed to fetch events' }, { status: 500 });
    }

    let fullResult: CouncilIAOutput | null = null;

    if (run.validation_id) {
      const { data: validation } = await supabase
        .from('validations')
        .select('full_result, idea')
        .eq('id', run.validation_id)
        .single();

      if (validation?.full_result) {
        fullResult = validation.full_result as CouncilIAOutput;
      }
    }

    if (fullResult) {
      const graphData = transformCouncilOutputToGraph(
        fullResult,
        (fullResult as any).metadata?.proposal ?? 'Strategic Decision',
      );
      graphData.metadata.sessionId = runId;
      return NextResponse.json({
        ok: true,
        data: graphData,
        meta: { status: run.status, eventsCount: events.length },
      });
    }

    const responseTexts = events
      .filter(e => e.event_type === 'model_msg' && e.payload?.text)
      .map(e => ({
        persona: e.model ?? 'unknown',
        text: e.payload.text,
        ts: e.ts,
      }));

    return NextResponse.json({
      ok: true,
      data: {
        nodes: responseTexts.map((r, i) => ({
          id: `${r.persona}-${i}`,
          type: 'persona',
          label: r.persona,
          color: '#0ECFB8',
          radius: 20,
        })),
        edges: [],
        metadata: {
          sessionId: runId,
          proposal: 'Debate Session',
          verdict: 'PENDING',
          score: 0,
          totalRounds: 0,
        },
      },
      meta: { status: run.status, eventsCount: events.length },
    });
  } catch (err) {
    console.error('[Graph API] Error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
