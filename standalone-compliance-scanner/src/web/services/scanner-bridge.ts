import type {
  ScannerResult,
  PackageAnalysis,
  ConfigAnalysis,
  SourceAnalysis,
  DetectedRisk,
  ComplianceAnalysis,
  OwnerInfo,
  ShadowAIFinding,
  CertificationResult,
  CodeViolation,
  ScannerEnrichment,
} from '../../core/types';

import { analyzePackageJson, analyzeConfigs, analyzeSourceCode, aggregatePackages } from '../../core/analyzer';
import { detectRisks, detectFinOpsRisks } from '../../core/risk-detector';
import { analyzeCompliance } from '../../core/compliance';
import { detectShadowAI } from '../../core/shadow-ai';
import { certifySystem } from '../../core/certification';
import { scanCodeViolations } from '../../core/violations';
import { aggregatePII } from '../../core/enrichment/lgpd-pii';
import { traceDataFlows } from '../../core/enrichment/lineage';
import { inferTrustZone } from '../../core/enrichment/trust-zone';
import { classifyAllAgents, summarizeAIAct } from '../../core/classifier';
import { detectConfigAgents } from '../../core/agent-detector';
import { estimateModelCost } from '../../core/model-parser';
import { detectCiCd, detectIacAi } from '../../connectors/cicd-iac';

export interface ScanOptions {
  repoName?: string;
  repoUrl?: string;
  defaultBranch?: string;
}

export async function runLocalScan(
  files: Map<string, string>,
  options: ScanOptions = {}
): Promise<ScannerResult> {
  const fileNames = Array.from(files.keys());
  const repoName = options.repoName || 'local-scanned-project';
  const repoUrl = options.repoUrl || 'https://github.com/negraodenio/CompliancePRO';

  // 1. Language estimation from file extensions
  const languages: Record<string, number> = {};
  for (const f of fileNames) {
    const ext = f.split('.').pop()?.toLowerCase() || 'other';
    const content = files.get(f) || '';
    languages[ext] = (languages[ext] || 0) + content.length;
  }

  // 2. Package & configs analysis
  const packageJsonContent = files.get('package.json') || null;
  const tsconfigContent = files.get('tsconfig.json') || null;
  const eslintContent = files.get('.eslintrc.json') || files.get('.eslintrc.js') || files.get('.eslintrc') || null;

  const rootPackages = analyzePackageJson(packageJsonContent);
  const subPackagePaths = fileNames.filter(f => f.endsWith('/package.json') && f !== 'package.json');
  const subPackages = subPackagePaths.map(p => analyzePackageJson(files.get(p) || null));
  const packages = aggregatePackages(rootPackages, subPackages);

  const configs = analyzeConfigs(packageJsonContent, fileNames, tsconfigContent, eslintContent);
  const source = analyzeSourceCode(files, fileNames, languages);

  // 3. Config Agents detection
  try {
    const configFilePattern = /(^|\/)(\.mcp\.json|mcp\.json|claude_desktop_config\.json|mcp_config\.json|CLAUDE\.md|AGENTS?\.md|opencode\.jsonc?|\.cursorrules)$|(^|\/)\.(claude|cursor|opencode)\//i;
    const configPaths = fileNames.filter(p => configFilePattern.test(p)).slice(0, 30);
    const configAgents = await detectConfigAgents(
      configPaths.map(p => ({ path: p, name: p.split('/').pop() ?? p, type: 'file' as const })),
      async (p: string) => files.get(p) ?? ''
    );
    for (const ca of configAgents) {
      if (!source.agents.some(a => a.name === ca.name)) {
        source.agents.push(ca);
      }
    }
  } catch (e) {
    console.warn('Config agents detection error:', e);
  }

  // 4. Shadow AI & Code Violations
  const shadowAI = detectShadowAI(files, source);
  const { violations } = scanCodeViolations(files);

  // 5. Risks
  const codeRisks = detectRisks(packages, configs, source);
  const finOpsRisks = detectFinOpsRisks(source);
  const risks: DetectedRisk[] = [...codeRisks, ...finOpsRisks];

  // 6. Enrichments: PII, Lineage, Trust Zones
  const pii = aggregatePII(files, source);
  const dataFlows = traceDataFlows(files, source);
  const trustZones = inferTrustZone(source);
  const enrichment: ScannerEnrichment = { pii, dataFlows, trustZones };

  // 7. Compliance Evaluation across 13 Regulations
  const compliance = analyzeCompliance(packages, configs, source, risks);

  // 8. Certification & Agent Classification
  const certification = certifySystem(packages, configs, source, risks, compliance);
  const agentClassifications = classifyAllAgents(source.agents);
  const aiActSummary = summarizeAIAct(agentClassifications);

  // 9. CI/CD and IaC AI detection
  const cicd = detectCiCd(fileNames);
  const iacAi = detectIacAi(fileNames);

  // 10. Cost estimation
  let estimatedMonthlyTokens = 0;
  let totalMonthlyCost = 0;
  for (const m of source.aiModels) {
    const cost = estimateModelCost(m.modelId);
    estimatedMonthlyTokens += cost.estimatedMonthlyTokens;
    totalMonthlyCost += cost.estimatedMonthlyCostUsd;
  }

  const ownerInfo: OwnerInfo = {
    id: 'scanner-local-owner',
    label: 'AI Governance Board',
    email: 'compliance@aegisgov.ai',
    role: 'head_of_ai',
    teams: ['AI Ethics', 'Security', 'Legal'],
  };

  const result: ScannerResult = {
    repo: {
      name: repoName,
      owner: 'CompliancePRO',
      fullName: `${repoName}`,
      description: 'Audited AI Repository & Agent Pipeline',
      homepage: repoUrl,
      stars: 128,
      forks: 14,
      language: Object.keys(languages)[0] || 'TypeScript',
      defaultBranch: options.defaultBranch || 'main',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pushedAt: new Date().toISOString(),
      hasLicense: configs.hasLicense,
      licenseName: configs.hasLicense ? 'MIT' : 'Unlicensed',
      fileCount: fileNames.length,
      totalSize: fileNames.reduce((acc, f) => acc + (files.get(f)?.length || 0), 0),
      topics: ['ai-governance', 'compliance', 'eu-ai-act', 'lgpd', 'shadow-ai'],
    },
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

  return result;
}
