import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
  return createClient(url, key);
}

function parseUrl(input: string): { type: 'github'; url: string } | null {
  const clean = input.trim().replace(/\.git$/, '').replace(/\/$/, '');
  // Accept any supported provider (GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, Forgejo)
  const m = clean.match(/(?:https?:\/\/)?(?:www\.)?(github\.com|gitlab\.com|bitbucket\.org|dev\.azure\.com|codeberg\.org|gitea\.com)(\/[\w./-]+\/[\w.-]+)/i);
  if (!m) return null;
  return { type: 'github', url: `https://${m[1]}${m[2]}` };
}

const DEFAULT_TENANT_ID = '52f41339-a838-4d8f-b041-f9b7bf1ff305';
const ORG_ID = process.env.GRAPHOS_ORG_ID ?? process.env.GRAPHOS_TENANT_ID ?? DEFAULT_TENANT_ID;
const TENANT_ID = process.env.GRAPHOS_TENANT_ID ?? ORG_ID;

const CF_MODULES = [
  { code: 'CF-000', name: 'Constitutional Core', question: 'Quem governa o prÃ³prio padrÃ£o?', kinds: ['regulation', 'certificate'], lens: 'constitutional' },
  { code: 'CF-001', name: 'Agent Governance Framework', question: 'Quantos agentes existem?', kinds: ['agent'], lens: 'ceo' },
  { code: 'CF-002', name: 'Agent Discovery Standard', question: 'Onde estÃ£o os agentes?', kinds: [], lens: 'ceo' },
  { code: 'CF-003', name: 'Governance As Code', question: 'Qual regra governa este agente?', kinds: ['control', 'policy'], lens: 'compliance' },
  { code: 'CF-004', name: 'Knowledge Graph Standard', question: 'Como tudo se conecta?', kinds: [], lens: 'ecosystem' },
  { code: 'CF-005', name: 'Governance Ledger Standard', question: 'O que aconteceu?', kinds: ['evidence'], lens: 'auditor' },
  { code: 'CF-006', name: 'Evidence & Verification Framework', question: 'Qual Ã© a prova?', kinds: ['evidence'], lens: 'auditor' },
  { code: 'CF-007', name: 'Risk Classification Framework', question: 'Qual Ã© o risco?', kinds: ['risk', 'incident'], lens: 'ciso' },
  { code: 'CF-008', name: 'Collective Governance Framework', question: 'Como mÃºltiplos agentes decidiram?', kinds: [], lens: 'board' },
  { code: 'CF-009', name: 'Decision Governance Framework', question: 'Quem decidiu?', kinds: ['decision'], lens: 'auditor' },
  { code: 'CF-010', name: 'Ownership Governance Framework', question: 'Quem responde?', kinds: ['owner'], lens: 'ceo' },
  { code: 'CF-011', name: 'Compliance Intelligence Framework', question: 'Qual regulamentaÃ§Ã£o impacta este agente?', kinds: ['regulation'], lens: 'compliance' },
  { code: 'CF-012', name: 'Certification Framework', question: 'Este agente pode ser certificado?', kinds: ['certificate'], lens: 'certification' },
];

const LENSES = [
  { id: 'ceo', name: 'CEO', question: 'Estamos seguros para escalar?', icon: 'ðŸ‘¤', color: '#0ECFB8' },
  { id: 'cfo', name: 'CFO', question: 'Quanto custa? Qual ROI?', icon: 'ðŸ’°', color: '#22C55E' },
  { id: 'ciso', name: 'CISO', question: 'Onde estÃ£o os riscos?', icon: 'ðŸ›¡ï¸', color: '#F87171' },
  { id: 'dpo', name: 'DPO', question: 'Temos exposiÃ§Ã£o LGPD/GDPR?', icon: 'ðŸ”’', color: '#A78BFA' },
  { id: 'compliance', name: 'Compliance', question: 'Estamos conformes?', icon: 'âœ“', color: '#FACC15' },
  { id: 'auditor', name: 'Auditor', question: 'Prove tudo.', icon: 'ðŸ”', color: '#5B50F0' },
  { id: 'board', name: 'Board', question: 'O que pode destruir a empresa?', icon: 'âš ï¸', color: '#F97316' },
  { id: 'constitutional', name: 'Constitutional', question: 'Estamos seguindo a ConstituiÃ§Ã£o?', icon: 'ðŸ“œ', color: '#0ECFB8' },
  { id: 'ecosystem', name: 'Ecosystem', question: 'Como tudo se conecta?', icon: 'ðŸ•¸ï¸', color: '#38BDF8' },
  { id: 'certification', name: 'Certification', question: 'Passamos na auditoria?', icon: 'ðŸ†', color: '#E879F9' },
];

