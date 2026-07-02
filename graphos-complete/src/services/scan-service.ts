// ─────────────────────────────────────────────────────────────────────────────
// Scan Service — single reusable scan pipeline.
// Used by: /api/v1/graph (manual), /api/v1/webhook/github (push), /api/v1/cron/rescan.
// Multi-tenant ready: accepts orgId/tenantId overrides.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const DEFAULT_TENANT_ID = '52f41339-a838-4d8f-b041-f9b7bf1ff305';

export interface ScanOptions {
  orgId?: string;
  tenantId?: string;
  githubToken?: string;
  /** Marks how the scan was triggered — stored in the session for audit. */
  trigger?: 'manual' | 'webhook' | 'cron';
}

export interface ScanOutcome {
  scanId: string;
  target: string;
  agents: number;
  risks: number;
  evidence: number;
  certLevel: string;
  score: number;
  regulations: number;
  compliantRegulations: number;
  entitiesCreated: number;
  relsCreated: number;
  agentsRegistered: number;
  drift: { newAgents: string[]; removedAgents: string[] } | null;
}

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

export function parseScanUrl(input: string): string | null {
  const clean = input.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const m = clean.match(/(?:https?:\/\/)?(?:www\.)?(github\.com|gitlab\.com|bitbucket\.org|dev\.azure\.com|codeberg\.org|gitea\.com)(\/[\w./-]+\/[\w.-]+)/i);
  if (!m) return null;
  return `https://${m[1]}${m[2]}`;
}

