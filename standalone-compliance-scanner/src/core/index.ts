import type { ScannerRequest, ScannerResult, OwnerInfo, PackageAnalysis, ScannerEnrichment } from './types';
import { fetchRepoMetadata, fetchFileContent, fetchFileTree, fetchLanguages, parseRepoUrl } from './github';import { analyzePackageJson, analyzeConfigs, analyzeSourceCode, aggregatePackages } from './analyzer';
import { detectRisks, detectFinOpsRisks } from './risk-detector';
import { analyzeCompliance } from './compliance';
import { detectShadowAI } from './shadow-ai';
import { certifySystem } from './certification';
import { mapToGraphOS } from './graphos-mapper';
import { scanCodeViolations } from './violations';
import { aggregatePII } from './enrichment/lgpd-pii';
import { traceDataFlows } from './enrichment/lineage';
import { inferTrustZone } from './enrichment/trust-zone';
import { classifyAllAgents, summarizeAIAct } from './classifier';
import type { AgentClassification, RepoAIActSummary } from './classifier';
import { estimateModelCost } from './model-parser';
import { detectCiCd, detectIacAi, getConnectorForUrl, buildConfig } from '@council/scanner';
import { GraphEngine } from '@council/graphos';
import { cacheScannerResult } from '@/graphos/scanner-cache';

const KEY_FILES = [
  'package.json', 'tsconfig.json', '.eslintrc.js', '.eslintrc.json', '.eslintrc',
  'eslint.config.mjs', '.prettierrc', 'next.config.js', 'next.config.mjs', 'next.config.ts',
  'Dockerfile', 'docker-compose.yml', 'README.md', '.env.example',
];

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go', '.rb', '.java'];
const PACKAGE_JSON_PATTERN = /\/package\.json$/;

