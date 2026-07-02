import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveTenant } from '@/lib/tenant';
import { canTransition, transitionError } from '@/lib/lifecycle';

// ─────────────────────────────────────────────────────────────────────────────
// GET   /api/v1/agents          → inventário (gov_repo.agents)
// PATCH /api/v1/agents          → { agentId, status } transição de lifecycle
// ─────────────────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function govQuery(sql: string) {
  const { data, error } = await getSupabase().rpc('gov_exec', { sql });
  if (error) throw new Error(`gov_exec: ${error.message}`);
  return data ?? [];
}

async function govDML(sql: string) {
  const { data, error } = await getSupabase().rpc('gov_exec_dml', { sql });
  if (error) throw new Error(`gov_exec_dml: ${error.message}`);
  return data ?? [];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const { orgId } = resolveTenant(req);
    const agents = await govQuery(
      `SELECT agent_id, agent_code, name, description, agent_type, risk_level,
              ai_act_risk_class, oversight_level, status, approved_for_production,
              business_domain, model_provider, external_refs, created_at
       FROM gov_repo.agents
       WHERE organisation_id = '${orgId}'
       ORDER BY created_at DESC
       LIMIT 200`
    );
    const byStatus: Record<string, number> = {};
    for (const a of agents as any[]) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    return NextResponse.json({ ok: true, data: { agents, total: (agents as any[]).length, byStatus } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orgId } = resolveTenant(req);
    const { agentId, status } = await req.json();
    if (!agentId || !UUID_RE.test(agentId) || !status) {
      return NextResponse.json({ ok: false, error: 'agentId (uuid) e status são obrigatórios' }, { status: 400 });
    }
    const VALID = ['pending_registration', 'registered', 'approved', 'active', 'suspended', 'under_review', 'decommissioned'];
    if (!VALID.includes(status)) {
      return NextResponse.json({ ok: false, error: `status inválido. Use: ${VALID.join(', ')}` }, { status: 400 });
    }

    // Lifecycle enforcement
    const current = await govQuery(`SELECT status, agent_code, name FROM gov_repo.agents WHERE agent_id = '${agentId}' AND organisation_id = '${orgId}'`);
    if (!current[0]) return NextResponse.json({ ok: false, error: 'Agente não encontrado' }, { status: 404 });
    const from = current[0].status as string;
    if (!canTransition(from, status)) {
      return NextResponse.json({ ok: false, error: transitionError(from, status), code: 'INVALID_LIFECYCLE_TRANSITION' }, { status: 409 });
    }

    const rows = await govDML(
      `UPDATE gov_repo.agents SET status = '${status}', updated_at = now()
       WHERE agent_id = '${agentId}' AND organisation_id = '${orgId}'
       RETURNING agent_id, agent_code, name, status`
    );

    // Ledger (best effort)
    try {
      const userRows = await govQuery(`SELECT user_id FROM gov_repo.governance_users WHERE organisation_id = '${orgId}' AND status = 'active' LIMIT 1`);
      const actor = userRows[0]?.user_id;
      if (actor) {
        await govDML(
          `INSERT INTO gov_repo.governance_ledger (event_type, event_description, subject_type, subject_id, actor_user_id, organisation_id, payload)
           VALUES ('agent.lifecycle.${status}', '${(current[0].name as string).replace(/'/g, "''")}: ${from} -> ${status}', 'agent', '${agentId}', '${actor}', '${orgId}', '{"from":"${from}","to":"${status}"}'::jsonb)
           RETURNING entry_id`
        );
      }
    } catch { /* ledger é best-effort aqui */ }

    return NextResponse.json({ ok: true, data: rows[0] ?? null, transition: { from, to: status } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
