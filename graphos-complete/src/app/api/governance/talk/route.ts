import { NextRequest, NextResponse } from 'next/server';
import { parseGovernanceIntent, answerGovernanceQuery } from '@/lib/governance/talk';
import { buildFullGraph } from '@council/graphos';
import { getScannerResult } from '@/graphos/scanner-cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = body.query ?? '';
    const repoUrl: string | undefined = body.repoUrl;

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: 'Query must be at least 3 characters.' },
        { status: 400 },
      );
    }

    // Resolve GraphEngine from cached scan or governance seed
    let engine: Awaited<ReturnType<typeof buildFullGraph>>;
    if (repoUrl) {
      const cached = getScannerResult(repoUrl);
      if (!cached) {
        return NextResponse.json(
          { ok: false, error: `No cached scan for ${repoUrl}. Run scan first.` },
          { status: 404 },
        );
      }
      engine = cached.engine as any;
    } else {
      engine = await buildFullGraph();
    }

    const { intent, confidence } = parseGovernanceIntent(query);
    const answer = answerGovernanceQuery(intent, engine as any, query);

    return NextResponse.json({
      ok: true,
      data: {
        ...answer,
        confidence,
        detectedIntent: intent,
        graphStats: {
          agents: engine.getEntitiesByKind('agent').length,
          decisions: engine.getEntitiesByKind('decision').length,
          regulations: engine.getEntitiesByKind('regulation').length,
        },
      },
    });
  } catch (err) {
    console.error('[Governance Talk] Error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