const CF_KIND_MAP: Record<string, string> = {};
for (const cf of CF_MODULES) {
  for (const k of cf.kinds) CF_KIND_MAP[k] = cf.code;
}

function getCfForEntity(e: any): string {
  if (e.source_table) {
    const tableMap: Record<string, string> = {
      'agents': 'CF-001', 'agent_edges': 'CF-001', 'agent_embeddings': 'CF-001',
      'governance_ledger': 'CF-005', 'approval_decisions': 'CF-005', 'approval_requests': 'CF-005',
      'risk_entries': 'CF-007', 'risk_treatments': 'CF-007', 'agent_risk_propagation': 'CF-007',
      'evidence': 'CF-006', 'evidence_files': 'CF-006',
      'governance_policies': 'CF-003', 'policy_versions': 'CF-003', 'policy_mandate_mappings': 'CF-003',
      'control_assessments': 'CF-012', 'conformity_assessments': 'CF-012', 'control_findings': 'CF-012',
      'governance_users': 'CF-010', 'governance_roles': 'CF-010', 'mandates': 'CF-010', 'organisations': 'CF-010',
      'constitution_registry': 'CF-000', 'rfc_registry': 'CF-000', 'appeals': 'CF-000', 'council_decisions': 'CF-000', 'amendments': 'CF-000',
    };
    if (tableMap[e.source_table]) return tableMap[e.source_table];
  }
  return CF_KIND_MAP[e.kind] ?? '';
}

function getCfModules(entities: any[]) {
  return CF_MODULES.map(cf => {
    const matchingEntities = entities.filter(e => getCfForEntity(e) === cf.code);
    return { ...cf, totalRecords: matchingEntities.length };
  });
}

