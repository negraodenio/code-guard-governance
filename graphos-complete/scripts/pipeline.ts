/**
 * Pipeline de 8 Fases — CAAG Platform
 *
 * 1. Discovery     → Scanner unificado (local, github, gitlab, etc.)
 * 2. Classification→ Classifica agentes (AI Act risk, tipo, dominio)
 * 3. Gov Repository→ Persiste no Supabase (gov_repo.*)
 * 4. Decision Gov  → Mapeia decisoes, prompts, modelos
 * 5. GraphOS       → Constrói knowledge graph
 * 6. Executive Lens→ Gera lentes (CEO, CISO, DPO, etc.)
 * 7. Monitoring    → Configura watch contínuo
 * 8. Certification → Avalia controles e gera certificado
 *
 * Usage:
 *   npx tsx scripts/pipeline.ts --local ../PluginVibeCOde
 *   npx tsx scripts/pipeline.ts --github owner/repo
 */

import { Scanner, type SourceConfig, type UnifiedScanResult } from '@council/scanner/unified';
import { GraphEngine } from '@council/graphos';

/* ─── Phase 1: Discovery ─────────────────────────────────────── */

async function phase1(source: SourceConfig): Promise<UnifiedScanResult> {
  console.log('\n=== PHASE 1: Discovery ===');
  const scanner = new Scanner();
  const result = await scanner.scan(source);
  console.log(`  Agents found: ${result.agents.length}`);
  console.log(`  Risks found:  ${result.risks.length}`);
  return result;
}

/* ─── Phase 2: Classification ────────────────────────────────── */

async function phase2(result: UnifiedScanResult): Promise<UnifiedScanResult> {
  console.log('\n=== PHASE 2: Classification ===');
  for (const agent of result.agents) {
    const risk = agent.attrs?.riskLevel || 'medium';
    const aiActClass = agent.attrs?.aiActRiskClass || 'limited';
    console.log(`  ${agent.label}: risk=${risk}, AI Act=${aiActClass}`);
  }
  return result;
}

/* ─── Phase 3: Governance Repository ─────────────────────────── */

