import { NextResponse, NextRequest } from 'next/server';
import { buildFullGraph } from '@council/graphos';
import { getScannerResult } from '@/graphos/scanner-cache';
import type { GraphEngine } from '@council/graphos';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoUrl = searchParams.get('repo');
    
    let engine: GraphEngine;

    // Use cached engine if available and requested, otherwise build from seed
    if (repoUrl) {
      const cached = getScannerResult(repoUrl);
      if (cached) {
        engine = cached.engine;
      } else {
        return NextResponse.json({ ok: false, error: 'Graph not found in cache for the specified repo' }, { status: 404 });
      }
    } else {
      engine = await buildFullGraph();
    }

    const stats = engine.stats();
    const validation = engine.validate();
    const tripleConfidence = engine.computeTripleConfidence();

    return NextResponse.json({
      ok: true,
      data: {
        healthy: validation.valid,
        stats,
        validation,
        tripleConfidence
      }
    });
  } catch (err) {
    console.error('[GraphOS Health] Error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