export async function GET(req: NextRequest) {
  try {
    const { resolveTenant } = await import('@/lib/tenant');
    const { tenantId } = resolveTenant(req);
    const supabase = getSupabase();
    const { data: entities } = await supabase.from('graphos_entities').select('*').eq('tenant_id', tenantId).order('kind', { ascending: true });
    const { data: relationships } = await supabase.from('graphos_relationships').select('*').eq('tenant_id', tenantId);

    const nodes = (entities ?? []).map((e: any) => {
      const attrs = e.attributes ?? {};
      const riskLevel = attrs.riskLevel ?? 'unknown';
      return {
        id: e.id, kind: e.kind, label: e.label, description: e.description,
        riskLevel, attributes: attrs,
        aiActRiskClass: attrs.aiActRiskClass ?? null,
        businessDomain: attrs.businessDomain ?? null,
        status: attrs.status ?? null,
        agentType: attrs.agentType ?? null,
        color: e.kind === 'agent' ? (riskLevel === 'critical' ? '#F87171' : riskLevel === 'high' ? '#F97316' : riskLevel === 'medium' ? '#FACC15' : '#22C55E') :
               e.kind === 'risk' ? '#F87171' : e.kind === 'evidence' ? '#0ECFB8' : '#5B50F0',
        size: e.kind === 'agent' ? 20 : e.kind === 'risk' ? 14 : 10,
        sourceTable: e.source_table ?? null,
        cfModule: getCfForEntity(e),
      };
    });

    const edges = (relationships ?? []).map((r: any) => ({
      id: r.id, source: r.source_id, target: r.target_id,
      kind: r.kind, weight: r.weight ?? 1, metadata: r.metadata ?? {},
    }));

    const byKind: Record<string, number> = {};
    for (const n of nodes) byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;

    const riskCounts: Record<string, number> = {};
    for (const n of nodes) {
      if (n.kind === 'agent') {
        const rl = !n.riskLevel || n.riskLevel === 'unknown' ? 'safe' : n.riskLevel;
        riskCounts[rl] = (riskCounts[rl] ?? 0) + 1;
      }
    }
    const safeCount = riskCounts['safe'] ?? 0;
    const lowCount = riskCounts['low'] ?? 0;
    const mediumCount = riskCounts['medium'] ?? 0;
    const highCountRisk = riskCounts['high'] ?? 0;
    const criticalCountRisk = riskCounts['critical'] ?? 0;
    const totalAgents = safeCount + lowCount + mediumCount + highCountRisk + criticalCountRisk;
    const universalComplianceScore = totalAgents > 0
      ? Math.round((safeCount * 100 + lowCount * 75 + mediumCount * 50 + highCountRisk * 25 + criticalCountRisk * 0) / totalAgents)
      : 0;

    const cfModules = getCfModules(entities ?? []);

    const lensSummaries = LENSES.map(lens => {
      const cfIds = cfModules.filter((m: any) => m.lens === lens.id).map((m: any) => m.code);
      const totalRecs = cfModules.filter((m: any) => m.lens === lens.id).reduce((s: number, m: any) => s + m.totalRecords, 0);
      return { id: lens.id, name: lens.name, question: lens.question, color: lens.color, cfCount: cfIds.length, totalRecords: totalRecs };
    });

    return NextResponse.json({
      ok: true,
      data: {
        nodes, edges,
        cfModules,
        lenses: LENSES,
        lensSummaries,
        summary: {
          totalEntities: nodes.length, totalRelationships: edges.length,
          agents: byKind['agent'] ?? 0, risks: byKind['risk'] ?? 0,
          evidence: byKind['evidence'] ?? 0,
          criticalAgents: nodes.filter(n => n.riskLevel === 'critical' && n.kind === 'agent').length, highRiskItems: nodes.filter(n => n.riskLevel === 'high').length,
          universalComplianceScore: `${universalComplianceScore}/100`,
          totalRiskExposure: nodes.filter(n => n.riskLevel === 'critical').length * 25 + nodes.filter(n => n.riskLevel === 'high').length * 15,
          cfModulesCount: cfModules.length,
          totalCfRecords: cfModules.reduce((s: number, m: any) => s + m.totalRecords, 0),
        },
      },
      meta: { totalEntities: nodes.length, relationshipsCount: edges.length, backend: 'supabase' },
    });
  } catch (err) {
    console.error('[V1 Graph] Error:', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

const EDGE_KIND_MAP: Record<string, string> = {
  CALLS_AGENT: 'DEPENDS_ON', DELEGATES_TO: 'DEPENDS_ON', SUPERVISES: 'MONITORS',
  DEPENDS_ON: 'DEPENDS_ON', ESCALATES_TO: 'DEPENDS_ON', ORCHESTRATES: 'DEPENDS_ON',
  FALLBACK_TO: 'DEPENDS_ON', PEER_COORDINATES: 'DEPENDS_ON',
};

async function govQuery(sql: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('gov_exec', { sql });
  if (error) throw new Error(`gov_exec: ${error.message}`);
  return data ?? [];
}

async function govDML(sql: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('gov_exec_dml', { sql });
  if (error) throw new Error(`gov_exec_dml: ${error.message}`);
  return data ?? [];
}

async function rebuildGraphos() {
  const agents = await govQuery(`SELECT agent_id, agent_code, name, description, agent_type, risk_level, status, ai_act_risk_class, oversight_level, business_domain, deployment_env, owner_user_id FROM gov_repo.agents WHERE organisation_id = '${ORG_ID}'`);
  const ledger = await govQuery(`SELECT entry_id, event_type, event_description, subject_type, subject_id, actor_user_id, event_timestamp, payload FROM gov_repo.governance_ledger WHERE organisation_id = '${ORG_ID}' LIMIT 500`);
  const risks = await govQuery(`SELECT risk_id, risk_code, title, description, risk_category, likelihood, impact, residual_risk_score, status, owner_user_id, related_agent_ids FROM gov_repo.risk_entries LIMIT 500`);

  // Don't delete â€” scan data lives in graphos_entities. Rebuild only upserts gov_repo data on top.

  let entitiesCreated = 0, relationshipsCreated = 0;

  const supabase = getSupabase();
  for (const a of agents) {
    const { error } = await supabase.from('graphos_entities').upsert({
      id: `agent-${a.agent_code}`, kind: 'agent', label: a.name ?? a.agent_code,
      description: a.description ?? '', source_table: 'agents',
      attributes: { agentId: a.agent_id, agentCode: a.agent_code, agentType: a.agent_type, riskLevel: a.risk_level, status: a.status, aiActRiskClass: a.ai_act_risk_class, oversightLevel: a.oversight_level, businessDomain: a.business_domain, deploymentEnv: a.deployment_env, ownerUserId: a.owner_user_id },
      tenant_id: TENANT_ID,
    }, { onConflict: 'id' });
    if (!error) entitiesCreated++;
  }

  for (const entry of ledger) {
    const label = `${entry.event_type}: ${entry.subject_type} ${entry.subject_id ?? ''}`.substring(0, 100);
    await supabase.from('graphos_entities').upsert({
      id: `ledger-${entry.entry_id}`, kind: 'evidence', label, description: entry.event_description ?? '', source_table: 'governance_ledger',
      attributes: { entryId: entry.entry_id, eventType: entry.event_type, subjectType: entry.subject_type, subjectId: entry.subject_id, actorUserId: entry.actor_user_id, eventTimestamp: entry.event_timestamp },
      tenant_id: TENANT_ID,
    }, { onConflict: 'id' }).then(r => { if (!r.error) entitiesCreated++; });
    if (entry.subject_type === 'agent' && entry.subject_id) {
      const agent = agents.find((a: any) => a.agent_id === entry.subject_id);
      if (agent) await supabase.from('graphos_relationships').upsert({
        id: `rel-evidence-${entry.entry_id}-${agent.agent_code}`, kind: 'EVIDENCED_BY',
        source_id: `agent-${agent.agent_code}`, target_id: `ledger-${entry.entry_id}`,
        weight: Math.max(1, Math.min(10, (entry.event_description?.length || 50) / 50)), metadata: {}, tenant_id: TENANT_ID,
      }, { onConflict: 'id' }).then(r => { if (!r.error) relationshipsCreated++; });
    }
  }

  for (const risk of risks) {
    await supabase.from('graphos_entities').upsert({
      id: `risk-${risk.risk_id}`, kind: 'risk', label: risk.title ?? risk.risk_code ?? risk.risk_id, source_table: 'risk_entries',
      description: risk.description ?? '',
      attributes: { riskId: risk.risk_id, riskCode: risk.risk_code, category: risk.risk_category, likelihood: risk.likelihood, impact: risk.impact, residualScore: risk.residual_risk_score, status: risk.status },
      tenant_id: TENANT_ID,
    }, { onConflict: 'id' }).then(r => { if (!r.error) entitiesCreated++; });
    const relAgentIds: string[] = risk.related_agent_ids ?? [];
    for (const agentId of relAgentIds) {
      const agent = agents.find((a: any) => a.agent_id === agentId);
      if (agent) await supabase.from('graphos_relationships').upsert({
        id: `rel-risk-${risk.risk_id}-${agent.agent_code}`, kind: 'IMPACTS_RISK',
        source_id: `agent-${agent.agent_code}`, target_id: `risk-${risk.risk_id}`,
        weight: risk.residual_risk_score ? Math.max(1, Math.min(10, risk.residual_risk_score / 10)) : 5, metadata: {}, tenant_id: TENANT_ID,
      }, { onConflict: 'id' }).then(r => { if (!r.error) relationshipsCreated++; });
    }
  }

  const edges = await govQuery(`SELECT edge_id, source_agent_id, target_agent_id, relationship_type, weight, is_active FROM gov_repo.agent_edges LIMIT 1000`);
  for (const edge of edges) {
    if (!edge.is_active) continue;
    const srcAgent = agents.find((a: any) => a.agent_id === edge.source_agent_id);
    const tgtAgent = agents.find((a: any) => a.agent_id === edge.target_agent_id);
    if (srcAgent && tgtAgent) await supabase.from('graphos_relationships').upsert({
      id: `rel-agent-${edge.edge_id}`, kind: EDGE_KIND_MAP[edge.relationship_type] ?? 'DEPENDS_ON',
      source_id: `agent-${srcAgent.agent_code}`, target_id: `agent-${tgtAgent.agent_code}`,
      weight: Math.round((edge.weight ?? 0.5) * 100),
      metadata: { edgeId: edge.edge_id, weight: edge.weight, relationshipType: edge.relationship_type },
      tenant_id: TENANT_ID,
    }, { onConflict: 'id' }).then(r => { if (!r.error) relationshipsCreated++; });
  }

  return { entitiesCreated, relationshipsCreated, agentCount: agents.length, ledgerCount: ledger.length, riskCount: risks.length, edgeCount: edges.length };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'rebuild';
    if (action === 'rebuild') {
      const result = await rebuildGraphos();
      return NextResponse.json({ ok: true, message: `GraphOS rebuilt: ${result.entitiesCreated} entities, ${result.relationshipsCreated} relationships`, data: result });
    }
    if (action === 'scan') {
      const { runScan } = await import('@/services/scan-service');
      const { resolveTenant } = await import('@/lib/tenant');
      const { orgId, tenantId } = resolveTenant(req);
      try {
        const outcome = await runScan(body.url || body.path || '', { trigger: 'manual', orgId, tenantId });
        return NextResponse.json({
          ok: true,
          message: `Scan concluido: ${outcome.agents} agentes, ${outcome.risks} riscos, ${outcome.compliantRegulations}/${outcome.regulations} regulamentacoes conformes`,
          data: outcome,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Scan failed';
        const status = msg.includes('URL inválida') ? 400 : 500;
        return NextResponse.json({ ok: false, error: msg }, { status });
      }
    }
    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