export async function runScan(rawUrl: string, opts: ScanOptions = {}): Promise<ScanOutcome> {
  const url = parseScanUrl(rawUrl);
  if (!url) throw new Error(`URL inválida: ${rawUrl}. Use formato: github.com/owner/repo`);

  const ORG_ID = opts.orgId ?? process.env.GRAPHOS_ORG_ID ?? process.env.GRAPHOS_TENANT_ID ?? DEFAULT_TENANT_ID;
  const TENANT_ID = opts.tenantId ?? process.env.GRAPHOS_TENANT_ID ?? ORG_ID;
  const targetLabel = url;
  const scanId = crypto.randomUUID();

  // ── Mature compliance scanner (13 regs, FinOps, violations, config agents, CI/CD, IaC) ──
  const { discoverRepo } = await import('@/scanner');
  const { mapToGraphOS } = await import('@/scanner/graphos-mapper');
  const result = await discoverRepo({ repoUrl: url, githubToken: opts.githubToken ?? process.env.GITHUB_TOKEN });
  const { entities, relationships } = mapToGraphOS(result);

  const agentCount = entities.filter(e => e.kind === 'agent').length;
  const riskCount = entities.filter(e => e.kind === 'risk').length;
  const evidenceCount = entities.filter(e => e.kind === 'evidence').length;
  const regulationCount = result.compliance.applicableRegulations.filter(r => r.status !== 'not_applicable').length;
  const compliantCount = result.compliance.applicableRegulations.filter(r => r.status === 'compliant').length;

  // ── Drift detection ──
  const supabase = getSupabase();
  const agentNames = result.source.agents.map(a => a.name).slice(0, 200);
  let drift: { newAgents: string[]; removedAgents: string[] } | null = null;
  try {
    const { data: prevSessions } = await supabase.from('graphos_entities')
      .select('attributes')
      .eq('kind', 'evidence')
      .filter('attributes->>type', 'eq', 'scan_session')
      .filter('attributes->>target', 'eq', targetLabel)
      .order('created_at', { ascending: false })
      .limit(1);
    const prevNames: string[] = (prevSessions?.[0]?.attributes as any)?.agentNames ?? [];
    if (prevSessions && prevSessions.length > 0 && Array.isArray(prevNames)) {
      drift = {
        newAgents: agentNames.filter(n => !prevNames.includes(n)),
        removedAgents: prevNames.filter(n => !agentNames.includes(n)),
      };
    }
  } catch { /* first scan — no drift */ }

  // ── Scan session ──
  const sessionAttrs = {
    scanId, target: targetLabel, scannedAt: new Date().toISOString(),
    trigger: opts.trigger ?? 'manual',
    agents: agentCount, risks: riskCount,
    evidence: evidenceCount, certLevel: result.certification.overall,
    score: result.compliance.overallScore,
    regulations: regulationCount, compliantRegulations: compliantCount,
    agentNames,
    complianceRegulations: result.compliance.applicableRegulations.map(r => ({ id: r.id, name: r.name, status: r.status })),
    drift,
  };
  await supabase.from('graphos_entities').upsert({
    id: `scan-${scanId}`, kind: 'evidence', label: targetLabel,
    description: `Scan session for ${targetLabel} | ${agentCount} agents, cert ${result.certification.overall}, compliance ${result.compliance.overallScore}/100 (${compliantCount}/${regulationCount} regs)`,
    attributes: { ...sessionAttrs, type: 'scan_session' }, tenant_id: TENANT_ID,
  }, { onConflict: 'id' });

  // ── Shadow agent alert ──
  if (drift && drift.newAgents.length > 0) {
    await supabase.from('graphos_entities').upsert({
      id: `risk-shadow-${scanId.slice(0, 8)}`, kind: 'risk',
      label: `Shadow agents: ${drift.newAgents.length} novo(s) agente(s) desde o último scan`,
      description: `Agentes que apareceram sem registro prévio: ${drift.newAgents.slice(0, 10).join(', ')}. Requer revisão (CG-AG-001 Agent Inventory).`,
      attributes: { scanId, source: targetLabel, riskLevel: 'high', category: 'governance', cgagControl: 'CG-AG-001', newAgents: drift.newAgents },
      tenant_id: TENANT_ID,
    }, { onConflict: 'id' });
  }

  // ── Persist entities ──
  const DB_KINDS = new Set(['agent', 'decision', 'tool', 'external_system', 'data_asset', 'control', 'regulation', 'certificate', 'risk', 'incident', 'evidence', 'model', 'owner', 'cost_center', 'prompt']);
  let entitiesCreated = 0;
  for (const entity of entities) {
    const { id, kind, label, description, ...rest } = entity as any;
    const dbKind = DB_KINDS.has(kind) ? kind : 'evidence';
    const { error } = await supabase.from('graphos_entities').upsert({
      id, kind: dbKind, label, description: description || '',
      attributes: { ...rest, ...(rest.attrs || {}), scanId, source: targetLabel, ...(dbKind !== kind ? { originalKind: kind } : {}) },
      tenant_id: TENANT_ID,
    }, { onConflict: 'id' });
    if (!error) entitiesCreated++;
  }

  // ── Persist relationships ──
  let relsCreated = 0;
  for (const rel of relationships) {
    const { error } = await supabase.from('graphos_relationships').upsert({
      id: `${scanId.slice(0, 8)}-${rel.id}`, source_id: rel.sourceId, target_id: rel.targetId,
      kind: rel.kind, weight: rel.weight ?? 1,
      metadata: { ...(rel.metadata || {}), scanId },
      tenant_id: TENANT_ID,
    }, { onConflict: 'id' });
    if (!error) relsCreated++;
  }

  // ── Register agents in gov_repo (single source of truth) ──
  let agentsRegistered = 0;
  try {
    const userRows = await govQuery(`SELECT user_id FROM gov_repo.governance_users WHERE organisation_id = '${ORG_ID}' AND status = 'active' LIMIT 1`);
    const ownerId: string | undefined = userRows[0]?.user_id;
    if (!ownerId) throw new Error('Nenhum governance user ativo na organização');
    const TYPE_MAP: Record<string, string> = { ai_persona: 'assistive', service: 'assistive', pipeline: 'orchestrator', custom: 'assistive' };
    const VALID_OVERSIGHT = new Set(['l1_automated', 'l2_human_review', 'l3_human_approval', 'l4_human_in_loop']);
    const esc = (s: string) => s.replace(/'/g, "''").slice(0, 250);
    const cryptoMod = await import('crypto');
    for (const a of result.source.agents) {
      const agentCode = 'SC-' + cryptoMod.createHash('sha1').update(a.name).digest('hex').slice(0, 10).toUpperCase();
      const agentType = a.isAutonomous ? 'autonomous' : (TYPE_MAP[a.type] ?? 'assistive');
      const riskLevel = ['low', 'medium', 'high', 'critical'].includes(a.riskLevel) ? a.riskLevel : 'medium';
      const oversight = a.oversightLevel && VALID_OVERSIGHT.has(a.oversightLevel) ? a.oversightLevel : 'l2_human_review';
      const extRefs = JSON.stringify({ discovery: { scanId, source: targetLabel, framework: a.framework ?? null, filePath: a.filePath ?? null, confidence: a.confidence ?? null } }).replace(/'/g, "''");
      const rows = await govDML(
        `INSERT INTO gov_repo.agents (agent_code, name, description, agent_type, risk_level, oversight_level, owner_user_id, status, external_refs, organisation_id, created_by)
         VALUES ('${agentCode}', '${esc(a.name)}', '${esc(`Discovered by CodeGuard scan of ${targetLabel}`)}', '${agentType}', '${riskLevel}', '${oversight}', '${ownerId}', 'pending_registration', '${extRefs}'::jsonb, '${ORG_ID}', '${ownerId}')
         ON CONFLICT (agent_code, organisation_id) DO NOTHING
         RETURNING agent_id`
      );
      if (Array.isArray(rows) && rows.length > 0) agentsRegistered++;
    }
  } catch (e) {
    console.warn('[ScanService] gov_repo registration skipped:', e instanceof Error ? e.message : e);
  }

  return {
    scanId, target: targetLabel, agents: agentCount, risks: riskCount, evidence: evidenceCount,
    certLevel: result.certification.overall, score: result.compliance.overallScore,
    regulations: regulationCount, compliantRegulations: compliantCount,
    entitiesCreated, relsCreated, agentsRegistered, drift,
  };
}

/** Returns all distinct scan targets known to the platform (for cron rescan). */
export async function getKnownTargets(tenantId?: string): Promise<string[]> {
  const TENANT_ID = tenantId ?? process.env.GRAPHOS_TENANT_ID ?? process.env.GRAPHOS_ORG_ID ?? DEFAULT_TENANT_ID;
  const supabase = getSupabase();
  const { data } = await supabase.from('graphos_entities')
    .select('attributes')
    .eq('kind', 'evidence')
    .filter('attributes->>type', 'eq', 'scan_session')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(200);
  const targets = new Set<string>();
  for (const row of (data ?? [])) {
    const t = (row.attributes as any)?.target;
    if (t) targets.add(t);
  }
  return Array.from(targets);
}
