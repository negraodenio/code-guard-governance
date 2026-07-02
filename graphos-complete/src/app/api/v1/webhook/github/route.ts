import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { runScan } from '@/services/scan-service';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/webhook/github
// GitHub push webhook → automatic rescan (continuous discovery).
// Setup no repo: Settings → Webhooks → Add:
//   Payload URL: https://<host>/api/v1/webhook/github
//   Content type: application/json
//   Secret: valor de GITHUB_WEBHOOK_SECRET
//   Events: Just the push event
// ─────────────────────────────────────────────────────────────────────────────

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Signature verification (mandatory when secret is configured)
    if (secret) {
      const sig = req.headers.get('x-hub-signature-256');
      if (!verifySignature(rawBody, sig, secret)) {
        return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = req.headers.get('x-github-event');
    if (event === 'ping') {
      return NextResponse.json({ ok: true, message: 'pong' });
    }
    if (event !== 'push') {
      return NextResponse.json({ ok: true, message: `Event '${event}' ignored — only push triggers rescan` });
    }

    const payload = JSON.parse(rawBody);
    const repoUrl: string | undefined = payload?.repository?.html_url;
    const defaultBranch: string | undefined = payload?.repository?.default_branch;
    const pushedRef: string | undefined = payload?.ref;

    if (!repoUrl) {
      return NextResponse.json({ ok: false, error: 'repository.html_url missing in payload' }, { status: 400 });
    }

    // Only rescan pushes to the default branch (avoid rescan storms from feature branches)
    if (defaultBranch && pushedRef && pushedRef !== `refs/heads/${defaultBranch}`) {
      return NextResponse.json({ ok: true, message: `Push to ${pushedRef} ignored — only ${defaultBranch} triggers rescan` });
    }

    console.log(`[Webhook] Push to ${repoUrl} — triggering rescan`);
    const outcome = await runScan(repoUrl, { trigger: 'webhook' });

    const shadowAlert = outcome.drift && outcome.drift.newAgents.length > 0
      ? ` | ⚠ ${outcome.drift.newAgents.length} shadow agent(s) detected`
      : '';

    return NextResponse.json({
      ok: true,
      message: `Rescan concluído: ${outcome.agents} agentes, cert ${outcome.certLevel}${shadowAlert}`,
      data: outcome,
    });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