async function phase3(result: UnifiedScanResult, supabaseUrl?: string, supabaseKey?: string) {
  console.log('\n=== PHASE 3: Governance Repository ===');
  if (!supabaseUrl || !supabaseKey) {
    console.log('  SKIP — no Supabase credentials');
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(supabaseUrl, supabaseKey);

  for (const agent of result.agents) {
    const subjectId = crypto.randomUUID();
    const { error: agentErr } = await sb.rpc('gov_exec_dml', {
      p_operation: 'upsert',
      p_table: 'agents',
      p_data: {
        id: subjectId,
        name: agent.label,
        agent_type: agent.attrs?.agentType || 'custom',
        risk_level: agent.attrs?.riskLevel || 'medium',
        status: 'discovered',
        ai_act_risk_class: agent.attrs?.aiActRiskClass || 'limited',
        metadata: agent.attrs,
      },
    });
    if (agentErr) console.error(`  FAIL agent ${agent.label}:`, agentErr.message);
    else console.log(`  PERSISTED agent: ${agent.label}`);

    // Register in Governance Ledger
    const { error: ledgerErr } = await sb.rpc('gov_exec_dml', {
      p_operation: 'insert',
      p_table: 'governance_ledger',
      p_data: {
        subject_id: subjectId,
        subject_type: 'agent',
        action: 'discovery',
        status: 'pending_review',
        cf_module: 'CF-001',
        metadata: { source: result.source, agentLabel: agent.label },
      },
    });
    if (ledgerErr) console.error(`  FAIL ledger ${agent.label}:`, ledgerErr.message);
  }

  // Register risks
  for (const risk of result.risks) {
    const { error: riskErr } = await sb.rpc('gov_exec_dml', {
      p_operation: 'upsert',
      p_table: 'risks',
      p_data: {
        id: risk.id,
        title: risk.label,
        severity: risk.attrs?.severity || 'medium',
        status: 'open',
        category: risk.attrs?.riskType || 'operational',
        description: risk.description,
      },
    });
    if (riskErr) console.error(`  FAIL risk:`, riskErr.message);
    else console.log(`  PERSISTED risk: ${risk.label}`);
  }
}

/* ─── Phase 4: Decision Governance ───────────────────────────── */

async function phase4(result: UnifiedScanResult) {
  console.log('\n=== PHASE 4: Decision Governance ===');
  if (result.decisions.length === 0) {
    console.log('  No decisions mapped yet — agents use tools/models');
    for (const agent of result.agents) {
      const tools = (agent.attrs?.tools as string[]) || [];
      const models = (agent.attrs?.models as string[]) || [];
      if (tools.length || models.length) {
        console.log(`  ${agent.label}: ${tools.length} tools, ${models.length} models`);
      }
    }
  } else {
    for (const d of result.decisions) console.log(`  Decision: ${d.label}`);
  }
}

/* ─── Phase 5: GraphOS ───────────────────────────────────────── */

function phase5(result: UnifiedScanResult): GraphEngine {
  console.log('\n=== PHASE 5: GraphOS (Knowledge Graph) ===');
  const scanner = new Scanner();
  const engine = scanner.toGraph(result);
  console.log(`  Entities: ${engine.size}`);
  console.log(`  Rels:     ${engine.relationships.length}`);
  console.log(`  Kinds:    ${[...new Set(Array.from(engine.entities.values()).map(e => e.kind))].join(', ')}`);
  return engine;
}

/* ─── Phase 6: Executive Lenses ──────────────────────────────── */

function phase6(engine: GraphEngine) {
  console.log('\n=== PHASE 6: Executive Lenses ===');
  const lenses = ['ceo', 'cfo', 'ciso', 'dpo', 'compliance', 'board', 'certification'];
  for (const name of lenses) {
    const view = engine.lens(name);
    if (view) console.log(`  ${name.toUpperCase()}: ${JSON.stringify(view)}`);
  }
}

/* ─── Phase 7: Continuous Monitoring ─────────────────────────── */

async function phase7(result: UnifiedScanResult) {
  console.log('\n=== PHASE 7: Continuous Monitoring ===');
  console.log(`  Source type: ${result.source.type}`);
  console.log(`  Agents to monitor: ${result.agents.length}`);
  console.log('  Monitoring config: polling every 5min (TODO: implement watcher)');
}

/* ─── Phase 8: Certification ─────────────────────────────────── */

async function phase8(result: UnifiedScanResult) {
  console.log('\n=== PHASE 8: Certification ===');
  const { certifySystem } = await import('@council/scanner/core/certification');
  const source = {
    files: [], totalLines: 0, languages: {}, fileTree: [], dependencies: [],
    agents: (result.agents as any[]).map((a: any) => ({ id: a.id, name: a.label, type: 'ai_persona', critical: (a.attrs?.riskLevel === 'high' || a.attrs?.riskLevel === 'critical'), tools: [], models: [], frameworks: [], riskLevel: a.attrs?.riskLevel || 'medium', status: 'discovered', ownerId: null })),
    apiRoutes: [], authPatterns: [], databaseTables: [], dataAssets: [],
    envKeys: [], aiModels: [], frameworks: [], notebooks: [], prompts: [],
    memorySystems: [], configFiles: [],
  };
  const pkg = { dependencies: {}, devDependencies: {}, scripts: {}, aiDependencies: [], hasTestFramework: false, hasLinter: false };
  const risks = result.risks.map((r: any) => ({
    id: r.id, title: r.label, severity: r.attrs?.severity || 'medium', category: r.attrs?.riskType || 'operational', description: r.description || '', file: '', line: 0, mitigated: false,
  }));
  const compliance = { regulations: [], status: 'unknown', score: 0, applicableRegulations: [], overallScore: 0, penalizedScore: 0, regulationCount: 0 };
  const cert = certifySystem(source as any, risks as any, compliance as any, pkg as any);
  console.log(`  Certification level: ${cert.overall}`);
  console.log(`  Bronze: ${cert.levels.bronze.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  Silver: ${cert.levels.silver.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  Gold:   ${cert.levels.gold.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  Platinum: ${cert.levels.platinum.pass ? 'PASS' : 'FAIL'}`);
}

/* ─── Main Pipeline ──────────────────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  const localIdx = args.indexOf('--local');
  const githubIdx = args.indexOf('--github');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let source: SourceConfig;

  if (localIdx >= 0 && args[localIdx + 1]) {
    source = { type: 'local', path: args[localIdx + 1] };
  } else if (githubIdx >= 0 && args[githubIdx + 1]) {
    source = { type: 'github', url: `https://github.com/${args[githubIdx + 1]}` };
  } else {
    console.error('Usage: npx tsx scripts/pipeline.ts --local <path> | --github <owner/repo>');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  CAAG Pipeline — 8 Phases                    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Source: ${source.type} — ${source.path || source.url}`);

  const result = await phase1(source);
  await phase2(result);
  await phase3(result, supabaseUrl, supabaseKey);
  await phase4(result);
  const engine = phase5(result);
  phase6(engine);
  await phase7(result);
  await phase8(result);

  console.log('\n=== PIPELINE COMPLETE ===');
  console.log(`  Score: ${result.summary.complianceScore}%`);
  console.log(`  Cert:  ${result.summary.certLevel}`);
}

main().catch(console.error);
