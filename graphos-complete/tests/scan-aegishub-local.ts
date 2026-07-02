import * as fs from 'fs';
import * as path from 'path';
import type { ScannerResult, RepoMetadata } from '../src/scanner/types';
import { analyzePackageJson, analyzeConfigs, analyzeSourceCode, aggregatePackages } from '../src/scanner/analyzer';
import { detectRisks } from '../src/scanner/risk-detector';
import { analyzeCompliance } from '../src/scanner/compliance';
import { detectShadowAI } from '../src/scanner/shadow-ai';
import { certifySystem } from '../src/scanner/certification';
import { mapToGraphOS } from '../src/scanner/graphos-mapper';
import { scanCodeViolations } from '../src/scanner/violations';
import { aggregatePII } from '../src/scanner/enrichment/lgpd-pii';
import { traceDataFlows } from '../src/scanner/enrichment/lineage';
import { inferTrustZone } from '../src/scanner/enrichment/trust-zone';
import { GraphEngine } from '@council/graphos';
import * as views from '@council/graphos/views';

const REPO_DIR = path.join(process.env.TEMP!, 'opencode', 'aegishub-scan');

function walkDir(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...walkDir(full));
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

function getFileTree(dir: string): { path: string; size: number }[] {
  const files = walkDir(dir);
  const relativeDir = dir.endsWith(path.sep) ? dir : dir + path.sep;
  return files.map(f => ({
    path: f.replace(relativeDir, '').replace(/\\/g, '/'),
    size: fs.statSync(f).size,
  }));
}

function readTextFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch { return null; }
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript',
    '.mjs': 'JavaScript', '.py': 'Python', '.go': 'Go', '.rb': 'Ruby',
    '.java': 'Java', '.sql': 'PLpgSQL', '.css': 'CSS', '.ps1': 'PowerShell',
    '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.md': 'Markdown',
  };
  return map[ext] ?? 'Unknown';
}

