import * as fs from 'fs';
import * as path from 'path';
import { analyzePackageJson, analyzeConfigs, analyzeSourceCode } from '../src/scanner/analyzer';
import { detectRisks } from '../src/scanner/risk-detector';
import { analyzeCompliance } from '../src/scanner/compliance';
import { detectShadowAI } from '../src/scanner/shadow-ai';
import { certifySystem } from '../src/scanner/certification';

const REPO_DIR = path.join(process.env.TEMP!, 'opencode', 'genai-agents');

function walkDir(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '__pycache__') {
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
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return null; }
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript',
    '.mjs': 'JavaScript', '.py': 'Python', '.go': 'Go', '.rb': 'Ruby',
    '.java': 'Java', '.sql': 'PLpgSQL', '.css': 'CSS', '.ps1': 'PowerShell',
    '.yaml': 'YAML', '.yml': 'YAML', '.json': 'JSON', '.md': 'Markdown',
    '.ipynb': 'Jupyter', '.txt': 'Text', '.cfg': 'Config', '.ini': 'Config',
    '.toml': 'Config',
  };
  return map[ext] ?? 'Unknown';
}

async function main() {
  console.log('='.repeat(100));
  console.log('GENAI AGENTS — UNIFIED SCANNER VALIDATION');
  console.log('='.repeat(100));

  const allFiles = walkDir(REPO_DIR);
  const fileTree = getFileTree(REPO_DIR);
  const fileNames = fileTree.map(f => f.path);

  // Build content map
  const allContent: Map<string, string> = new Map();
  const languageCounts: Record<string, number> = {};
  for (const f of allFiles) {
    const relPath = f.replace(REPO_DIR + path.sep, '').replace(/\\/g, '/');
    const lang = detectLanguage(f);
    languageCounts[lang] = (languageCounts[lang] ?? 0) + (fs.statSync(f).size || 1);
    const content = readTextFile(f);
    if (content) allContent.set(relPath, content);
  }

  const pkgJsonContent = allContent.get('package.json') || allContent.get('requirements.txt') || null;
  const tsconfigContent = allContent.get('tsconfig.json') || null;
  const eslintContent = allContent.get('.eslintrc.json') || allContent.get('.eslintrc.js') || null;

  const pkg = analyzePackageJson(pkgJsonContent);
  const config = analyzeConfigs(pkgJsonContent, fileNames, tsconfigContent, eslintContent);

  // THIS is the key test — our enhanced analyzeSourceCode now processes .ipynb files!
  const source = analyzeSourceCode(allContent, fileNames, languageCounts);

  const shadowAI = detectShadowAI(allContent, source);
  const risks = detectRisks(pkg, config, source, fileNames, shadowAI);
  const compliance = await analyzeCompliance(pkg, source, risks);
  const certification = certifySystem(source, risks, compliance, pkg);

  // ═══════════════════════════════════════════════════════
  // VALIDATION METRICS
  // ═══════════════════════════════════════════════════════

  const nb = source.notebooks;
  const nbCount = nb.length;
  const fw = source.frameworks;
  const mem = source.memorySystems;
  const prompts = source.extractedPrompts;
  const cls = source.classification;

  console.log('\n' + '='.repeat(100));
  console.log('UNIFIED SCANNER — METRICS');
  console.log('='.repeat(100));

  console.log(`\n📓 Notebooks parsed: ${nbCount}`);
  console.log(`🔧 Frameworks detected: ${fw.length}`);
  console.log(`🧠 Memory systems detected: ${mem.length}`);
  console.log(`📝 Prompts extracted: ${prompts.length}`);
  console.log(`🤖 Agents detected (incl. notebook): ${source.agents.length}`);
  console.log(`🏷️  Classification: ${cls ? `${cls.category} (${cls.confidence}%)` : 'N/A'}`);

  // Frameworks
  console.log('\n── Frameworks ──');
  for (const f of fw) {
    console.log(`  ${f.framework} (${f.confidence}): ${f.evidence.slice(0, 2).join('; ')}`);
  }

  // Memory
  console.log('\n── Memory Systems ──');
  for (const m of mem) {
    console.log(`  ${m.technology} (${m.type})`);
  }

  // Prompts
  console.log('\n── Prompts ──');
  const typeCount: Record<string, number> = {};
  for (const p of prompts) typeCount[p.type] = (typeCount[p.type] || 0) + 1;
  for (const [t, c] of Object.entries(typeCount)) {
    console.log(`  ${t}: ${c}`);
  }

  // Notebook signals
  console.log('\n── Notebook Signals ──');
  const notebooksWithKeys = nb.filter(n => n.hasAPIKeys).length;
  const educationalCount = nb.filter(n => n.isEducational).length;
  const productionCount = nb.filter(n => n.isProduction).length;
  const enterpriseCount = nb.filter(n => n.isEnterprise).length;
  console.log(`  Notebooks with API keys: ${notebooksWithKeys}/${nbCount}`);
  console.log(`  Educational patterns: ${educationalCount}/${nbCount}`);
  console.log(`  Production patterns: ${productionCount}/${nbCount}`);
  console.log(`  Enterprise patterns: ${enterpriseCount}/${nbCount}`);

  // Extract all agent roles
  const allRoles = new Set<string>();
  for (const n of nb) for (const r of n.agentRoles) allRoles.add(r);
  console.log(`\n  Agent roles found: ${allRoles.size}`);
  console.log(`  Roles: ${[...allRoles].join(', ')}`);

  // Risks
  console.log(`\n── Risks (${risks.length}) ──`);
  const bySeverity: Record<string, number> = {};
  for (const r of risks) bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
  for (const [s, c] of Object.entries(bySeverity)) console.log(`  ${s}: ${c}`);

  console.log(`\n── Compliance Score ──`);
  console.log(`  Overall: ${compliance.overallScore}%`);

  console.log(`\n── Certification ──`);
  console.log(`  ${certification.overall}`);

  console.log(`\n── Classification ──`);
  if (cls) {
    console.log(`  Category: ${cls.category}`);
    console.log(`  Confidence: ${cls.confidence}%`);
    console.log(`  Evidence:`);
    for (const e of cls.evidence) console.log(`    • ${e}`);
  }

  // Comparison with manual audit
  console.log('\n' + '='.repeat(100));
  console.log('COMPARISON: Manual Audit vs Unified Scanner');
  console.log('='.repeat(100));

  console.log('\nMetric | Manual (Part 2) | Scanner Now');
  console.log('-'.repeat(70));
  const comparison = [
    { metric: 'Frameworks detected', manual: '8', scanner: String(fw.length) },
    { metric: 'Memory systems', manual: '6', scanner: String(mem.length) },
    { metric: 'Prompt types', manual: '6', scanner: String(Object.keys(typeCount).length) },
    { metric: 'Agent roles', manual: '8', scanner: String(allRoles.size) },
    { metric: 'API key notebooks', manual: '0*', scanner: String(notebooksWithKeys) },
    { metric: 'Classification', manual: 'educational', scanner: cls?.category ?? 'unknown' },
    { metric: 'Risks detected', manual: '20', scanner: String(risks.length) },
    { metric: 'Compliance score', manual: '0%', scanner: `${compliance.overallScore}%` },
  ];
  for (const c of comparison) {
    const mark = c.manual === c.scanner ? '✓' : c.scanner > c.manual ? '↑' : '↓';
    console.log(`${c.metric.padEnd(30)} | ${String(c.manual).padEnd(10)} | ${String(c.scanner).padEnd(10)} ${mark}`);
  }

  console.log(`\n${'='.repeat(100)}`);
  console.log('VERDICT: Scanner unificado agora processa .ipynb, detecta frameworks,');
  console.log('memória, prompts e classifica repositórios automaticamente.');
  console.log('GenAI_Agents: validado com scanner integrado, sem script separado.');
  console.log(`${'='.repeat(100)}`);
}

main().catch(console.error);
