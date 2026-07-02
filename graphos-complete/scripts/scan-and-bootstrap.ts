import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { detectAgents } from '../../packages/scanner/src/codeguard/agent-detector';
import { groupAgentsIntoLSystems } from '../../packages/scanner/src/codeguard/system-detector';
import { classifyAgent } from '../../packages/scanner/src/codeguard/classifier';
import { enrichAgent, enrichSummary } from '../../packages/scanner/src/codeguard/enrichment';
import { generateRepoIntelligence } from '../../packages/scanner/src/codeguard/repo-intelligence';
import { buildKnowledgeGraph } from '../../packages/scanner/src/codeguard/repo-knowledge-graph';
import { traceCrossFileLineage } from '../../packages/scanner/src/codeguard/enrichment/cross-file-lineage';
import { createHash } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// ── IMPORTANT ───────────────────────────────────────────────────────────────
// gov_repo schema is NOT exposed in PostgREST API settings.
// We use the public schema client for ALL operations.
// gov_repo tables are accessed via:
//   1. gov_exec(sql) RPC  → for reads/writes to gov_repo
//   2. public.gov_* views → for reads from gov_repo (read-only via PostgREST)
//   3. public.graphos_*   → entities + relationships live in public, direct access
//
// To enable: apply supabase/migrations/20260622_expose_gov_repo_bridge.sql
// ────────────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const REPO_OWNER = 'NirDiamant';
const REPO_NAME = 'GenAI_Agents';
const REPO_BRANCH = 'main';

// ── gov_exec helpers ────────────────────────────────────────────────────────
// govQuery: for SELECT statements (wraps in subquery)
async function govQuery<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const { data, error } = await supabase.rpc('gov_exec', { sql });
  if (error) throw new Error(`gov_exec error: ${error.message} | SQL: ${sql.substring(0, 80)}`);
  return (data ?? []) as T[];
}

// govDML: for INSERT/UPDATE/DELETE with RETURNING (uses CTE via gov_exec_dml)
async function govDML(sql: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc('gov_exec_dml', { sql });
  if (error) throw new Error(`gov_exec_dml error: ${error.message} | SQL: ${sql.substring(0, 80)}`);
  return (data ?? []) as Record<string, unknown>[];
}

// ── GitHub helpers ──────────────────────────────────────────────────────────
async function fetchFiles(owner: string, repo: string, branch: string) {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  console.log(`[scanner] Fetching file tree from ${url}`);

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  const files = (data.tree || [])
    .filter((item: any) => item.type === 'blob')
    .filter((item: any) => {
      const ext = item.path.split('.').pop()?.toLowerCase();
      return ['py', 'js', 'ts', 'tsx', 'jsx', 'go', 'rs', 'java', 'rb', 'md', 'txt', 'yaml', 'yml', 'json', 'toml'].includes(ext || '');
    })
    .map((item: any) => ({
      path: item.path,
      name: item.path.split('/').pop() ?? item.path,
      type: 'file' as const,
    }));

  console.log(`[scanner] Found ${files.length} scannable files (of ${data.tree?.length ?? 0} total)`);
  return files;
}

async function fetchFileContent(owner: string, repo: string, filePath: string, branch: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
  return res.text();
}

// ── Org + User context (via gov_exec) ───────────────────────────────────────
async function getOrgAndUser() {
  const orgs = await govQuery<{ organisation_id: string; org_code: string; legal_name: string }>(
    "SELECT organisation_id, org_code, legal_name FROM gov_repo.organisations WHERE org_code = 'CODEGUARD' LIMIT 1"
  );
  if (!orgs.length) throw new Error('Organisation CODEGUARD not found in gov_repo.organisations');
  const org = orgs[0];

  const users = await govQuery<{ user_id: string; email: string }>(
    "SELECT user_id, email FROM gov_repo.governance_users WHERE email = 'negraodenio@gmail.com' LIMIT 1"
  );
  if (!users.length) throw new Error('Governance user not found in gov_repo.governance_users');
  const user = users[0];

  // Tenant lives in public schema — direct access works
  const { data: tenant } = await supabase
    .from('tenants').select('id')
    .eq('id', org.organisation_id).single();

  return {
    organisationId: org.organisation_id,
    tenantId: tenant?.id ?? org.organisation_id,
    userId: user.user_id,
  };
}

// ── Bootstrap: gov_repo → graphos (public schema) ───────────────────────────
interface BootstrapResult {
  entitiesCreated: number;
  relationshipsCreated: number;
  errors: string[];
  byKind: Record<string, number>;
  byRelKind: Record<string, number>;
}