export async function discoverRepo(request: ScannerRequest): Promise<ScannerResult & { graphosEngine: GraphEngine }> {
  const { repoUrl, branch, githubToken } = request;

  // ── Connector auto-detect: GitHub stays on cached path; others use SDK ──
  const connCfg = buildConfig(repoUrl, {
    token: githubToken, branch,
    organization: request.organization,
    baseUrl: request.baseUrl,
  });
  if (request.provider) (connCfg as any).provider = request.provider;

  const { connector } = getConnectorForUrl(repoUrl);
  const isGitHub = connCfg.provider === 'github';

  // Resolve owner/repo for legacy GitHub path
  let owner = '', repo = '';
  if (isGitHub) ({ owner, repo } = parseRepoUrl(repoUrl));

  const connMeta = await connector.fetchMeta(connCfg);
  const actualBranch = branch ?? connMeta.defaultBranch;

  // File tree
  const rawTree = await connector.fetchTree(connCfg, actualBranch);
  const actualFileTree = rawTree;
  const fileNames = actualFileTree.map((f: { path: string }) => f.path);

  // For backward-compat, keep the legacy repoMeta shape
  const repoMeta = isGitHub
    ? await fetchRepoMetadata(owner, repo, githubToken)
    : {
        name: connMeta.name, owner: connMeta.owner, fullName: connMeta.fullName,
        description: connMeta.description, homepage: null,
        stars: connMeta.stars, forks: connMeta.forks, language: connMeta.language,
        defaultBranch: connMeta.defaultBranch, createdAt: connMeta.createdAt,
        updatedAt: connMeta.updatedAt, pushedAt: connMeta.updatedAt,
        hasLicense: connMeta.hasLicense, licenseName: connMeta.licenseName,
        fileCount: connMeta.fileCount, totalSize: 0, topics: connMeta.topics,
      };

  const languages = isGitHub
    ? await fetchLanguages(owner, repo, githubToken)
    : await connector.fetchLanguages(connCfg);

  // Key files
  const fileContentsMap = new Map<string, string>();
  const readFile = (p: string) => connector.fetchFile(connCfg, p, actualBranch);
  await Promise.all(KEY_FILES.map(async f => {
    const c = await readFile(f);
    if (c) fileContentsMap.set(f, c);
  }));

  const subPackagePaths = actualFileTree
    .filter((f: { path: string }) => PACKAGE_JSON_PATTERN.test(f.path) && f.path !== 'package.json')
    .slice(0, 10)
    .map((f: { path: string }) => f.path);

  const subPackageContents = await Promise.all(
    subPackagePaths.map((p: string) => readFile(p).then(c => ({ path: p, content: c })))
  );
  for (const { path, content } of subPackageContents) {
    if (content) fileContentsMap.set(path, content);
  }

  const importantPaths = actualFileTree
    .filter((f: { path: string }) => SOURCE_EXTENSIONS.some(ext => f.path.endsWith(ext)))
    .filter((f: { path: string }) =>
      f.path.includes('/api/') || f.path.includes('middleware') ||
      f.path.includes('/lib/') || f.path.includes('/app/') ||
      f.path.startsWith('src/') || f.path === 'index.ts' ||
      f.path.endsWith('layout.tsx') || f.path.endsWith('page.tsx') ||
      f.path.includes('/migrations/') || f.path.includes('/policies/') ||
      f.path.includes('/agents/') || f.path.includes('/tools/') ||
      f.path.includes('/services/') || f.path.includes('/providers/')
    )
    .slice(0, 100)
    .map((f: { path: string }) => f.path);

  const sourceContents = await Promise.all(
    importantPaths.map((p: string) => readFile(p).then(c => ({ path: p, content: c })))
  );
  for (const { path, content } of sourceContents) {
    if (content) fileContentsMap.set(path, content);
  }

  const packageJson = fileContentsMap.get('package.json') ?? null;
  const tsconfigContent = fileContentsMap.get('tsconfig.json') ?? null;
  const eslintContent = fileContentsMap.get('eslint.config.mjs') ?? fileContentsMap.get('.eslintrc.json') ?? fileContentsMap.get('.eslintrc.js') ?? null;

  const rootPackages = analyzePackageJson(packageJson);
  const subPackages: PackageAnalysis[] = [];
  for (const sp of subPackagePaths) {
    const content = fileContentsMap.get(sp);
    if (content) subPackages.push(analyzePackageJson(content));
  }
  const packages = aggregatePackages(rootPackages, subPackages);

  const configs = analyzeConfigs(packageJson, fileNames, tsconfigContent, eslintContent);
  const source = analyzeSourceCode(fileContentsMap, fileNames, languages);

  // ── Config-file agent detection (MCP, Claude Code, Cursor Origin, agents.md, opencode) ──
  // Agents declared in config files: definitive detection by path + parse.
  try {
    const { detectConfigAgents } = await import('@council/scanner');
    const configFilePattern = /(^|\/)(\.mcp\.json|mcp\.json|claude_desktop_config\.json|mcp_config\.json|CLAUDE\.md|AGENTS?\.md|opencode\.jsonc?|\.cursorrules)$|(^|\/)\.(claude|cursor|opencode)\//i;
    const configPaths = fileNames.filter(p => configFilePattern.test(p)).slice(0, 30);
    for (const p of configPaths) {
      if (!fileContentsMap.has(p) && /\.(json|jsonc)$/i.test(p)) {
        const content = await readFile(p);
        if (content) fileContentsMap.set(p, content);
      }
    }
    const configAgents = await detectConfigAgents(
      configPaths.map(p => ({ path: p, name: p.split('/').pop() ?? p, type: 'file' as const })),
      async (p: string) => fileContentsMap.get(p) ?? '',
    );
    for (const ca of configAgents) {
      if (source.agents.some(a => a.name === ca.name)) continue;
      source.agents.push({
        name: ca.name,
        type: 'service',
        tools: ca.capabilities,
        models: [],
        riskLevel: (['low', 'medium', 'high', 'critical'].includes(ca.suggestedRiskLevel) ? ca.suggestedRiskLevel : 'medium') as 'low' | 'medium' | 'high' | 'critical',
        critical: false,
        framework: ca.framework,
        oversightLevel: ca.suggestedOversightLevel,
        isAutonomous: ca.isAutonomous,
        confidence: ca.confidence,
        filePath: ca.filePath,
      });
    }
  } catch (e) {
    console.warn('[Scanner] Config-agent detection skipped:', e instanceof Error ? e.message : e);
  }

  const shadowAI = detectShadowAI(fileContentsMap, source);

  // ── Violation Scanning (PCI, SQLI, XSS, secrets, PII + legacy GDPR/LGPD/CCPA/HIPAA/AI-Act) ──
  const { violations } = scanCodeViolations(fileContentsMap);

  // ── Enrichment Layer (LGPD PII, lineage, trust zone) ──
  const piiEnrichment = aggregatePII(fileContentsMap);
  const trustZone = inferTrustZone(fileContentsMap, fileNames);
  const fileInfoList = importantPaths.map(p => ({ path: p, content: fileContentsMap.get(p) ?? '' }));
  const lineage = traceDataFlows(fileInfoList);
  const enrichment: ScannerEnrichment = { pii: piiEnrichment, lineage, trustZone, codeMap: null };

  // ── Model Cost Estimation ──
  const totalMonthlyCost = source.aiModels.reduce((sum, m) => sum + estimateModelCost(m.provider, m.modelId), 0);
  const estimatedMonthlyTokens = source.aiModels.length * 1000000;

  // ── Agent Classification ──
  const agentClassifications = classifyAllAgents(source.agents, source, packages);
  const aiActSummary = summarizeAIAct(agentClassifications);

  // ── Merge violations + FinOps into risks ──
  const risks = detectRisks(packages, configs, source, fileNames, shadowAI);
  for (const v of violations) {
    risks.push({
      id: v.rule,
      severity: v.severity,
      category: v.category === 'pci' || v.category === 'owasp' ? 'security' : v.category === 'gdpr' ? 'compliance' : 'operational',
      title: v.message.split('.')[0],
      description: v.message,
      file: v.file,
      line: v.line,
      recommendation: v.recommendation,
    });
  }

  // FinOps: N+1 LLM calls, missing timeout, missing rate-limit
  const finOpsRisks = detectFinOpsRisks(source, fileContentsMap);
  risks.push(...finOpsRisks);

  const compliance = await analyzeCompliance(packages, source, risks, configs);
  const certification = certifySystem(source, risks, compliance, packages);

  // ── CI/CD + IaC AI signals (file-based, zero extra API calls) ──
  const allFilesForCiCd = actualFileTree.map((f: { path: string }) => ({ path: f.path, name: f.path.split('/').pop() ?? f.path }));
  const readFileFn = async (p: string): Promise<string | null> =>
    fileContentsMap.get(p) ?? await readFile(p);
  const [cicd, iacAi] = await Promise.all([
    detectCiCd(allFilesForCiCd, readFileFn).catch(() => []),
    detectIacAi(allFilesForCiCd, readFileFn).catch(() => []),
  ]);

  // IaC AI resources become risks if not governed
  for (const iac of iacAi) {
    risks.push({
      id: `iac-ai-${iac.cloud}-${iac.service.toLowerCase().replace(/\s+/g, '-')}`,
      severity: iac.riskLevel === 'high' ? 'high' : iac.riskLevel === 'medium' ? 'medium' : 'low',
      category: 'compliance',
      title: `${iac.service} deployment not governed`,
      description: `IaC file ${iac.configPath} declares ${iac.service} (${iac.cloud.toUpperCase()}). No governance record found. CG-AG-003 Model Registration required.`,
      file: iac.configPath,
      recommendation: `Register ${iac.service} model/service in the agent registry. Apply CG-AG-003 (Model Registration) and CG-AG-004 (Tool Authorisation).`,
      cgagControl: 'CG-AG-003',
    });
  }

  const ownerInfo: OwnerInfo = {
    id: `sc-owner-${owner}`,
    label: owner,
    email: '',
    role: 'head_ai',
    teams: ['Engineering'],
  };

  const result: ScannerResult = {
    repo: repoMeta,
    packages,
    configs,
    source,
    risks,
    compliance,
    owner: ownerInfo,
    shadowAI,
    certification,
    violations,
    enrichment,
    agentClassifications,
    aiActSummary,
    cicd,
    iacAi,
    _costEstimate: {
      totalMonthlyUsd: totalMonthlyCost,
      estimatedMonthlyTokens,
      modelCount: source.aiModels.length,
      providerSummary: source.aiModels.reduce((acc: Record<string, number>, m) => {
        acc[m.provider] = (acc[m.provider] || 0) + 1;
        return acc;
      }, {}),
    },
  } as any;

  // ── Build GraphEngine ──────────────────────────────────────────────────────
  const { entities, relationships } = mapToGraphOS(result);
  const graphosEngine = new GraphEngine();
  for (const e of entities) graphosEngine.addEntity(e);
  for (const r of relationships) graphosEngine.addRelationship(r);

  // ── Auto-save to scanner cache so all downstream consumers get real data ──
  cacheScannerResult(repoUrl, graphosEngine, result);

  return { ...result, graphosEngine };
}

export { parseRepoUrl } from './github';
