import { NextRequest, NextResponse } from 'next/server';
import { runScan, getKnownTargets } from '@/services/scan-service';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/cron/rescan
// Scheduled rescan of ALL known targets (continuous governance).
// Triggered by Vercel Cron (vercel.json) or any external scheduler.
// Auth: Authorization: Bearer <CRON_SECRET> (when configured)
// ─────────────────────────────────────────────────────────────────────────────

export const maxDuration = 300; // 5 min — scans are slow

export async function GET(req: NextRequest) {
  try {
    // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const targets = await getKnownTargets();
    if (targets.length === 0) {
      return NextResponse.json({ ok: true, message: 'Nenhum alvo conhecido para rescan' });
    }

    // Rescan sequentially (rate limits) — cap at 5 per cron run
    const batch = targets.slice(0, 5);
    const results: Array<{ target: string; ok: boolean; agents?: number; certLevel?: string; shadowAgents?: number; error?: string }> = [];

    for (const target of batch) {
      try {
        const outcome = await runScan(target, { trigger: 'cron' });
        results.push({
          target, ok: true,
          agents: outcome.agents, certLevel: outcome.certLevel,
          shadowAgents: outcome.drift?.newAgents.length ?? 0,
        });
      } catch (e) {
        results.push({ target, ok: false, error: e instanceof Error ? e.message : 'scan failed' });
      }
    }

    const shadowTotal = results.reduce((s, r) => s + (r.shadowAgents ?? 0), 0);
    return NextResponse.json({
      ok: true,
      message: `Rescan de ${results.length}/${targets.length} alvos${shadowTotal > 0 ? ` | ⚠ ${shadowTotal} shadow agents` : ''}`,
      data: { scanned: results, remaining: targets.length - batch.length },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
