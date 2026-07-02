import { discoverRepo } from '../src/scanner/index';
import * as views from '@council/graphos/views';

interface ScoreEntry {
  ok: number;
  total: number;
  notes: string;
}

async function main() {
  const repoUrl = 'https://github.com/negraodenio/aegishub-ai';
  console.log(`\n${'='.repeat(70)}`);
  console.log(`PRODUCTION REALITY TEST — ${repoUrl}`);
  console.log(`${'='.repeat(70)}\n`);

  const result = await discoverRepo({ repoUrl });
  const engine = result.graphosEngine;

  // ── Print raw findings ──────────────────────────────────
  console.log('REPO:', result.repo.fullName, `(${result.repo.description})`);
  console.log('PACKAGES:', result.packages.name, `| AI: [${result.packages.aiDependencies.join(', ')}]`, `| DB: [${result.packages.dbDependencies.join(', ')}]`);
  console.log('CONFIGS: TS strict=', result.configs.typescript?.strict, '| License=', result.configs.hasLicense, '| .env.example=', result.configs.hasEnvExample, '| CI/CD=', result.configs.hasCICD);
  console.log('API ROUTES:', result.source.apiRoutes.length);
  console.log('AI MODELS:', result.source.aiModels.map(m => `${m.provider}/${m.modelId}`).join(', '));
  console.log('EXTERNAL SERVICES:', result.source.externalServices.map(s => s.name).join(', '));
  console.log('AGENTS:', result.source.agents.map(a => a.name).join(', '));
  console.log('DATA ASSETS:', result.source.dataAssets.map(d => `${d.name}(PII=${d.hasPII})`).join(', '));
  console.log('RISKS:', result.risks.length, `(${result.risks.filter(r => r.severity === 'critical').length} critical, ${result.risks.filter(r => r.severity === 'high').length} high)`);
  console.log('COMPLIANCE SCORE:', result.compliance.overallScore);
  console.log('SHADOW AI:', result.shadowAI.length, 'findings');
  console.log('CERTIFICATION:', result.certification.overall);
  console.log('FILE TREE:', result.source.fileTree.length, 'entries');
  console.log('LANGUAGES:', JSON.stringify(result.source.languages));

  // ── Agents detail ───────────────────────────────────────
  console.log('\nAGENTS DETAIL:');
  for (const a of result.source.agents) {
    console.log(`  ${a.name.padEnd(20)} type=${a.type.padEnd(12)} risk=${a.riskLevel} tools=[${a.tools.join(',')}] models=[${a.models.join(',')}]`);
  }

  // ── Shadow AI detail ────────────────────────────────────
  console.log('\nSHADOW AI DETAIL:');
  for (const s of result.shadowAI) {
    console.log(`  ${s.file.padEnd(30)} provider=${s.provider} | governed=${s.governed} | ${s.reason}`);
  }

  // ── Risks detail ────────────────────────────────────────
  console.log('\nRISKS DETAIL:');
  for (const r of result.risks) {
    console.log(`  [${r.severity.padEnd(8)}][${r.category.padEnd(13)}] ${r.title}`);
  }

  // ══════════════════════════════════════════════════════════
  // TEST 1 — CEO VIEW
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 1 — CEO VIEW: Business Discovery');
  console.log('='.repeat(70));
  const ceoView = views.buildCEOView(engine);
  const ceoText = JSON.stringify(ceoView).toLowerCase();
  console.log(`  Title: ${ceoView.title}`);
  console.log(`  Description: ${ceoView.description}`);
  console.log(`  Summary: ${JSON.stringify(ceoView.summary)}`);

  const ceoHasMentalHealth = /mental.?health|sa[úu]de.?mental|cops[oó]q/i.test(ceoText) || result.source.agents.some(a => /mental|health|assessment|cops[oó]q/i.test(a.name));
  const ceoHasCompliance = /compliance|regulat/i.test(ceoText) || result.source.agents.some(a => /compliance|regulat|audit/i.test(a.name));
  const ceoHasVoice = /voice|audio/i.test(ceoText) || result.source.agents.some(a => /voice|audio|speech/i.test(a.name));
  const ceoHasPlatform = /platform|system/i.test(ceoText);
  const t1 = { mentalHealth: ceoHasMentalHealth, compliance: ceoHasCompliance, voice: ceoHasVoice, platform: ceoHasPlatform };
  console.log(`  → mentalHealth=${ceoHasMentalHealth} compliance=${ceoHasCompliance} voice=${ceoHasVoice} platform=${ceoHasPlatform}`);

  // ══════════════════════════════════════════════════════════
  // TEST 2 — CFO VIEW
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2 — CFO VIEW: Cost Centers');
  console.log('='.repeat(70));
  const cfoView = views.buildCFOView(engine);
  console.log(`  Title: ${cfoView.title}`);
  console.log(`  Summary: ${JSON.stringify(cfoView.summary)}`);

  const costProviders = new Set(result.source.aiModels.map(m => m.provider));
  const costSvcs = result.source.externalServices.map(s => s.name);
  const costCenters = Array.from(new Set([...Array.from(costProviders), ...costSvcs, ...result.packages.cloudDependencies, ...result.packages.dbDependencies.map(d => d.replace(/^@/, '').split('/')[0])]));
  console.log(`  Cost centers found: [${costCenters.join(', ')}]`);

  const expectedCosts = ['OpenAI', 'DeepSeek', 'Mistral', 'Supabase'];
  const t2 = costCenters.filter(c => expectedCosts.some(ec => c.toLowerCase().includes(ec.toLowerCase())));
  console.log(`  → matched ${t2.length}/${expectedCosts.length}: [${t2.join(', ')}]`);

  // ══════════════════════════════════════════════════════════
  // TEST 3 — CISO VIEW
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 3 — CISO VIEW: Security Discovery');
  console.log('='.repeat(70));
  const cisoView = views.buildCISOView(engine);
  console.log(`  Summary: ${JSON.stringify(cisoView.summary)}`);

  const secRisks = result.risks.filter(r => r.category === 'security');
  const cisoFindings = {
    rlsBypass: result.risks.some(r => r.id === 'RISK-NO-RLS'),
    noLicense: result.risks.some(r => r.id === 'RISK-NO-LICENSE'),
    devUnlock: result.source.fileTree.some(f => /dev|unlock|bypass/i.test(f)),
    noRateLimit: !result.source.authPatterns.some(a => /rate.?limit|throttle/i.test(a)),
    noCSP: result.risks.some(r => r.id === 'RISK-NO-CSP'),
    noAuditChain: !result.source.fileTree.some(f => /audit|log|trace/i.test(f)),
  };
  console.log(`  → ${JSON.stringify(cisoFindings)}`);
  const t3 = Object.values(cisoFindings).filter(Boolean).length;

  // ══════════════════════════════════════════════════════════
  // TEST 4 — DPO VIEW
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 4 — DPO VIEW: PII Discovery');
  console.log('='.repeat(70));
  const dpoView = views.buildDPOView(engine);
  const piiAssets = result.source.dataAssets.filter(d => d.hasPII);
  const piiNames = piiAssets.map(d => d.name.toLowerCase());

  const hasVoice = piiNames.some(n => /voice|audio/i.test(n));
  const hasPhq9 = piiNames.some(n => /phq|assessment|survey/i.test(n));
  const hasCops = piiNames.some(n => /cops[oó]q|questionnaire/i.test(n));
  const hasIdentifiable = piiNames.some(n => /user|profile|name|email|cpf|phone|address|document|consent|health|mental|employee/i.test(n));
  const t4 = { voice: hasVoice, phq9: hasPhq9, copsoq: hasCops, identifiable: hasIdentifiable };
  console.log(`  PII assets: [${piiNames.join(', ')}]`);
  console.log(`  → voice=${hasVoice} phq9=${hasPhq9} copsoq=${hasCops} identifiable=${hasIdentifiable}`);

  // ══════════════════════════════════════════════════════════
  // TEST 5 — AI ACT VIEW
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 5 — AI ACT VIEW: Regulatory Classification');
  console.log('='.repeat(70));
  const aiActView = views.buildAIActView(engine);
  console.log(`  Title: ${aiActView.title}`);
  console.log(`  Summary: ${JSON.stringify(aiActView.summary)}`);
  if (aiActView.cards) {
    for (const c of aiActView.cards) console.log(`  Card: ${c.title} = ${c.value} | ${c.description ?? ''}`);
  }

  const aiActHighRisk = /high.?risk|alto.?risco/i.test(JSON.stringify(aiActView));
  const aiActOversight = /oversight|supervis[iã]o/i.test(JSON.stringify(aiActView));
  console.log(`  → highRisk=${aiActHighRisk} oversight=${aiActOversight}`);

  // ══════════════════════════════════════════════════════════
  // TEST 6 — AGENT GOVERNANCE VIEW
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 6 — AGENT GOVERNANCE VIEW: Agent Discovery');
  console.log('='.repeat(70));
  const agentView = views.buildAgentGovernanceView(engine);
  console.log(`  Summary: ${JSON.stringify(agentView.summary)}`);

  const agentNames = result.source.agents.map(a => a.name.toLowerCase());
  const a6 = {
    voice: agentNames.some(n => /voice|audio|speech/i.test(n)),
    mental: agentNames.some(n => /mental|health|assessment|wellbeing|cops[oó]q/i.test(n)),
    compliance: agentNames.some(n => /compliance|regulat|audit|governance/i.test(n)),
    risk: agentNames.some(n => /risk|monitor|threat/i.test(n)),
    report: agentNames.some(n => /report|dashboard|export/i.test(n)),
  };
  console.log(`  Agents found: [${result.source.agents.map(a => a.name).join(', ')}]`);
  console.log(`  → ${JSON.stringify(a6)}`);

  // ══════════════════════════════════════════════════════════
  // TEST 7 — GRAPHOS RECONSTRUCTION
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 7 — GRAPH RECONSTRUCTION');
  console.log('='.repeat(70));
  const entityKinds = new Set(engine.entities.map(e => e.kind));
  const expectedKinds = ['owner', 'tool', 'external_system', 'data_asset', 'model', 'agent', 'risk', 'regulation', 'evidence'];
  const t7 = expectedKinds.map(k => ({ kind: k, found: entityKinds.has(k as any) }));
  console.log(`  Entity kinds in graph: [${Array.from(entityKinds).join(', ')}]`);
  console.log(`  → ${t7.map(t => `${t.kind}=${t.found}`).join(' ')}`);
  console.log(`  Graph: ${engine.entities.length} entities, ${engine.relationships.length} relationships`);

  // ══════════════════════════════════════════════════════════
  // TEST 8 — BOARD VIEW
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 8 — BOARD VIEW: Top 10 Risks');
  console.log('='.repeat(70));
  const boardView = views.buildBoardView(engine);
  console.log(`  Summary: ${JSON.stringify(boardView.summary)}`);

  const topRisks = result.risks
    .filter(r => r.severity === 'critical' || r.severity === 'high')
    .slice(0, 10);
  console.log(`  Top risks (${topRisks.length}):`);
  for (const r of topRisks) {
    console.log(`    [${r.severity}] ${r.title}`);
  }

  // ══════════════════════════════════════════════════════════
  // TEST 9 — SHADOW AI
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 9 — SHADOW AI DETECTION');
  console.log('='.repeat(70));
  console.log(`  Shadow AI findings: ${result.shadowAI.length}`);
  const ungovernedCount = result.shadowAI.filter(s => !s.governed).length;
  console.log(`  Ungoverned LLM calls: ${ungovernedCount}`);
  const hasShadowAIRisk = result.risks.some(r => r.id === 'RISK-SHADOW-AI');
  console.log(`  Shadow AI risk generated: ${hasShadowAIRisk}`);

  // ══════════════════════════════════════════════════════════
  // TEST 10 — CERTIFICATION
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('TEST 10 — CERTIFICATION');
  console.log('='.repeat(70));
  const cert = result.certification;
  console.log(`  Overall: ${cert.overall}`);
  for (const [level, data] of Object.entries(cert.levels)) {
    console.log(`  ${level.toUpperCase()}: ${data.pass ? 'PASS' : 'FAIL'}`);
    for (const e of data.evidence) console.log(`    ✓ ${e}`);
    for (const f of data.fail) console.log(`    ✗ ${f}`);
  }

  // ══════════════════════════════════════════════════════════
  // SCORING
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('FINAL SCORING');
  console.log('='.repeat(70));

  const scores: Record<string, ScoreEntry> = {
    T1_BusinessDiscovery: {
      ok: [t1.mentalHealth, t1.compliance, t1.voice, t1.platform].filter(Boolean).length,
      total: 4,
      notes: `mental=${t1.mentalHealth} compliance=${t1.compliance} voice=${t1.voice} platform=${t1.platform}`,
    },
    T2_CFO_CostDiscovery: {
      ok: t2.length,
      total: 4,
      notes: `found ${t2.length}/4 expected cost centers: ${t2.join(', ')}`,
    },
    T3_CISO_SecurityDiscovery: {
      ok: t3,
      total: 6,
      notes: `${t3}/6 security issues detected: ${JSON.stringify(cisoFindings)}`,
    },
    T4_DPO_PIIDiscovery: {
      ok: [t4.voice, t4.phq9, t4.copsoq, t4.identifiable].filter(Boolean).length,
      total: 4,
      notes: `voice=${t4.voice} phq9=${t4.phq9} copsoq=${t4.copsoq} identifiable=${t4.identifiable}`,
    },
    T5_AIAct_Classification: {
      ok: [aiActHighRisk, aiActOversight].filter(Boolean).length,
      total: 2,
      notes: `highRisk=${aiActHighRisk} oversight=${aiActOversight}`,
    },
    T6_AgentDiscovery: {
      ok: [a6.voice, a6.mental, a6.compliance, a6.risk, a6.report].filter(Boolean).length,
      total: 5,
      notes: `voice=${a6.voice} mental=${a6.mental} compliance=${a6.compliance} risk=${a6.risk} report=${a6.report}`,
    },
    T7_GraphReconstruction: {
      ok: t7.filter(t => t.found).length,
      total: 9,
      notes: t7.map(t => `${t.kind}=${t.found}`).join(' '),
    },
    T8_Board_RiskRegister: {
      ok: Math.min(topRisks.length, 10),
      total: 10,
      notes: `${topRisks.length} top risks (limit 10)`,
    },
    T9_ShadowAI: {
      ok: (result.shadowAI.length > 0 ? 1 : 0) + (ungovernedCount > 0 ? 1 : 0) + (hasShadowAIRisk ? 1 : 0),
      total: 3,
      notes: `findings=${result.shadowAI.length} ungoverned=${ungovernedCount} risk=${hasShadowAIRisk}`,
    },
    T10_Certification: {
      ok: cert.overall !== 'none' ? 1 : 0,
      total: 1,
      notes: `certification=${cert.overall}`,
    },
  };

  console.log('');
  console.log('┌──────────────────────────────────┬────────┬──────────────────────────────────────┐');
  console.log('│ Capability                       │ Score  │ Notes                                │');
  console.log('├──────────────────────────────────┼────────┼──────────────────────────────────────┤');
  for (const [key, s] of Object.entries(scores)) {
    const pct = s.total > 0 ? Math.round(s.ok / s.total * 100) : 0;
    const bar = pct >= 80 ? '✓' : pct >= 40 ? '◐' : '✗';
    const name = key.padEnd(32);
    const scoreStr = `${bar} ${String(pct).padStart(2)}/${String(s.total).padStart(2)}`;
    console.log(`│ ${name}│  ${scoreStr}  │ ${s.notes.padEnd(36)} │`);
  }
  console.log('├──────────────────────────────────┼────────┼──────────────────────────────────────┤');
  const totalOk = Object.values(scores).reduce((sum, s) => sum + s.ok, 0);
  const totalMax = Object.values(scores).reduce((sum, s) => sum + s.total, 0);
  const overallPct = Math.round(totalOk / totalMax * 100);
  const overallBar = overallPct >= 80 ? '✓' : overallPct >= 40 ? '◐' : '✗';
  console.log(`│ ${'OVERALL'.padEnd(32)} │  ${overallBar} ${String(overallPct).padStart(2)}%   │ ${totalOk}/${totalMax} points${' '.repeat(22)} │`);
  console.log('└──────────────────────────────────┴────────┴──────────────────────────────────────┘');

  console.log(`\nRaw entities: ${engine.entities.length}, relationships: ${engine.relationships.length}`);
  console.log(`Entity kinds: ${Array.from(entityKinds).join(', ')}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