async function main() {
  if (!fs.existsSync(REPO_DIR)) {
    console.error(`Repo not found at ${REPO_DIR}. Run git clone first.`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`LOCAL SCANNER — ${REPO_DIR}`);
  console.log(`${'='.repeat(70)}\n`);

  const fileTree = getFileTree(REPO_DIR);
  const fileNames = fileTree.map(f => f.path.replace(/\\/g, '/'));
  const relativeDir = REPO_DIR.endsWith(path.sep) ? REPO_DIR : REPO_DIR + path.sep;

  // Languages
  const languages: Record<string, number> = {};
  for (const f of fileTree) {
    const lang = detectLanguage(f.path);
    languages[lang] = (languages[lang] || 0) + f.size;
  }

  // Read key files
  const KEY_FILES = ['package.json', 'tsconfig.json', '.eslintrc.js', '.eslintrc.json',
    'eslint.config.mjs', '.prettierrc', 'next.config.js', 'Dockerfile', 'README.md', '.env.example'];

  const fileContentsMap = new Map<string, string>();
  for (const kf of KEY_FILES) {
    const content = readTextFile(path.join(REPO_DIR, kf));
    if (content) fileContentsMap.set(kf, content);
  }

  // Find sub-package.json files
  const subPackagePaths = fileNames.filter(f => f.endsWith('/package.json') && f !== 'package.json');
  for (const sp of subPackagePaths) {
    const p = path.join(REPO_DIR, sp.replace(/\//g, path.sep));
    if (fs.existsSync(p)) {
      const content = readTextFile(p);
      if (content) fileContentsMap.set(sp, content);
    }
  }

  // Read all source files
  const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go', '.rb', '.java'];
  const sourcePaths = fileNames.filter(f =>
    SOURCE_EXTENSIONS.some(ext => f.endsWith(ext)) &&
    !f.includes('node_modules') &&
    !f.startsWith('.')
  );

  for (const sp of sourcePaths) {
    const p = path.join(REPO_DIR, sp.replace(/\//g, path.sep));
    if (fs.existsSync(p)) {
      const content = readTextFile(p);
      if (content) fileContentsMap.set(sp, content);
    }
  }

  console.log(`Files in tree: ${fileNames.length}`);
  console.log(`Files with content: ${fileContentsMap.size}`);
  console.log(`Languages: ${JSON.stringify(languages)}`);

  // ── RUN ANALYSIS ──────────────────────────────────────────
  const packageJson = fileContentsMap.get('package.json') ?? null;
  const tsconfigContent = fileContentsMap.get('tsconfig.json') ?? null;
  const eslintContent = fileContentsMap.get('eslint.config.mjs') ?? fileContentsMap.get('.eslintrc.json') ?? fileContentsMap.get('.eslintrc.js') ?? null;

  const rootPackages = analyzePackageJson(packageJson);
  const subPackages: any[] = [];
  for (const sp of subPackagePaths) {
    const content = fileContentsMap.get(sp);
    if (content) subPackages.push(analyzePackageJson(content));
  }
  const packages = aggregatePackages(rootPackages, subPackages);

  const configs = analyzeConfigs(packageJson, fileNames, tsconfigContent, eslintContent);
  const source = analyzeSourceCode(fileContentsMap, fileNames, languages);
  const shadowAI = detectShadowAI(fileContentsMap, source);
  const risks = detectRisks(packages, configs, source, fileNames, shadowAI);
  const { violations } = scanCodeViolations(fileContentsMap);
  for (const v of violations) {
    risks.push({
      id: v.rule, severity: v.severity,
      category: v.category === 'pci' || v.category === 'owasp' ? 'security' : 'compliance',
      title: v.message.split('.')[0], description: v.message,
      file: v.file, line: v.line, recommendation: v.recommendation,
    });
  }

  const piiEnrichment = aggregatePII(fileContentsMap);
  const trustZone = inferTrustZone(fileContentsMap, fileNames);
  const fileInfoList = fileNames.map(p => ({ path: p, content: fileContentsMap.get(p) ?? '' }));
  const lineage = traceDataFlows(fileInfoList);
  const enrichment = { pii: piiEnrichment, lineage, trustZone, codeMap: null };

  const compliance = await analyzeCompliance(packages, source, risks);
  const certification = certifySystem(source, risks, compliance, packages);

  const repoMeta: RepoMetadata = {
    name: 'aegishub-ai',
    owner: 'negraodenio',
    fullName: 'negraodenio/aegishub-ai',
    description: 'Mental health & compliance AI system',
    homepage: null,
    stars: 0, forks: 0, language: 'TypeScript',
    defaultBranch: 'main',
    createdAt: '', updatedAt: '', pushedAt: '',
    hasLicense: fileNames.some(f => f.toLowerCase().startsWith('license')),
    licenseName: null,
    fileCount: fileNames.length,
    totalSize: fileTree.reduce((s, f) => s + f.size, 0),
    topics: [],
  };

  const result: ScannerResult = {
    repo: repoMeta, packages, configs, source, risks, compliance,
    shadowAI, certification,
    violations, enrichment,
    owner: { id: 'sc-owner-negraodenio', label: 'negraodenio', email: '', role: 'head_ai', teams: ['Engineering'] },
  };

  const { entities, relationships } = mapToGraphOS(result);
  const engine = new GraphEngine();
  for (const e of entities) engine.addEntity(e);
  for (const r of relationships) engine.addRelationship(r);

  // ══════════════════════════════════════════════════════════
  // PRINT RAW FINDINGS
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '-'.repeat(70));
  console.log('RAW FINDINGS');
  console.log('-'.repeat(70));

  console.log(`\nPACKAGE NAME: ${packages.name}`);
  console.log(`AI DEPS: [${packages.aiDependencies.join(', ')}]`);
  console.log(`DB DEPS: [${packages.dbDependencies.join(', ')}]`);
  console.log(`AUTH DEPS: [${packages.authDependencies.join(', ')}]`);
  console.log(`PAYMENT DEPS: [${packages.paymentDependencies.join(', ')}]`);
  console.log(`CLOUD DEPS: [${packages.cloudDependencies.join(', ')}]`);
  console.log(`HAS TESTS: ${packages.hasTestFramework}`);
  console.log(`HAS LINTER: ${packages.hasLinter}`);

  console.log(`\nCONFIGS:`);
  console.log(`  TS strict: ${configs.typescript?.strict}`);
  console.log(`  ESLint: ${configs.eslint}`);
  console.log(`  Docker: ${configs.hasDocker}`);
  console.log(`  CI/CD: ${configs.hasCICD}`);
  console.log(`  .env.example: ${configs.hasEnvExample}`);
  console.log(`  License: ${configs.hasLicense}`);
  console.log(`  Docker Compose: ${configs.hasDockerCompose}`);

  console.log(`\nSOURCE:`);
  console.log(`  API routes: ${source.apiRoutes.length}`);
  for (const r of source.apiRoutes) console.log(`    ${r.method} ${r.path} auth=${r.authRequired}`);
  console.log(`  DB tables: [${source.databaseTables.join(', ')}]`);
  console.log(`  AI models: ${source.aiModels.length}`);
  for (const m of source.aiModels) console.log(`    ${m.provider} / ${m.modelId ?? '(generic)'} usage=${m.usage}`);
  console.log(`  External services: [${source.externalServices.map(s => s.name).join(', ')}]`);
  console.log(`  Data assets: ${source.dataAssets.length}`);
  for (const d of source.dataAssets) console.log(`    ${d.name} PII=${d.hasPII} legalBasis=[${d.legalBasis.join(',')}]`);
  console.log(`  Agents: ${source.agents.length}`);
  for (const a of source.agents) console.log(`    ${a.name.padEnd(25)} type=${a.type.padEnd(12)} risk=${a.riskLevel} tools=[${a.tools.join(',')}] models=[${a.models.join(',')}]`);

  console.log(`\nRISKS: ${risks.length}`);
  for (const r of risks) {
    console.log(`  [${r.severity.padEnd(8)}][${r.category.padEnd(13)}] ${r.title.slice(0, 80)}`);
  }

  console.log(`\nCOMPLIANCE SCORE: ${compliance.overallScore}/100`);
  for (const reg of compliance.applicableRegulations) {
    console.log(`  ${reg.name}: ${reg.status}`);
    if (reg.gaps.length) console.log(`    gaps: ${reg.gaps.join('; ')}`);
  }

  console.log(`\nSHADOW AI: ${shadowAI.length} findings`);
  for (const s of shadowAI) {
    console.log(`  ${s.file.padEnd(35)} provider=${s.provider} governed=${s.governed}`);
  }

  console.log(`\nCERTIFICATION: ${certification.overall}`);

  // ══════════════════════════════════════════════════════════
  // SCORING
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('SCORING');
  console.log('='.repeat(70));

  // T1: CEO
  const ceoView = views.buildCEOView(engine);
  const ceoText = JSON.stringify(ceoView).toLowerCase();
  const t1Agents = result.source.agents;
  const t1 = {
    mentalHealth: t1Agents.some(a => /mental|health|assessment|cops[oó]q/i.test(a.name)),
    compliance: t1Agents.some(a => /compliance|regulat|audit/i.test(a.name)),
    voice: t1Agents.some(a => /voice|audio|speech/i.test(a.name)),
    platform: /platform|system|ecosystem/i.test(ceoText) || result.source.externalServices.length > 0,
  };

  // T2: CFO
  const costProviders = new Set(result.source.aiModels.map(m => m.provider));
  const costSvcs = [...result.source.externalServices.map(s => s.name), ...result.packages.cloudDependencies, ...result.packages.dbDependencies.map(d => d.replace(/^@/, '').split('/')[0])];
  const costCenters = Array.from(new Set([...costProviders, ...costSvcs]));
  const expectedCosts = ['OpenAI', 'DeepSeek', 'Mistral', 'Supabase'];
  const t2 = costCenters.filter(c => expectedCosts.some(ec => c.toLowerCase().includes(ec.toLowerCase())));

  // T3: CISO
  const cisoFindings = {
    rlsBypass: risks.some(r => r.id === 'RISK-NO-RLS'),
    noLicense: risks.some(r => r.id === 'RISK-NO-LICENSE'),
    devUnlock: fileNames.some(f => /dev|unlock|bypass/i.test(f)),
    noRateLimit: !source.authPatterns.some(a => /rate.?limit|throttle/i.test(a)),
    noCSP: risks.some(r => r.id === 'RISK-NO-CSP'),
    noAuditChain: !fileNames.some(f => /audit|log|trace/i.test(f)),
  };
  const t3 = Object.values(cisoFindings).filter(Boolean).length;

  // T4: DPO
  const piiAssets = source.dataAssets.filter(d => d.hasPII);
  const piiNames = piiAssets.map(d => d.name.toLowerCase());
  const t4 = {
    voice: piiNames.some(n => /voice|audio/i.test(n)),
    phq9: piiNames.some(n => /phq|assessment|survey/i.test(n)),
    copsoq: piiNames.some(n => /cops[oó]q|questionnaire/i.test(n)),
    identifiable: piiNames.some(n => /user|profile|name|email|cpf|phone|address|document|consent|health|mental|employee/i.test(n)),
  };

  // T5: AI Act
  const aiActView = views.buildAIActView(engine);
  const aiActText = JSON.stringify(aiActView).toLowerCase();
  const aiActHighRisk = /high.?risk|alto.?risco/i.test(aiActText);
  const aiActOversight = /oversight|supervis[iã]o/i.test(aiActText);

  // T6: Agent Governance
  const agentNames = source.agents.map(a => a.name.toLowerCase());
  const a6 = {
    voice: agentNames.some(n => /voice|audio|speech/i.test(n)),
    mental: agentNames.some(n => /mental|health|assessment|wellbeing|cops[oó]q/i.test(n)),
    compliance: agentNames.some(n => /compliance|regulat|audit|governance/i.test(n)),
    risk: agentNames.some(n => /risk|monitor|threat/i.test(n)),
    report: agentNames.some(n => /report|dashboard|export/i.test(n)),
  };

  // T7: Graph
  const expectedKinds = ['owner', 'tool', 'external_system', 'data_asset', 'model', 'agent', 'risk', 'regulation', 'evidence'];
  const t7 = expectedKinds.map(k => ({ kind: k, found: engine.getEntitiesByKind(k as any).length > 0 }));
  const entityKindSet = new Set(expectedKinds.filter(k => engine.getEntitiesByKind(k as any).length > 0));

  // T8: Board
  const topRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');

  // T9: Shadow AI
  const ungovernedCount = shadowAI.filter(s => !s.governed).length;
  const hasShadowAIRisk = risks.some(r => r.id === 'RISK-SHADOW-AI');

  // T10: Certification
  const certOverall = certification.overall;

  // ── Score table ────────────────────────────────────────
  const scores: Record<string, { ok: number; total: number; notes: string }> = {
    T1_BusinessDiscovery: {
      ok: [t1.mentalHealth, t1.compliance, t1.voice, t1.platform].filter(Boolean).length,
      total: 4,
      notes: `mental=${t1.mentalHealth} compliance=${t1.compliance} voice=${t1.voice} platform=${t1.platform}`,
    },
    T2_CFO_CostDiscovery: {
      ok: t2.length,
      total: 4,
      notes: `found ${t2.length}/4: ${t2.join(', ')}`,
    },
    T3_CISO_SecurityDiscovery: {
      ok: t3,
      total: 6,
      notes: `${t3}/6: ${JSON.stringify(cisoFindings)}`,
    },
    T4_DPO_PIIDiscovery: {
      ok: [t4.voice, t4.phq9, t4.copsoq, t4.identifiable].filter(Boolean).length,
      total: 4,
      notes: `voice=${t4.voice} phq9=${t4.phq9} copsoq=${t4.copsoq} pii=${t4.identifiable}`,
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
      notes: `${topRisks.length} top risks`,
    },
    T9_ShadowAI: {
      ok: (shadowAI.length > 0 ? 1 : 0) + (ungovernedCount > 0 ? 1 : 0) + (hasShadowAIRisk ? 1 : 0),
      total: 3,
      notes: `findings=${shadowAI.length} ungoverned=${ungovernedCount} risk=${hasShadowAIRisk}`,
    },
    T10_Certification: {
      ok: certOverall !== 'none' ? 1 : 0,
      total: 1,
      notes: `certification=${certOverall}`,
    },
  };

  console.log('\n┌──────────────────────────────────┬────────┬──────────────────────────────────────┐');
  console.log('│ Capability                       │ Score  │ Notes                                │');
  console.log('├──────────────────────────────────┼────────┼──────────────────────────────────────┤');
  for (const [key, s] of Object.entries(scores)) {
    const pct = s.total > 0 ? Math.round(s.ok / s.total * 100) : 0;
    const bar = pct >= 80 ? '✓' : pct >= 40 ? '◐' : '✗';
    console.log(`│ ${key.padEnd(32)}│  ${bar} ${String(pct).padStart(2)}/${String(s.total).padStart(2)}  │ ${s.notes.padEnd(36)} │`);
  }
  console.log('├──────────────────────────────────┼────────┼──────────────────────────────────────┤');
  const totalOk = Object.values(scores).reduce((sum, s) => sum + s.ok, 0);
  const totalMax = Object.values(scores).reduce((sum, s) => sum + s.total, 0);
  const overallPct = Math.round(totalOk / totalMax * 100);
  const overallBar = overallPct >= 80 ? '✓' : overallPct >= 40 ? '◐' : '✗';
  console.log(`│ ${'OVERALL'.padEnd(32)} │  ${overallBar} ${String(overallPct).padStart(2)}%   │ ${totalOk}/${totalMax} points${' '.repeat(22)} │`);
  console.log('└──────────────────────────────────┴────────┴──────────────────────────────────────┘');

  // Detailed test outputs
  console.log('\n' + '='.repeat(70));
  console.log('DETAILED OUTPUT PER TEST');
  console.log('='.repeat(70));

  // T1 CEO detail
  console.log(`\n## T1 — CEO VIEW`);
  console.log(`Title: ${ceoView.title}`);
  console.log(`Desc: ${ceoView.description}`);
  console.log(`Summary: ${JSON.stringify(ceoView.summary)}`);

  // T2 CFO detail
  console.log(`\n## T2 — CFO VIEW`);
  console.log(`Cost centers: [${costCenters.join(', ')}]`);
  console.log(`Expected matched: [${t2.join(', ')}]`);

  // T3 CISO detail
  console.log(`\n## T3 — CISO VIEW`);
  const cisoView = views.buildCISOView(engine);
  console.log(`Summary: ${JSON.stringify(cisoView.summary)}`);

  // T4 DPO detail
  console.log(`\n## T4 — DPO VIEW`);
  console.log(`PII assets: [${piiNames.join(', ')}]`);

  // T5 AI Act detail
  console.log(`\n## T5 — AI ACT VIEW`);
  console.log(`Classification: ${aiActView.summary.classification}`);
  if (aiActView.cards) for (const c of aiActView.cards) console.log(`  ${c.title}: ${c.value}`);

  // T6 Agent detail
  console.log(`\n## T6 — AGENT GOVERNANCE VIEW`);
  const agentView = views.buildAgentGovernanceView(engine);
  console.log(`Summary: ${JSON.stringify(agentView.summary)}`);

  // T7 Graph detail
  console.log(`\n## T7 — GRAPH RECONSTRUCTION`);
  const totalEntities = expectedKinds.reduce((sum, k) => sum + engine.getEntitiesByKind(k as any).length, 0);
  console.log(`Total entities: ${totalEntities}, Relationships: ${engine.getRelationships().length}`);
  console.log(`Entity kinds: [${Array.from(entityKindSet).join(', ')}]`);

  // T8 Board detail
  console.log(`\n## T8 — BOARD VIEW`);
  console.log(`Top ${topRisks.length} risks:`);
  for (const r of topRisks.slice(0, 10)) console.log(`  [${r.severity}] ${r.title}`);

  // T9 Shadow AI
  console.log(`\n## T9 — SHADOW AI`);
  console.log(`Findings: ${shadowAI.length}, Ungoverned: ${ungovernedCount}, Risk created: ${hasShadowAIRisk}`);

  // T10 Certification
  console.log(`\n## T10 — CERTIFICATION`);
  console.log(`Overall: ${certOverall}`);
  for (const [level, data] of Object.entries(certification.levels)) {
    console.log(`  ${level.toUpperCase()}: ${data.pass ? 'PASS' : 'FAIL'}`);
    for (const e of data.evidence) console.log(`    ✓ ${e}`);
    for (const f of data.fail) console.log(`    ✗ ${f}`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