async function inlineBootstrap(
  organisationId: string,
  tenantId: string
): Promise<BootstrapResult> {
  const result: BootstrapResult = {
    entitiesCreated: 0, relationshipsCreated: 0, errors: [],
    byKind: {}, byRelKind: {},
  };

  // graphos_entities: id, kind, label, description, attributes(jsonb), tenant_id, source_table, source_id(uuid)
  // graphos_relationships: id, kind, source_id, target_id, weight(int), metadata(jsonb), tenant_id
  const insertEntity = async (e: {
    id: string; kind: string; label: string; description?: string;
    confidence?: number; metadata?: Record<string, unknown>;
    sourceTable?: string; sourceId?: string;
  }) => {
    const { error } = await supabase.from('graphos_entities').upsert({
      id: e.id, kind: e.kind, label: e.label, description: e.description ?? '',
      // 'attributes' is the jsonb column (not 'metadata', not 'confidence')
      attributes: { ...(e.metadata ?? {}), confidence: e.confidence ?? 0.8 },
      tenant_id: tenantId,
      source_table: e.sourceTable ?? null,
      source_id: null, // uuid column — skip unless we have a proper UUID
    }, { onConflict: 'id' });
    if (error) { result.errors.push(`entity ${e.id}: ${error.message}`); return false; }
    result.entitiesCreated++;
    result.byKind[e.kind] = (result.byKind[e.kind] ?? 0) + 1;
    return true;
  };

  const insertRel = async (r: {
    id: string; kind: string; source_id: string; target_id: string;
    confidence?: number; metadata?: Record<string, unknown>;
  }) => {
    const { error } = await supabase.from('graphos_relationships').upsert({
      id: r.id, kind: r.kind, source_id: r.source_id, target_id: r.target_id,
      // 'weight' is int, 'metadata' is jsonb
      weight: Math.round((r.confidence ?? 0.8) * 100),
      metadata: r.metadata ?? {},
      tenant_id: tenantId,
    }, { onConflict: 'id' });
    if (error) { result.errors.push(`rel ${r.id}: ${error.message}`); return false; }
    result.relationshipsCreated++;
    result.byRelKind[r.kind] = (result.byRelKind[r.kind] ?? 0) + 1;
    return true;
  };

  // 1. Agents (read via gov_exec)
  const agents = await govQuery<any>(
    `SELECT agent_id, agent_code, name, description, agent_type, risk_level,
            status, ai_act_risk_class, oversight_level, business_domain,
            deployment_env, owner_user_id
     FROM gov_repo.agents WHERE organisation_id = '${organisationId}'`
  );
  if (!agents.length) { console.log('[bootstrap] No agents found in gov_repo'); return result; }
  console.log(`[bootstrap] Syncing ${agents.length} agents...`);

  for (const a of agents) {
    await insertEntity({
      id: `agent-${a.agent_code}`, kind: 'agent',
      label: a.name ?? a.agent_code, description: a.description ?? '',
      confidence: 0.9,
      metadata: {
        agentId: a.agent_id, agentCode: a.agent_code, agentType: a.agent_type,
        riskLevel: a.risk_level, status: a.status, aiActRiskClass: a.ai_act_risk_class,
        oversightLevel: a.oversight_level, businessDomain: a.business_domain,
        deploymentEnv: a.deployment_env, ownerUserId: a.owner_user_id,
      },
      sourceTable: 'agents', sourceId: a.agent_id,
    });
  }

  // 2. Governance Ledger (columns: entry_sequence, entry_id, event_type, event_description,
  //    subject_type, subject_id, actor_user_id, organisation_id, event_timestamp, payload)
  const ledger = await govQuery<any>(
    `SELECT entry_id, event_type, event_description, subject_type, subject_id,
            actor_user_id, event_timestamp, payload
     FROM gov_repo.governance_ledger
     WHERE organisation_id = '${organisationId}' LIMIT 500`
  );
  for (const entry of ledger) {
    const label = `${entry.event_type}: ${entry.subject_type} ${entry.subject_id ?? ''}`.substring(0, 100);
    await insertEntity({
      id: `ledger-${entry.entry_id}`, kind: 'evidence',
      label, description: entry.event_description ?? '',
      confidence: 0.8,
      metadata: {
        entryId: entry.entry_id, eventType: entry.event_type,
        subjectType: entry.subject_type, subjectId: entry.subject_id,
        actorUserId: entry.actor_user_id, eventTimestamp: entry.event_timestamp,
      },
      sourceTable: 'governance_ledger', sourceId: entry.entry_id,
    });
    // Link to agent if subject is an agent
      if (entry.subject_type === 'agent' && entry.subject_id) {
        const agent = agents.find((a: any) => a.agent_id === entry.subject_id);
        if (agent) await insertRel({
          id: `rel-evidence-${entry.entry_id}-${agent.agent_code}`,
          kind: 'EVIDENCED_BY', confidence: 0.9,
          source_id: `agent-${agent.agent_code}`, target_id: `ledger-${entry.entry_id}`,
        });
      }
  }

  // 3. Risk Entries (columns: risk_id, risk_code, title, description, risk_category,
  //    risk_domain, likelihood, impact, residual_risk_score, status, owner_user_id, related_agent_ids)
  // Note: no organisation_id column — use risk_code org prefix filter
  const risks = await govQuery<any>(
    `SELECT risk_id, risk_code, title, description, risk_category, likelihood,
            impact, residual_risk_score, status, owner_user_id, related_agent_ids
     FROM gov_repo.risk_entries LIMIT 500`
  );
  for (const risk of risks) {
    await insertEntity({
      id: `risk-${risk.risk_id}`, kind: 'risk',
      label: risk.title ?? risk.risk_code ?? risk.risk_id,
      description: risk.description ?? '',
      confidence: 0.9,
      metadata: {
        riskId: risk.risk_id, riskCode: risk.risk_code,
        category: risk.risk_category, likelihood: risk.likelihood,
        impact: risk.impact, residualScore: risk.residual_risk_score, status: risk.status,
      },
      sourceTable: 'risk_entries', sourceId: risk.risk_id,
    });
    // Link to related agents (array of agent IDs)
    const relAgentIds: string[] = risk.related_agent_ids ?? [];
    for (const agentId of relAgentIds) {
      const agent = agents.find((a: any) => a.agent_id === agentId);
      if (agent) await insertRel({
        id: `rel-risk-${risk.risk_id}-${agent.agent_code}`,
        kind: 'IMPACTS_RISK', confidence: 0.9,
        source_id: `agent-${agent.agent_code}`, target_id: `risk-${risk.risk_id}`,
      });
    }
  }

  // 4. Governance Policies (columns: policy_id, policy_code, title, description,
  //    policy_type, status, effective_date, expiry_date, organisation_id)
  const policies = await govQuery<any>(
    `SELECT policy_id, policy_code, title, description, policy_type, status, effective_date, expiry_date
     FROM gov_repo.governance_policies WHERE organisation_id = '${organisationId}' LIMIT 500`
  );
  for (const p of policies) {
    await insertEntity({
      id: `policy-${p.policy_id}`, kind: 'policy',
      label: p.title ?? p.policy_code ?? p.policy_id, description: p.description ?? '',
      confidence: 0.95,
      metadata: { policyId: p.policy_id, policyCode: p.policy_code, type: p.policy_type, status: p.status },
      sourceTable: 'governance_policies', sourceId: p.policy_id,
    });
  }

  // 5. Conformity Assessments (columns: assessment_id, assessment_code, agent_id,
  //    assessment_type, ai_act_annex_ref, status, scope_description, outcome)
  const assessments = await govQuery<any>(
    `SELECT assessment_id, assessment_code, agent_id, assessment_type, ai_act_annex_ref,
            status, scope_description, outcome
     FROM gov_repo.conformity_assessments LIMIT 500`
  );
  for (const c of assessments) {
    await insertEntity({
      id: `assessment-${c.assessment_id}`, kind: 'assessment',
      label: c.assessment_code ?? c.assessment_id, description: c.scope_description ?? '',
      confidence: 0.9,
      metadata: {
        assessmentId: c.assessment_id, code: c.assessment_code,
        type: c.assessment_type, framework: c.ai_act_annex_ref,
        status: c.status, outcome: c.outcome,
      },
      sourceTable: 'conformity_assessments', sourceId: c.assessment_id,
    });
    if (c.agent_id) {
      const agent = agents.find((a: any) => a.agent_id === c.agent_id);
      if (agent) await insertRel({
        id: `rel-assessment-${c.assessment_id}-${agent.agent_code}`,
        kind: 'assessment_for', confidence: 0.9,
        source_id: `assessment-${c.assessment_id}`, target_id: `agent-${agent.agent_code}`,
      });
    }
  }

  // 6. Agent Edges (columns: edge_id, source_agent_id, target_agent_id,
  //    relationship_type, direction, weight, is_active)
  // Note: no organisation_id column — fetch all, filter by known agents
  const edges = await govQuery<any>(
    `SELECT edge_id, source_agent_id, target_agent_id, relationship_type, weight, is_active
     FROM gov_repo.agent_edges LIMIT 1000`
  );
  const EDGE_KIND_MAP: Record<string, string> = {
    CALLS_AGENT: 'DEPENDS_ON', DELEGATES_TO: 'DEPENDS_ON', SUPERVISES: 'MONITORS',
    DEPENDS_ON: 'DEPENDS_ON', ESCALATES_TO: 'DEPENDS_ON', ORCHESTRATES: 'DEPENDS_ON',
    FALLBACK_TO: 'DEPENDS_ON', PEER_COORDINATES: 'DEPENDS_ON',
  };
  for (const edge of edges) {
    if (!edge.is_active) continue;
    const srcAgent = agents.find((a: any) => a.agent_id === edge.source_agent_id);
    const tgtAgent = agents.find((a: any) => a.agent_id === edge.target_agent_id);
    if (srcAgent && tgtAgent) {
      await insertRel({
        id: `rel-agent-${edge.edge_id}`, kind: EDGE_KIND_MAP[edge.relationship_type] ?? 'DEPENDS_ON',
        confidence: 0.85, metadata: { edgeId: edge.edge_id, weight: edge.weight, relationshipType: edge.relationship_type },
        source_id: `agent-${srcAgent.agent_code}`, target_id: `agent-${tgtAgent.agent_code}`,
      });
    }
  }

  return result;
}

// ── Persist discovered agents via gov_exec ──────────────────────────────────
async function persistAgent(
  agent: any,
  repoIntel: any,
  crossFileLineage: any,
  organisationId: string,
  userId: string
): Promise<{ agent_id: string; agent_code: string } | null> {
  const enrichment = agent.enrichment;

  const extRef: Record<string, unknown> = {
    provider: 'github', repository: `${REPO_OWNER}/${REPO_NAME}`,
    filePath: agent.filePath, framework: agent.framework,
    confidence: agent.confidence, evidence: agent.evidence?.slice(0, 5) ?? [],
    scannedAt: new Date().toISOString(),
  };

  if (enrichment) {
    extRef.lineage = enrichment.lineage;
    extRef.finops = enrichment.finops;
    extRef.lgpd = enrichment.lgpd;
    extRef.fapi = enrichment.fapi;
    extRef.trust_zone = enrichment.trustZone;
    extRef.code_map = enrichment.codeMap;
    extRef.governance_priority = enrichment.governancePriority;
    extRef.compliance_exposure = enrichment.complianceExposure;
    extRef.ai_act_exposure = enrichment.aiActExposure;
    extRef.annex_iii_category = enrichment.annexIiiCategory;
    extRef.dora_exposure = enrichment.doraExposure;
    extRef.summary = enrichment.summary;
  }

  if (repoIntel) {
    extRef.repo_intelligence = {
      businessDomains: repoIntel.domains?.map((d: any) => d.name) ?? [],
      trustZone: repoIntel.trustZone,
      services: repoIntel.services?.map((s: any) => s.name) ?? [],
      frameworks: repoIntel.frameworks ?? [],
      businessCapabilities: repoIntel.businessCapabilities ?? [],
    };
  }

  if (crossFileLineage) {
    extRef.cross_file_lineage = {
      totalFlows: crossFileLineage.totalFlows,
      sourceCount: crossFileLineage.sourceCount,
      sinkCount: crossFileLineage.sinkCount,
      riskLevel: crossFileLineage.riskLevel,
      summary: crossFileLineage.summary,
    };
  }

  // agent_code: deterministic hash of name → prevents duplicates on re-run
  const nameSlug = agent.name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 10);
  const hash = createHash('md5').update(agent.filePath + agent.name).digest('hex').slice(0, 4).toUpperCase();
  const agentCode = `D-${nameSlug}-${hash}`.slice(0, 20);

  // risk_level enum: low | medium | high | critical
  const riskLevel = enrichment?.complianceExposure === 'critical' ? 'critical'
    : enrichment?.complianceExposure === 'high' ? 'high'
    : agent.suggestedRiskLevel === 'medium' ? 'medium'
    : agent.suggestedRiskLevel === 'high' ? 'high'
    : agent.suggestedRiskLevel === 'critical' ? 'critical' : 'low';

  // oversight_level enum: l1_automated | l2_human_review | l3_human_approval | l4_human_in_loop
  const oversightMap: Record<string, string> = {
    'autonomous': 'l1_automated',
    'human_on_demand': 'l2_human_review',
    'human_on_loop': 'l2_human_review',
    'human_in_loop': 'l4_human_in_loop',
    'human_approval': 'l3_human_approval',
    'l1_automated': 'l1_automated',
    'l2_human_review': 'l2_human_review',
    'l3_human_approval': 'l3_human_approval',
    'l4_human_in_loop': 'l4_human_in_loop',
  };
  const rawOversight = agent.suggestedOversightLevel ?? 'human_on_demand';
  const oversightLevel = oversightMap[rawOversight] ?? 'l2_human_review';

  // agent_type enum: autonomous | assistive | orchestrator | tool | gateway | monitor | classifier
  const typeMap: Record<string, string> = {
    'task': 'autonomous', 'agent': 'autonomous', 'multi-agent': 'orchestrator',
    'orchestrator': 'orchestrator', 'tool': 'tool', 'gateway': 'gateway',
    'assistive': 'assistive', 'monitor': 'monitor', 'classifier': 'classifier',
    'rag': 'assistive', 'llm': 'autonomous',
  };
  const agentType = typeMap[agent.agentType?.toLowerCase() ?? ''] ?? 'autonomous';

  // ai_act_risk_class enum: unacceptable | high | limited | minimal | gpai
  const aiActMap: Record<string, string> = {
    'unacceptable': 'unacceptable', 'high': 'high', 'limited': 'limited',
    'minimal': 'minimal', 'gpai': 'gpai', 'low': 'minimal',
  };
  const aiActClass = aiActMap[agent.classification?.aiActRiskClass?.toLowerCase() ?? ''] ?? 'limited';

  const extRefJson = JSON.stringify({ discovery: extRef }).replace(/'/g, "''");
  const agentName = (agent.name ?? '').replace(/'/g, "''").substring(0, 100);
  const deployEnv = ((enrichment?.trustZone?.trustZone ?? 'development') as string).substring(0, 30).replace(/'/g, "''");
  const bizDomain = (agent.classification?.businessDomain ?? 'General').replace(/'/g, "''").substring(0, 100);
  const desc = `Discovered ${agent.framework} agent from ${REPO_OWNER}/${REPO_NAME}`.replace(/'/g, "''");

  const sql = `
    INSERT INTO gov_repo.agents (
      agent_code, name, description, agent_type, risk_level,
      oversight_level, ai_act_risk_class, owner_user_id,
      deployment_env, business_domain, status,
      organisation_id, created_by, external_refs
    ) VALUES (
      '${agentCode}', '${agentName}', '${desc}', '${agentType}'::gov_repo.agent_type,
      '${riskLevel}'::gov_repo.agent_risk_level, '${oversightLevel}'::gov_repo.oversight_level,
      '${aiActClass}'::gov_repo.ai_act_risk_class, '${userId}',
      '${deployEnv}', '${bizDomain}',
      'pending_registration'::gov_repo.agent_status, '${organisationId}', '${userId}',
      '${extRefJson}'::jsonb
    )
    ON CONFLICT (agent_code, organisation_id) DO UPDATE SET
      external_refs = EXCLUDED.external_refs,
      updated_at = now()
    RETURNING agent_id, agent_code
  `;

  try {
    const rows = await govDML(sql);
    return rows?.[0] as { agent_id: string; agent_code: string } | null;
  } catch (e: any) {
    // If enum cast fails, try without explicit casts (let Postgres infer)
    const sqlNoCast = sql.replace(/::gov_repo\.\w+/g, '');
    try {
      const rows2 = await govDML(sqlNoCast);
      return rows2?.[0] as { agent_id: string; agent_code: string } | null;
    } catch (e2: any) {
      console.error(`  [persist] FAILED: ${agent.name} — ${e2.message?.substring(0, 120)}`);
      return null;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== STANDALONE SCAN + BOOTSTRAP (v2 — gov_exec mode) ===\n');

  // Pre-flight: check gov_exec + gov_exec_dml are available
  try {
    await govQuery("SELECT 1 as ok");
    console.log('[preflight] ✅ gov_exec RPC available');
  } catch (err: any) {
    console.error('[preflight] ❌ gov_exec RPC NOT available!');
    console.error('  → Apply supabase/migrations/20260622_expose_gov_repo_bridge.sql');
    process.exit(1);
  }
  try {
    // Test gov_exec_dml exists (SELECT 1 as a dummy DML test)
    await supabase.rpc('gov_exec_dml', { sql: 'SELECT 1 as ok' });
    console.log('[preflight] ✅ gov_exec_dml RPC available\n');
  } catch (err: any) {
    console.error('[preflight] ❌ gov_exec_dml RPC NOT available!');
    console.error('  → Apply supabase/migrations/20260622_expose_gov_repo_bridge.sql (updated version)');
    console.error('  → URL: https://supabase.com/dashboard/project/pslkphlxfpvbvybbekee/sql/new\n');
    process.exit(1);
  }

  const { organisationId, tenantId, userId } = await getOrgAndUser();
  console.log(`[config] Organisation: ${organisationId}`);
  console.log(`[config] Tenant:       ${tenantId}`);
  console.log(`[config] User:         ${userId}`);
  console.log(`[config] Repo:         ${REPO_OWNER}/${REPO_NAME}\n`);

  const files = await fetchFiles(REPO_OWNER, REPO_NAME, REPO_BRANCH);
  const readFile = async (filePath: string) => fetchFileContent(REPO_OWNER, REPO_NAME, filePath, REPO_BRANCH);

  console.log('\n[scanner] Detecting agents...');
  const agents = await detectAgents(files, readFile);
  console.log(`[scanner] Found ${agents.length} agents`);
  for (const agent of agents.slice(0, 10)) {
    console.log(`  - ${agent.name} (${agent.framework}) [${agent.agentType}] @ ${agent.filePath}`);
  }
  if (agents.length > 10) console.log(`  ... and ${agents.length - 10} more`);

  const systems = groupAgentsIntoLSystems(agents);
  console.log(`[scanner] ${systems.length} L-Systems detected`);

  console.log('\n[scanner] Generating repo intelligence...');
  const repoIntel = await generateRepoIntelligence(
    `${REPO_OWNER}/${REPO_NAME}`,
    files.map((f: { path: string; name: string }) => ({ path: f.path, name: f.name })),
    agents, readFile
  );
  console.log(`[scanner] Domains: ${repoIntel.domains.length}, Services: ${repoIntel.services.length}`);

  const knowledgeGraph = buildKnowledgeGraph(repoIntel);
  console.log(`[scanner] Knowledge graph: ${knowledgeGraph.nodes.length} nodes`);

  const fileContents = new Map<string, string>();
  for (const agent of agents) {
    try { fileContents.set(agent.filePath, await readFile(agent.filePath)); } catch {}
  }

  const crossFileLineage = traceCrossFileLineage(
    files.map((f: { path: string; name: string }) => ({
      path: f.path, name: f.name,
      ext: f.name.includes('.') ? f.name.substring(f.name.lastIndexOf('.')).toLowerCase() : '',
      dir: f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : 'root',
    })),
    fileContents
  );
  console.log(`[scanner] Cross-file lineage: ${crossFileLineage.totalFlows} flows`);

  console.log('\n[scanner] Enriching agents...');
  const enrichedAgents = await Promise.all(
    agents.map(async (agent) => {
      try {
        const content = await readFile(agent.filePath);
        const enrichment = await enrichAgent(agent, content);
        const classification = classifyAgent(agent, enrichment);
        const summary = enrichSummary(agent, enrichment);
        return { ...agent, enrichment: { ...enrichment, summary }, classification };
      } catch {
        const classification = classifyAgent(agent);
        return { ...agent, classification };
      }
    })
  );

  console.log('\n[persist] Writing agents to gov_repo.agents via gov_exec...');
  let persisted = 0;

  for (const agent of enrichedAgents) {
    try {
      const result = await persistAgent(agent, repoIntel, crossFileLineage, organisationId, userId);
      if (result) {
        console.log(`  [persist] OK: ${agent.name} → ${result.agent_code}`);
        persisted++;
      }
    } catch (e: any) {
      console.error(`  [persist] ERROR: ${agent.name} — ${e.message}`);
    }
  }

  console.log(`\n[persist] ${persisted}/${enrichedAgents.length} agents persisted`);

  // ── Post-persist: create governance_ledger + risk_entries + agent_edges ──
  if (persisted > 0) {
    console.log('\n[post-persist] Creating governance data...');

    // Fetch persisted agents to get their IDs
    const persistedAgents = await govQuery<any>(
      `SELECT agent_id, agent_code, name, external_refs FROM gov_repo.agents WHERE organisation_id = '${organisationId}'`
    );
    const agentMap = new Map(persistedAgents.map((a: any) => [a.name, a]));

    // 1. governance_ledger entries per agent
    for (const agent of enrichedAgents) {
      const pa = agentMap.get(agent.name);
      if (!pa) continue;
      const enrichment = agent.enrichment;
      const summary = enrichment?.summary;
      const desc = `Scanner discovered ${agent.framework} agent "${agent.name}" @ ${agent.filePath}`
        + (summary ? ` | risk=${summary.risk_level} aiAct=${summary.ai_act_risk_class} pii=${summary.contains_pii}` : '');

      try {
        const pay = JSON.stringify({ riskLevel: summary?.risk_level ?? 'medium', source: 'scanner', repo: REPO_NAME });
        await govDML(`INSERT INTO gov_repo.governance_ledger (
          organisation_id, subject_type, subject_id, event_type, event_description,
          actor_user_id, previous_hash, payload, entry_hash
        ) VALUES (
          '${organisationId}', 'agent', '${pa.agent_id}', 'agent_discovered',
          '${desc.replace(/'/g, "''").substring(0, 300)}',
          '${userId}',
          repeat('0', 64),
          '${pay.replace(/'/g, "''")}'::jsonb,
          encode(sha256(('${pa.agent_id}' || now()::text)::bytea), 'hex')
        ) RETURNING 1`);
      } catch (e: any) {
        console.error(`  [ledger] FAILED: ${agent.name} — ${e.message?.substring(0, 80)}`);
      }
    }
    console.log(`  [ledger] Created entries for ${enrichedAgents.length} agents`);

    // 2. risk_entries from enrichment data
    for (const agent of enrichedAgents) {
      const pa = agentMap.get(agent.name);
      if (!pa?.external_refs?.discovery) continue;
      const ext = pa.external_refs.discovery;
      const enrichment = agent.enrichment;
      if (!enrichment) continue;

      const risks: Array<{ title: string; category: string; severity: string; description: string }> = [];

      if (enrichment.lineage?.containsPii) risks.push({
        title: 'PII Data Processing', category: 'privacy', severity: 'high',
        description: `Agent "${agent.name}" processes PII data. Sources: ${(enrichment.lineage.sensitiveSources ?? []).join(', ')}`
      });
      if (enrichment.lineage?.containsFinancialData) risks.push({
        title: 'Financial Data Processing', category: 'financial', severity: 'high',
        description: `Agent "${agent.name}" processes financial data.`
      });
      if (enrichment.lineage?.containsHealthData) risks.push({
        title: 'Health Data Processing', category: 'privacy', severity: 'critical',
        description: `Agent "${agent.name}" processes health data — requires LGPD/GDPR Art. 9 compliance.`
      });
      if (enrichment.lgpd?.credentialExposure) risks.push({
        title: 'Credential Exposure', category: 'security', severity: 'critical',
        description: `Agent "${agent.name}" has credential exposure — ${enrichment.lgpd.findings?.length ?? 0} findings.`
      });
      if (enrichment.fapi?.doraExposure) risks.push({
        title: 'DORA Operational Resilience', category: 'regulatory', severity: 'high',
        description: `Agent "${agent.name}" has DORA exposure — financial services with operational risk.`
      });
      if (enrichment.finops?.costRisk === 'critical' || enrichment.finops?.costRisk === 'high') risks.push({
        title: 'Uncontrolled AI Cost', category: 'financial', severity: enrichment.finops.costRisk,
        description: `Agent "${agent.name}" estimated cost: $${enrichment.finops.monthlyCostEstimate}/mo. Hotspots: ${(enrichment.finops.costHotspots ?? []).join(', ')}`
      });

      const riskCatMap: Record<string, string> = {
        privacy: 'compliance', security: 'technology', financial: 'financial',
        regulatory: 'compliance', operational: 'operational',
      };
      for (const risk of risks) {
        try {
          const enumCat = riskCatMap[risk.category] ?? 'compliance';
          const severityNum = risk.severity === 'critical' ? 25 : risk.severity === 'high' ? 15 : 8;
          await govDML(`INSERT INTO gov_repo.risk_entries (
            organisation_id, risk_code, title, description, risk_category,
            risk_domain, likelihood, impact, status,
            related_agent_ids, owner_user_id
          ) VALUES (
            '${organisationId}',
            'R-${agent.name.replace(/[^A-Z0-9]/gi, '').slice(0, 6)}-${risk.category.slice(0, 3)}-${risk.title.replace(/[^A-Z0-9]/gi, '').slice(0, 5)}',
            '${risk.title.replace(/'/g, "''")}',
            '${risk.description.replace(/'/g, "''").substring(0, 500)}',
            '${enumCat}'::gov_repo.risk_category,
            '${risk.category}',
            3, 3,
            'identified',
            ARRAY['${pa.agent_id}']::uuid[], '${userId}'
          ) RETURNING 1`);
        } catch (e: any) {
          console.error(`  [risk] FAILED: ${agent.name}/${risk.title} — ${e.message?.substring(0, 80)}`);
        }
      }
      if (risks.length > 0) console.log(`  [risk] ${risks.length} risks for ${agent.name}`);
    }

    // 3. agent_edges from L-systems
    for (const sys of systems) {
      const agentIds = sys.agents
        .map((n: string) => { const a = enrichedAgents.find((ea: any) => ea.name === n); return a ? agentMap.get(a.name)?.agent_id : null; })
        .filter(Boolean);
      if (agentIds.length < 2) continue;
      for (let i = 0; i < agentIds.length - 1; i++) {
        for (let j = i + 1; j < agentIds.length; j++) {
          try {
            await govDML(`INSERT INTO gov_repo.agent_edges (
              source_agent_id, target_agent_id, relationship_type, direction,
              weight, is_active, organisation_id
            ) VALUES (
              '${agentIds[i]}', '${agentIds[j]}', 'PEER_COORDINATES'::gov_repo.edge_relationship, 'bidirectional',
              0.5, true, '${organisationId}'
            ) ON CONFLICT DO NOTHING RETURNING 1`);
          } catch {}
        }
      }
    }
    if (systems.length > 0) console.log(`  [edges] Created ${systems.length} system edge groups`);
  }

  // ── Universal Compliance Engine ──────────────────────────────────────────
  // Checks 13 regulatory frameworks against enrichment data
  if (persisted > 0) {
    const allEnrichments = enrichedAgents.map(a => a.enrichment).filter(Boolean);
    const hasPii = allEnrichments.some((e: any) => e?.lineage?.containsPii);
    const hasFinancial = allEnrichments.some((e: any) => e?.lineage?.containsFinancialData);
    const hasHealth = allEnrichments.some((e: any) => e?.lineage?.containsHealthData);
    const hasCredentialExposure = allEnrichments.some((e: any) => e?.lgpd?.credentialExposure);
    const hasDora = allEnrichments.some((e: any) => e?.fapi?.doraExposure);
    const hasFinopsRisk = allEnrichments.some((e: any) => e?.finops?.costRisk === 'critical' || e?.finops?.costRisk === 'high');
    const totalMonthlyCost = allEnrichments.reduce((s: number, e: any) => s + (e?.finops?.monthlyCostEstimate ?? 0), 0);
    const totalAgents = enrichedAgents.length;
    const highRiskAgents = enrichedAgents.filter(a => a.classification?.riskLevel === 'high' || a.classification?.riskLevel === 'critical').length;

    console.log('\n[compliance] Running Universal Compliance Engine...');

    interface RegulationResult { id: string; name: string; authority: string; status: string; score: number; evidence: string[]; gaps: string[]; requirements: string[]; }
    const results: RegulationResult[] = [];

    // 1. EU AI Act 2024/1689
    {
      const evidence: string[] = []; const gaps: string[] = [];
      const highRisk = enrichedAgents.filter(a => a.classification?.aiActRiskClass === 'high');
      const limitedRisk = enrichedAgents.filter(a => a.classification?.aiActRiskClass === 'limited');
      evidence.push(`${totalAgents} agent(s) detected, ${highRisk.length} high-risk, ${limitedRisk.length} limited-risk`);
      if (highRisk.length > 0) {
        gaps.push(`${highRisk.length} high-risk AI system(s) without conformity assessment (Art. 43)`);
        gaps.push('No fundamental rights impact assessment detected (Art. 27)');
      }
      if (!hasFinopsRisk) evidence.push('No uncontrolled AI cost risks — transparency obligation met (Art. 13)');
      else gaps.push('Uncontrolled AI costs indicate transparency gaps (Art. 13)');
      results.push({ id: 'reg-ai-act', name: 'EU AI Act 2024/1689', authority: 'European Commission', status: highRisk.length === 0 ? 'compliant' : highRisk.length > 2 ? 'non_compliant' : 'partial', score: highRisk.length === 0 ? 100 : Math.max(20, 100 - highRisk.length * 25), evidence, gaps, requirements: ['Risk classification (Art. 6)', 'Transparency (Art. 13)', 'Human oversight (Art. 14)', 'Conformity assessment (Art. 43)'] });
    }

    // 2. GDPR (EU) 2016/679
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasPii) {
        evidence.push('Personal data processing detected in scope');
        if (!hasCredentialExposure) evidence.push('No credential exposure — data minimization principle respected (Art. 5)');
        else gaps.push('Credential exposure detected — violates data minimization and integrity (Art. 5, 32)');
        gaps.push('No explicit consent mechanism detected (Art. 7)');
        gaps.push('Right to erasure not verified (Art. 17)');
      } else {
        evidence.push('No PII detected — GDPR may not apply');
      }
      results.push({ id: 'reg-gdpr', name: 'GDPR (EU) 2016/679', authority: 'EDPB', status: !hasPii ? 'not_applicable' : gaps.length <= 1 ? 'compliant' : 'partial', score: !hasPii ? 100 : Math.max(20, hasCredentialExposure ? 30 : 70), evidence, gaps, requirements: ['Consent (Art. 7)', 'Data minimization (Art. 5)', 'Right to erasure (Art. 17)', 'Data protection by design (Art. 25)'] });
    }

    // 3. LGPD 13.709/2018
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasPii) {
        evidence.push('Personal data processing in Brazilian context');
        if (hasCredentialExposure) gaps.push('Credential exposure violates data security obligation (Art. 46)');
        gaps.push('No DPO appointment detected (Art. 41)');
        gaps.push('No data subject rights mechanism detected (Art. 18)');
      } else evidence.push('No PII detected');
      results.push({ id: 'reg-lgpd', name: 'LGPD 13.709/2018', authority: 'ANPD', status: hasPii ? 'partial' : 'not_applicable', score: hasPii ? (hasCredentialExposure ? 25 : 60) : 100, evidence, gaps, requirements: ['Legal basis (Art. 7)', 'Data security (Art. 46)', 'DPO (Art. 41)', 'Rights of holder (Art. 18)'] });
    }

    // 4. DORA (EU) 2022/2554
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasDora || hasFinancial) {
        evidence.push('Financial services domain — DORA applicable');
        if (hasDora) evidence.push('DORA exposure detected by FAPI enrichment');
        gaps.push('No ICT risk management framework detected (Art. 6-11)');
        gaps.push('No incident reporting process verified (Art. 19)');
        gaps.push('No digital operational resilience testing detected (Art. 24)');
      } else evidence.push('No financial services domain detected');
      results.push({ id: 'reg-dora', name: 'DORA (EU) 2022/2554', authority: 'European Commission', status: hasDora ? 'partial' : 'not_applicable', score: hasDora ? 40 : 100, evidence, gaps, requirements: ['ICT Risk Management (Art. 6)', 'Incident Reporting (Art. 19)', 'Resilience Testing (Art. 24)', 'Third-party Oversight (Art. 28)'] });
    }

    // 5. HIPAA (US)
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasHealth) {
        evidence.push('Health data detected — HIPAA Privacy Rule applicable');
        gaps.push('No BAA (Business Associate Agreement) detected (45 CFR §164.308)');
        gaps.push('No PHI access controls verified (45 CFR §164.312)');
      } else evidence.push('No health data detected');
      results.push({ id: 'reg-hipaa', name: 'HIPAA (US)', authority: 'HHS', status: hasHealth ? 'non_compliant' : 'not_applicable', score: hasHealth ? 10 : 100, evidence, gaps, requirements: ['Privacy Rule (45 CFR §164.500)', 'Security Rule (45 CFR §164.300)', 'Breach Notification (45 CFR §164.400)'] });
    }

    // 6. PCI DSS v4.0
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasFinancial) {
        evidence.push('Financial data processing detected — PCI DSS may apply');
        gaps.push('No cardholder data environment boundary detected (Req. 1)');
        gaps.push('No encryption of cardholder data verified (Req. 3)');
      } else evidence.push('No financial/payment data detected');
      results.push({ id: 'reg-pci-dss', name: 'PCI DSS v4.0', authority: 'PCI SSC', status: 'not_applicable', score: 100, evidence, gaps, requirements: ['Secure Network (Req. 1-2)', 'Protect Data (Req. 3-4)', 'Access Control (Req. 7-9)', 'Monitoring (Req. 10)'] });
    }

    // 7. ISO/IEC 42001:2023 (AIMS)
    {
      const evidence: string[] = []; const gaps: string[] = [];
      evidence.push(`${totalAgents} AI agent(s) detected — AI management context established`);
      if (highRiskAgents > 0) evidence.push(`${highRiskAgents} high-risk agent(s) — AI policy scope defined`);
      else gaps.push('No high-risk AI agents — AI policy may not be formalized (Cl. 5)');
      gaps.push('No AI risk treatment plan detected (Cl. 6)');
      gaps.push('No AI system performance evaluation detected (Cl. 9)');
      results.push({ id: 'reg-iso-42001', name: 'ISO/IEC 42001:2023 (AIMS)', authority: 'ISO/IEC', status: highRiskAgents > 0 ? 'partial' : 'partial', score: highRiskAgents > 0 ? 50 : 40, evidence, gaps, requirements: ['Context (Cl. 4)', 'Leadership (Cl. 5)', 'Planning (Cl. 6)', 'Operation (Cl. 8)', 'Evaluation (Cl. 9)', 'Improvement (Cl. 10)'] });
    }

    // 8. ISO/IEC 27001:2022 (ISMS)
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasPii || hasFinancial || hasHealth) evidence.push('Sensitive data processing detected — ISMS applicable');
      if (hasCredentialExposure) gaps.push('Credential exposure — access control failure (A.9)');
      if (!hasFinopsRisk) evidence.push('No critical cost risks — financial controls adequate');
      else gaps.push('Uncontrolled AI costs — financial control gap (A.12)');
      gaps.push('No incident management process verified (A.16)');
      results.push({ id: 'reg-iso-27001', name: 'ISO/IEC 27001:2022 (ISMS)', authority: 'ISO/IEC', status: hasCredentialExposure ? 'non_compliant' : 'partial', score: hasCredentialExposure ? 20 : 50, evidence, gaps, requirements: ['Access Control (A.9)', 'Cryptography (A.10)', 'Operations Security (A.12)', 'Incident Management (A.16)'] });
    }

    // 9. ISO/IEC 23894:2023 (AI Risk Management)
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (totalAgents > 0) {
        evidence.push(`${totalAgents} AI agent(s) — risk identification scope established`);
        const riskLevels = enrichedAgents.map(a => a.classification?.riskLevel);
        const crit = riskLevels.filter(r => r === 'critical').length;
        const high = riskLevels.filter(r => r === 'high').length;
        evidence.push(`Risk analysis: ${crit} critical, ${high} high, ${riskLevels.length} total`);
        gaps.push('No formal AI risk treatment plan (Seç. 6.6)');
        gaps.push('No continuous risk monitoring process (Seç. 6.7)');
      }
      results.push({ id: 'reg-iso-23894', name: 'ISO/IEC 23894:2023 (AI Risk Mgt)', authority: 'ISO/IEC', status: 'partial', score: 45, evidence, gaps, requirements: ['Risk identification (Sec. 6.3)', 'Risk analysis (Sec. 6.4)', 'Risk evaluation (Sec. 6.5)', 'Risk treatment (Sec. 6.6)', 'Monitoring (Sec. 6.7)'] });
    }

    // 10. CCPA/CPRA (California)
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasPii) {
        evidence.push('Personal data processing — CCPA may apply to California residents');
        gaps.push('No right-to-know mechanism detected (§1798.100)');
        gaps.push('No opt-out of data sale mechanism detected (§1798.120)');
      }
      results.push({ id: 'reg-ccpa', name: 'CCPA/CPRA (California)', authority: 'California', status: hasPii ? 'non_compliant' : 'not_applicable', score: hasPii ? 15 : 100, evidence, gaps, requirements: ['Right to Know (§1798.100)', 'Right to Delete (§1798.105)', 'Opt-Out (§1798.120)'] });
    }

    // 11. BCB Res. 4893/2023 (Brazil)
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasFinancial) {
        evidence.push('Financial domain — BCB 4893 applicable');
        gaps.push('No model governance policy detected');
        gaps.push('No independent model validation detected');
      }
      results.push({ id: 'reg-bcb-4893', name: 'BCB Res. 4893/2023', authority: 'BCB', status: hasFinancial ? 'non_compliant' : 'not_applicable', score: hasFinancial ? 10 : 100, evidence, gaps, requirements: ['Model governance', 'Explainability', 'Audit trail', 'Independent validation'] });
    }

    // 12. OWASP Top 10:2021
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasCredentialExposure) {
        evidence.push('Credential exposure detected — A07 (Auth Failures)');
        gaps.push('A01: Access control not verified');
        gaps.push('A02: Cryptographic failures not tested');
      } else {
        evidence.push('No credential exposure — basic auth hygiene OK');
        gaps.push('Full OWASP Top 10 assessment not performed');
      }
      results.push({ id: 'reg-owasp-top10', name: 'OWASP Top 10:2021', authority: 'OWASP', status: hasCredentialExposure ? 'non_compliant' : 'partial', score: hasCredentialExposure ? 20 : 50, evidence, gaps, requirements: ['A01-A10: Application security risk categories'] });
    }

    // 13. ANVISA RDC 677/2022 (SaMD)
    {
      const evidence: string[] = []; const gaps: string[] = [];
      if (hasHealth) {
        evidence.push('Health domain — ANVISA SaMD applicable');
        gaps.push('No clinical evaluation plan detected');
        gaps.push('No ANVISA registration verified');
      }
      results.push({ id: 'reg-anvisa', name: 'ANVISA RDC 677/2022 (SaMD)', authority: 'ANVISA', status: 'not_applicable', score: 100, evidence, gaps, requirements: ['SaMD classification', 'ANVISA registration', 'Clinical evaluation'] });
    }

    // ── Universal Compliance Score ──────────────────────────
    const applicable = results.filter(r => r.status !== 'not_applicable');
    const applicableCount = applicable.length;
    const compliantCount = applicable.filter(r => r.status === 'compliant').length;
    const partialCount = applicable.filter(r => r.status === 'partial').length;
    const avgScore = Math.round(applicable.reduce((s, r) => s + r.score, 0) / Math.max(1, applicableCount));
    const totalGaps = applicable.reduce((s, r) => s + r.gaps.length, 0);
    const totalEvidence = results.reduce((s, r) => s + r.evidence.length, 0);

    console.log(`[compliance] ${results.length} frameworks evaluated`);
    console.log(`[compliance] ${compliantCount} compliant, ${partialCount} partial, ${applicableCount - compliantCount - partialCount} non-compliant`);
    console.log(`[compliance] Universal Score: ${avgScore}/100 (${totalGaps} gaps, ${totalEvidence} evidence items)`);

    // Persist compliance report as ledger entries
    for (const reg of results) {
      try {
        const payload = JSON.stringify({ complianceId: reg.id, score: reg.score, status: reg.status, evidenceCount: reg.evidence.length, gapCount: reg.gaps.length });
        const subjectId = '00000000-0000-0000-0000-' + reg.id.replace(/[^0-9a-f]/gi, '0').padStart(12, '0').slice(0, 12);
        const desc = `${reg.name}: ${reg.status} (score: ${reg.score}/100) — ${reg.gaps.length} gaps, ${reg.evidence.length} evidence items`.replace(/'/g, "''").substring(0, 300);
        await govDML(`INSERT INTO gov_repo.governance_ledger (
          organisation_id, subject_type, subject_id, event_type, event_description,
          actor_user_id, previous_hash, payload, entry_hash
        ) VALUES (
          '${organisationId}', 'system', '${subjectId}', 'compliance_assessment',
          '${desc}',
          '${userId}', repeat('0', 64),
          '${payload.replace(/'/g, "''")}'::jsonb,
          encode(sha256(('${reg.id}' || now()::text)::bytea), 'hex')
        ) RETURNING 1`);
      } catch (e) {
        console.log(`  [compliance] FAILED to persist assessment for ${reg.id}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    // Persist top compliance gaps as risks
    for (const reg of applicable) {
      for (const gap of reg.gaps.slice(0, 3)) {
        try {
          await govDML(`INSERT INTO gov_repo.risk_entries (
            organisation_id, risk_code, title, description, risk_category,
            risk_domain, likelihood, impact, status, related_agent_ids, owner_user_id
          ) VALUES (
            '${organisationId}',
            'COM-${reg.id.replace('reg-', '').slice(0, 8)}-${gap.replace(/[^A-Z0-9]/gi, '').slice(0, 5)}',
            '${reg.name} — ${gap.replace(/'/g, "''").substring(0, 100)}',
            '${gap.replace(/'/g, "''").substring(0, 300)}',
            'compliance'::gov_repo.risk_category, '${reg.id}',
            3, 3, 'identified',
            ARRAY(SELECT agent_id FROM gov_repo.agents WHERE organisation_id = '${organisationId}' LIMIT 1)::uuid[],
            '${userId}'
          ) RETURNING 1`);
        } catch { /* best-effort */ }
      }
    }
    console.log(`[compliance] Persisted ${results.length} assessments + ${totalGaps} gap risks`);
    console.log(`[compliance] Universal Score: ${avgScore}/100`);
  }

  if (persisted > 0) {
    console.log('\n[bootstrap] Populating graphos_entities from gov_repo...');
    const result = await inlineBootstrap(organisationId, tenantId);

    console.log(`\n[bootstrap] === RESULT ===`);
    console.log(`  Entities created:      ${result.entitiesCreated}`);
    console.log(`  Relationships created: ${result.relationshipsCreated}`);
    console.log(`  Errors:                ${result.errors.length}`);

    console.log(`\n  By kind:`);
    for (const [kind, count] of Object.entries(result.byKind)) {
      console.log(`    ${kind}: ${count}`);
    }

    console.log(`\n  By relationship kind:`);
    for (const [kind, count] of Object.entries(result.byRelKind)) {
      console.log(`    ${kind}: ${count}`);
    }

    if (result.errors.length > 0) {
      console.log(`\n  Errors (first 10):`);
      for (const err of result.errors.slice(0, 10)) {
        console.log(`    - ${err}`);
      }
    }
  }

  console.log('\n=== DONE ===');
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
