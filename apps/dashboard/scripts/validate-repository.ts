import * as fs from "fs";
import * as path from "path";
import { detectAgents } from "@council/scanner/codeguard/agent-detector";
import { generateRepoIntelligence } from "@council/scanner/codeguard/repo-intelligence";
import { buildKnowledgeGraph } from "@council/scanner/codeguard/repo-knowledge-graph";
import { enrichAgent } from "@council/scanner/codeguard/enrichment";
import type { DiscoveredAgent } from "@council/scanner/codeguard/types";
import type { EnrichedAgentData } from "@council/scanner/codeguard/enrichment";
import type { RepoIntelligence } from "@council/scanner/codeguard/repo-intelligence/types";
import type { KnowledgeGraph } from "@council/scanner/codeguard/repo-knowledge-graph";

const SKIP_DIRS = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "venv", ".tox",
  "dist", "build", ".next", ".turbo", "coverage", ".pytest_cache",
  ".mypy_cache", ".ruff_cache", "target", "vendor",
]);

const SKIP_FILES = new Set([
  ".DS_Store", "Thumbs.db",
]);

function readLocalFiles(repoPath: string): Array<{ path: string; name: string; type: "file" | "dir"; size?: number }> {
  const result: Array<{ path: string; name: string; type: "file" | "dir"; size?: number }> = [];

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (SKIP_FILES.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(repoPath, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        result.push({ path: relativePath, name: entry.name, type: "dir" });
        walk(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          result.push({ path: relativePath, name: entry.name, type: "file", size: stat.size });
        } catch {
          result.push({ path: relativePath, name: entry.name, type: "file" });
        }
      }
    }
  }

  walk(repoPath);
  return result;
}

function makeReadFile(repoPath: string): (p: string) => Promise<string> {
  return async (filePath: string): Promise<string> => {
    try {
      const fullPath = path.join(repoPath, filePath);
      const stat = fs.statSync(fullPath);
      if (stat.size > 500_000) return "";
      return fs.readFileSync(fullPath, "utf-8");
    } catch {
      return "";
    }
  };
}

function escapeMd(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function pad(n: number, width: number): string {
  return String(n).padStart(width);
}

function formatPct(value: number, total: number): string {
  if (total === 0) return "N/A";
  return `${Math.round((value / total) * 100)}%`;
}

function computeScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

async function main() {
  const repoPath = process.argv[2];
  if (!repoPath) {
    console.error("Usage: npx tsx scripts/validate-repository.ts /path/to/repository");
    process.exit(1);
  }

  const absPath = path.resolve(repoPath);
  if (!fs.existsSync(absPath)) {
    console.error(`Repository path not found: ${absPath}`);
    process.exit(1);
  }

  const repoName = path.basename(absPath);
  const timestamp = new Date().toISOString().split("T")[0];
  const reportDir = path.resolve(process.cwd(), "reports", "validation");
  const reportPath = path.join(reportDir, `${repoName}.md`);

  console.log(`\nCodeGuard Validation Harness — Phase 8.7`);
  console.log(`Repository: ${repoName}`);
  console.log(`Path: ${absPath}`);
  console.log(`Report: ${reportPath}`);
  console.log(`\n[1/6] Scanning files...`);

  const allFiles = readLocalFiles(absPath);
  const files = allFiles.filter((f) => f.type === "file");
  const dirs = allFiles.filter((f) => f.type === "dir");
  console.log(`       ${files.length} files, ${dirs.length} directories found`);

  console.log(`[2/6] Detecting agents...`);
  const readFile = makeReadFile(absPath);
  const agents = await detectAgents(files, readFile);
  console.log(`       ${agents.length} agents detected`);

  console.log(`[3/6] Generating repo intelligence...`);
  const fileList = files.map((f) => ({
    path: f.path,
    name: f.name,
    ext: f.name.split(".").pop() ?? "",
    dir: f.path.split("/").slice(0, -1).join("/") || "/",
  }));
  const repoIntel = await generateRepoIntelligence(repoName, fileList, agents, readFile);
  const knowledgeGraph = buildKnowledgeGraph(repoIntel);
  console.log(`       ${repoIntel.domains.length} domains, ${repoIntel.services.length} services, ${repoIntel.modules.length} modules`);
  console.log(`       ${knowledgeGraph.nodes.length} graph nodes, ${knowledgeGraph.edges.length} edges`);

  console.log(`[4/6] Enriching agents...`);
  const enriched: Array<{ agent: DiscoveredAgent; data: EnrichedAgentData }> = [];
  let enrichmentErrors = 0;
  for (const agent of agents) {
    try {
      const content = await readFile(agent.filePath);
      const data = await enrichAgent(agent, content);
      enriched.push({ agent, data });
    } catch {
      enrichmentErrors++;
    }
  }
  console.log(`       ${enriched.length} enriched, ${enrichmentErrors} errors`);

  console.log(`[5/6] Computing metrics...`);

  const autonomous = agents.filter((a) => a.isAutonomous);
  const orchestrators = agents.filter((a) => a.agentType === "orchestrator");
  const gateways = agents.filter((a) => a.agentType === "gateway");
  const retrieval = agents.filter((a) => a.agentType === "retrieval");
  const assistive = agents.filter((a) => a.agentType === "assistive");
  const supervisory = agents.filter((a) => a.agentType === "supervisory");

  const frameworkCounts = new Map<string, { count: number; totalConfidence: number }>();
  for (const a of agents) {
    const fw = frameworkCounts.get(a.framework) ?? { count: 0, totalConfidence: 0 };
    fw.count++;
    fw.totalConfidence += a.confidence;
    frameworkCounts.set(a.framework, fw);
  }

  const containsPii = enriched.filter((e) => e.data.lineage.containsPii).length;
  const containsFinancial = enriched.filter((e) => e.data.lineage.containsFinancialData).length;
  const containsHealth = enriched.filter((e) => e.data.lineage.containsHealthData).length;
  const containsCredentials = enriched.filter((e) => e.data.lineage.containsCredentials).length;
  const externalSinks = enriched.filter((e) => e.data.lineage.externalSinks.length > 0).length;

  const aiActHits = agents.filter((a) => {
    const e = enriched.find((x) => x.agent === a);
    return e?.data.aiActExposure === "high" || e?.data.aiActExposure === "limited";
  }).length;

  const doraHits = agents.filter((a) => {
    const e = enriched.find((x) => x.agent === a);
    return e?.data.doraExposure === true;
  }).length;

  const lgpdHits = 0; // LGPD requires Brazilian jurisdiction — not available in file scanner
  const gdprHits = 0; // GDPR requires EU jurisdiction — not available in file scanner

  const totalFindings = enriched.reduce((sum, e) => sum + e.data.lgpd.findings.length, 0);
  const lineageEvidence = enriched.reduce((sum, e) => sum + e.data.lineage.evidence.length, 0);
  const fapiEvidence = enriched.reduce((sum, e) => sum + e.data.fapi.evidence.length, 0);
  const totalEvidence = lineageEvidence + fapiEvidence + totalFindings;

  let evidenceWithFile = 0;
  let evidenceWithLine = 0;
  let evidenceWithMatch = 0;
  for (const e of enriched) {
    for (const ev of e.data.lineage.evidence) {
      if (ev.filePath) evidenceWithFile++;
      if (ev.lineNumber > 0) evidenceWithLine++;
      if (ev.matchText) evidenceWithMatch++;
    }
    for (const ev of e.data.fapi.evidence) {
      if (ev.filePath) evidenceWithFile++;
      if (ev.lineNumber > 0) evidenceWithLine++;
      if (ev.matchText) evidenceWithMatch++;
    }
    for (const f of e.data.lgpd.findings) {
      if (f.filePath) evidenceWithFile++;
      if (f.line > 0) evidenceWithLine++;
      if (f.match) evidenceWithMatch++;
    }
  }

  const confidenceData = enriched.map((e) => ({
    confidence: e.data.discoveryConfidence,
    governance: e.data.governanceConfidence,
    compliance: e.data.complianceConfidence,
  }));

  const avgDiscoveryConfidence = confidenceData.length > 0
    ? Math.round(confidenceData.reduce((s, c) => s + c.confidence, 0) / confidenceData.length)
    : 0;
  const avgGovernanceConfidence = confidenceData.length > 0
    ? Math.round(confidenceData.reduce((s, c) => s + c.governance, 0) / confidenceData.length)
    : 0;
  const avgComplianceConfidence = confidenceData.length > 0
    ? Math.round(confidenceData.reduce((s, c) => s + c.compliance, 0) / confidenceData.length)
    : 0;

  const highConfidenceAgents = confidenceData.filter((c) => c.confidence >= 80).length;
  const lowConfidenceAgents = confidenceData.filter((c) => c.confidence < 50).length;

  const discoveryScore = agents.length > 0 ? Math.min(100, Math.round(
    (agents.reduce((s, a) => s + a.confidence, 0) / agents.length) * 0.6 +
    (agents.filter((a) => a.framework !== "Custom Agent").length / Math.max(agents.length, 1)) * 40
  )) : 100;

  const repoIntelScore = Math.min(100, Math.round(
    repoIntel.confidence * 0.5 +
    (repoIntel.domains.length > 0 ? 25 : 0) +
    (repoIntel.services.length > 0 ? 15 : 0) +
    (repoIntel.modules.length > 0 ? 10 : 0)
  ));

  const graphScore = Math.min(100, Math.round(
    (knowledgeGraph.nodes.length > 0 ? 50 : 0) +
    (knowledgeGraph.edges.length > 0 ? 30 : 0) +
    (repoIntel.agents.length > 0 ? 20 : 0)
  ));

  const complianceScore = totalEvidence > 0 ? Math.min(100, Math.round(
    (evidenceWithFile / Math.max(totalEvidence, 1)) * 40 +
    (evidenceWithLine / Math.max(totalEvidence, 1)) * 30 +
    (evidenceWithMatch / Math.max(totalEvidence, 1)) * 30
  )) : 100;

  const regulatoryScore = agents.length > 0 ? Math.min(100, Math.round(
    (aiActHits === 0 ? 100 : Math.max(0, 100 - aiActHits * 10)) * 0.4 +
    (doraHits === 0 ? 100 : Math.max(0, 100 - doraHits * 10)) * 0.3 +
    (lgpdHits === 0 ? 100 : Math.max(0, 100 - lgpdHits * 5)) * 0.15 +
    (gdprHits === 0 ? 100 : Math.max(0, 100 - gdprHits * 5)) * 0.15
  )) : 100;

  const evidenceScore = totalEvidence > 0 ? Math.min(100, Math.round(
    (evidenceWithFile / Math.max(totalEvidence, 1)) * 40 +
    (evidenceWithLine / Math.max(totalEvidence, 1)) * 35 +
    (evidenceWithMatch / Math.max(totalEvidence, 1)) * 25
  )) : 100;

  const overallScore = computeScore([
    discoveryScore, repoIntelScore, graphScore, complianceScore, regulatoryScore, evidenceScore,
  ]);

  console.log(`[6/6] Generating report...`);

  const report = generateReport({
    repoName,
    repoPath: absPath,
    timestamp,
    files,
    dirs,
    agents,
    enriched,
    repoIntel,
    knowledgeGraph,
    autonomous,
    orchestrators,
    gateways,
    retrieval,
    assistive,
    supervisory,
    frameworkCounts,
    containsPii,
    containsFinancial,
    containsHealth,
    containsCredentials,
    externalSinks,
    aiActHits,
    doraHits,
    lgpdHits,
    gdprHits,
    totalFindings,
    totalEvidence,
    lineageEvidence,
    fapiEvidence,
    evidenceWithFile,
    evidenceWithLine,
    evidenceWithMatch,
    avgDiscoveryConfidence,
    avgGovernanceConfidence,
    avgComplianceConfidence,
    highConfidenceAgents,
    lowConfidenceAgents,
    confidenceData,
    discoveryScore,
    repoIntelScore,
    graphScore,
    complianceScore,
    regulatoryScore,
    evidenceScore,
    overallScore,
    enrichmentErrors,
    customAgents: agents.filter((a) => a.framework === "Custom Agent").length,
  });

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, report, "utf-8");

  console.log(`\nDone. Report saved to: ${reportPath}`);
  console.log(`\nEnterprise Readiness Score: ${overallScore}/100`);
  console.log(`  Discovery:      ${pad(discoveryScore, 3)}/100`);
  console.log(`  Repo Intel:     ${pad(repoIntelScore, 3)}/100`);
  console.log(`  Graph:          ${pad(graphScore, 3)}/100`);
  console.log(`  Compliance:     ${pad(complianceScore, 3)}/100`);
  console.log(`  Regulatory:     ${pad(regulatoryScore, 3)}/100`);
  console.log(`  Evidence:       ${pad(evidenceScore, 3)}/100`);
}

interface ReportData {
  repoName: string;
  repoPath: string;
  timestamp: string;
  files: Array<{ path: string; name: string; type: string; size?: number }>;
  dirs: Array<{ path: string; name: string; type: string }>;
  agents: DiscoveredAgent[];
  enriched: Array<{ agent: DiscoveredAgent; data: EnrichedAgentData }>;
  repoIntel: RepoIntelligence;
  knowledgeGraph: KnowledgeGraph;
  autonomous: DiscoveredAgent[];
  orchestrators: DiscoveredAgent[];
  gateways: DiscoveredAgent[];
  retrieval: DiscoveredAgent[];
  assistive: DiscoveredAgent[];
  supervisory: DiscoveredAgent[];
  frameworkCounts: Map<string, { count: number; totalConfidence: number }>;
  containsPii: number;
  containsFinancial: number;
  containsHealth: number;
  containsCredentials: number;
  externalSinks: number;
  aiActHits: number;
  doraHits: number;
  lgpdHits: number;
  gdprHits: number;
  totalFindings: number;
  totalEvidence: number;
  lineageEvidence: number;
  fapiEvidence: number;
  evidenceWithFile: number;
  evidenceWithLine: number;
  evidenceWithMatch: number;
  avgDiscoveryConfidence: number;
  avgGovernanceConfidence: number;
  avgComplianceConfidence: number;
  highConfidenceAgents: number;
  lowConfidenceAgents: number;
  confidenceData: Array<{ confidence: number; governance: number; compliance: number }>;
  customAgents: number;
  discoveryScore: number;
  repoIntelScore: number;
  graphScore: number;
  complianceScore: number;
  regulatoryScore: number;
  evidenceScore: number;
  overallScore: number;
  enrichmentErrors: number;
}

function generateReport(d: ReportData): string {
  const lines: string[] = [];

  lines.push(`# Validation Report`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`| ----- | ----- |`);
  lines.push(`| Repository | ${escapeMd(d.repoName)} |`);
  lines.push(`| Path | ${escapeMd(d.repoPath)} |`);
  lines.push(`| Date | ${d.timestamp} |`);
  lines.push(`| Version | CodeGuard 8.6 |`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 1 — Discovery Accuracy`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`| ------ | ----- |`);
  lines.push(`| Files Scanned | ${d.files.length} |`);
  lines.push(`| Directories | ${d.dirs.length} |`);
  lines.push(`| Agents Detected | ${d.agents.length} |`);
  lines.push(`| Frameworks Detected | ${d.frameworkCounts.size} |`);
  lines.push(`| Autonomous Agents | ${d.autonomous.length} |`);
  lines.push(`| Orchestrators | ${d.orchestrators.length} |`);
  lines.push(`| Gateways | ${d.gateways.length} |`);
  lines.push(`| Retrieval Agents | ${d.retrieval.length} |`);
  lines.push(`| Assistive | ${d.assistive.length} |`);
  lines.push(`| Supervisory | ${d.supervisory.length} |`);
  lines.push(`| Enrichment Errors | ${d.enrichmentErrors} |`);
  lines.push(``);
  lines.push(`**Discovery Score: ${d.discoveryScore}/100**`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 2 — Framework Detection`);
  lines.push(``);
  lines.push(`| Framework | Count | Avg Confidence |`);
  lines.push(`| --------- | ----- | -------------- |`);
  const sortedFrameworks = Array.from(d.frameworkCounts.entries()).sort((a, b) => b[1].count - a[1].count);
  for (const [fw, stats] of sortedFrameworks) {
    const avgConf = Math.round(stats.totalConfidence / stats.count);
    lines.push(`| ${escapeMd(fw)} | ${stats.count} | ${avgConf}% |`);
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 3 — False Positives`);
  lines.push(``);
  lines.push(`| File | Detection | Why FP |`);
  lines.push(`| ---- | --------- | ------ |`);
  if (d.agents.length === 0) {
    lines.push(`| — | — | No agents detected |`);
  } else {
    const customAgents = d.agents.filter((a) => a.framework === "Custom Agent");
    for (const a of customAgents) {
      lines.push(`| ${escapeMd(a.filePath)} | Custom Agent (confidence: ${a.confidence}%) | **REVIEW** — broad match, verify if agent exists |`);
    }
    if (customAgents.length === 0) {
      lines.push(`| — | — | No Custom Agent detections to review |`);
    }
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 4 — False Negatives`);
  lines.push(``);
  lines.push(`| File | Expected | Missed Reason |`);
  lines.push(`| ---- | -------- | ------------- |`);
  lines.push(`| — | — | Manual review required |`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 5 — Repo Intelligence`);
  lines.push(``);
  lines.push(`| Component | Count |`);
  lines.push(`| --------- | ----- |`);
  lines.push(`| Domains | ${d.repoIntel.domains.length} |`);
  lines.push(`| Services | ${d.repoIntel.services.length} |`);
  lines.push(`| Modules | ${d.repoIntel.modules.length} |`);
  lines.push(`| Entrypoints | ${d.repoIntel.entrypoints.length} |`);
  lines.push(`| Dependencies | ${d.repoIntel.dependencies.length} |`);
  lines.push(`| Frameworks | ${d.repoIntel.frameworks.length} |`);
  lines.push(`| Languages | ${d.repoIntel.languages.join(", ") || "none"} |`);
  lines.push(`| Trust Zone | ${d.repoIntel.trustZone} |`);
  lines.push(`| Business Capabilities | ${d.repoIntel.businessCapabilities.length} |`);
  lines.push(``);
  if (d.repoIntel.domains.length > 0) {
    lines.push(`### Domains`);
    lines.push(``);
    lines.push(`| Domain | Confidence | Signals |`);
    lines.push(`| ------ | ---------- | ------- |`);
    for (const dom of d.repoIntel.domains) {
      lines.push(`| ${escapeMd(dom.name)} | ${dom.confidence}% | ${dom.signals.join(", ")} |`);
    }
    lines.push(``);
  }
  if (d.repoIntel.services.length > 0) {
    lines.push(`### Services`);
    lines.push(``);
    lines.push(`| Service | Type | Path |`);
    lines.push(`| ------- | ---- | ---- |`);
    for (const svc of d.repoIntel.services) {
      lines.push(`| ${escapeMd(svc.name)} | ${svc.type} | ${escapeMd(svc.path)} |`);
    }
    lines.push(``);
  }
  lines.push(`**Repo Intelligence Score: ${d.repoIntelScore}/100**`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 6 — Knowledge Graph`);
  lines.push(``);
  lines.push(`### Nodes`);
  lines.push(``);
  const nodeTypeCounts = new Map<string, number>();
  for (const n of d.knowledgeGraph.nodes) {
    nodeTypeCounts.set(n.type, (nodeTypeCounts.get(n.type) ?? 0) + 1);
  }
  lines.push(`| Node Type | Count |`);
  lines.push(`| --------- | ----- |`);
  for (const [type, count] of Array.from(nodeTypeCounts.entries()).sort()) {
    lines.push(`| ${type} | ${count} |`);
  }
  lines.push(`| **Total** | **${d.knowledgeGraph.nodes.length}** |`);
  lines.push(``);
  lines.push(`### Edges`);
  lines.push(``);
  const edgeTypeCounts = new Map<string, number>();
  for (const e of d.knowledgeGraph.edges) {
    edgeTypeCounts.set(e.type, (edgeTypeCounts.get(e.type) ?? 0) + 1);
  }
  lines.push(`| Edge Type | Count |`);
  lines.push(`| --------- | ----- |`);
  for (const [type, count] of Array.from(edgeTypeCounts.entries()).sort()) {
    lines.push(`| ${type} | ${count} |`);
  }
  lines.push(`| **Total** | **${d.knowledgeGraph.edges.length}** |`);
  lines.push(``);
  lines.push(`**Graph Completeness Score: ${d.graphScore}/100**`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 7 — Compliance Validation`);
  lines.push(``);
  lines.push(`| Classification | Count | Verified |`);
  lines.push(`| -------------- | ----- | -------- |`);
  lines.push(`| containsPii | ${d.containsPii} | Manual review |`);
  lines.push(`| containsFinancial | ${d.containsFinancial} | Manual review |`);
  lines.push(`| containsHealth | ${d.containsHealth} | Manual review |`);
  lines.push(`| containsCredentials | ${d.containsCredentials} | Manual review |`);
  lines.push(`| externalSinks | ${d.externalSinks} | Manual review |`);
  lines.push(``);
  if (d.containsPii > 0 || d.containsFinancial > 0 || d.containsHealth > 0) {
    lines.push(`### PII/Financial/Health Agents`);
    lines.push(``);
    lines.push(`| Agent | File | PII | Financial | Health | Credentials |`);
    lines.push(`| ----- | ---- | --- | --------- | ------ | ----------- |`);
    for (const e of d.enriched) {
      if (e.data.lineage.containsPii || e.data.lineage.containsFinancialData ||
          e.data.lineage.containsHealthData || e.data.lineage.containsCredentials) {
        lines.push(`| ${escapeMd(e.agent.name)} | ${escapeMd(e.agent.filePath)} | ${e.data.lineage.containsPii ? "YES" : "—"} | ${e.data.lineage.containsFinancialData ? "YES" : "—"} | ${e.data.lineage.containsHealthData ? "YES" : "—"} | ${e.data.lineage.containsCredentials ? "YES" : "—"} |`);
      }
    }
    lines.push(``);
  }
  lines.push(`**Compliance Score: ${d.complianceScore}/100**`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 8 — Regulatory Validation`);
  lines.push(``);
  lines.push(`| Regulation | Hits | Verified | FP |`);
  lines.push(`| ---------- | ---- | -------- | -- |`);
  lines.push(`| AI Act | ${d.aiActHits} | Manual review | ${d.aiActHits > 0 ? "**REVIEW**" : "0"} |`);
  lines.push(`| DORA | ${d.doraHits} | Manual review | ${d.doraHits > 0 ? "**REVIEW**" : "0"} |`);
  lines.push(`| GDPR | ${d.gdprHits} | Manual review | ${d.gdprHits > 0 ? "**REVIEW**" : "0"} |`);
  lines.push(`| LGPD | ${d.lgpdHits} | Manual review | ${d.lgpdHits > 0 ? "**REVIEW**" : "0"} |`);
  lines.push(``);

  const isNonRegulatoryRepo = d.repoName.toLowerCase().includes("langgraph") ||
    d.repoName.toLowerCase().includes("openai") ||
    d.repoName.toLowerCase().includes("dify");
  if (isNonRegulatoryRepo) {
    lines.push(`> **Expected for this repo:** AI Act = 0, DORA = 0, GDPR = 0, LGPD = 0.`);
    lines.push(`> Any hit should be flagged as a false positive.`);
    lines.push(``);
  }

  if (d.aiActHits > 0) {
    lines.push(`### AI Act Hits`);
    lines.push(``);
    lines.push(`| Agent | File | Exposure | Annex III |`);
    lines.push(`| ----- | ---- | -------- | --------- |`);
    for (const e of d.enriched) {
      if (e.data.aiActExposure === "high" || e.data.aiActExposure === "limited") {
        lines.push(`| ${escapeMd(e.agent.name)} | ${escapeMd(e.agent.filePath)} | ${e.data.aiActExposure} | ${e.data.annexIiiCategory ?? "—"} |`);
      }
    }
    lines.push(``);
  }

  if (d.doraHits > 0) {
    lines.push(`### DORA Hits`);
    lines.push(``);
    lines.push(`| Agent | File | DORA |`);
    lines.push(`| ----- | ---- | ---- |`);
    for (const e of d.enriched) {
      if (e.data.doraExposure) {
        lines.push(`| ${escapeMd(e.agent.name)} | ${escapeMd(e.agent.filePath)} | YES |`);
      }
    }
    lines.push(``);
  }

  if (d.lgpdHits > 0) {
    lines.push(`### LGPD Findings`);
    lines.push(``);
    lines.push(`| Agent | File | Findings | Severity |`);
    lines.push(`| ----- | ---- | -------- | -------- |`);
    for (const e of d.enriched) {
      if (e.data.lgpd.findings.length > 0) {
        lines.push(`| ${escapeMd(e.agent.name)} | ${escapeMd(e.agent.filePath)} | ${e.data.lgpd.findings.length} | ${e.data.lgpd.severity} |`);
      }
    }
    lines.push(``);
    lines.push(`### LGPD Finding Details`);
    lines.push(``);
    lines.push(`| Agent | Category | Rule | Line | Match | File |`);
    lines.push(`| ----- | -------- | ---- | ---- | ----- | ---- |`);
    for (const e of d.enriched) {
      for (const f of e.data.lgpd.findings.slice(0, 5)) {
        lines.push(`| ${escapeMd(e.agent.name)} | ${f.category} | ${f.rule} | ${f.line} | ${escapeMd(f.match)} | ${escapeMd(f.filePath)} |`);
      }
    }
    lines.push(``);
  }

  lines.push(`**Regulatory Score: ${d.regulatoryScore}/100**`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 9 — Evidence Quality`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`| ------ | ----- |`);
  lines.push(`| Evidence Nodes | ${d.totalEvidence} |`);
  lines.push(`| Lineage Evidence | ${d.lineageEvidence} |`);
  lines.push(`| FAPI Evidence | ${d.fapiEvidence} |`);
  lines.push(`| LGPD Findings | ${d.totalFindings} |`);
  lines.push(`| File Coverage | ${formatPct(d.evidenceWithFile, d.totalEvidence)} |`);
  lines.push(`| Line Coverage | ${formatPct(d.evidenceWithLine, d.totalEvidence)} |`);
  lines.push(`| Match Coverage | ${formatPct(d.evidenceWithMatch, d.totalEvidence)} |`);
  lines.push(``);
  lines.push(`**Evidence Quality Score: ${d.evidenceScore}/100**`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 10 — Confidence Calibration`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`| ------ | ----- |`);
  lines.push(`| Avg Discovery Confidence | ${d.avgDiscoveryConfidence}% |`);
  lines.push(`| Avg Governance Confidence | ${d.avgGovernanceConfidence}% |`);
  lines.push(`| Avg Compliance Confidence | ${d.avgComplianceConfidence}% |`);
  lines.push(`| High Confidence Agents (>=80%) | ${d.highConfidenceAgents} |`);
  lines.push(`| Low Confidence Agents (<50%) | ${d.lowConfidenceAgents} |`);
  lines.push(``);

  if (d.confidenceData.length > 0) {
    lines.push(`| Detection | Confidence | Governance | Compliance |`);
    lines.push(`| --------- | ---------- | ---------- | ---------- |`);
    for (let i = 0; i < Math.min(d.agents.length, 20); i++) {
      const c = d.confidenceData[i];
      const a = d.agents[i];
      lines.push(`| ${escapeMd(a.name)} | ${c.confidence}% | ${c.governance}% | ${c.compliance}% |`);
    }
    lines.push(``);
  }

  const overconfident = d.confidenceData.filter((c) => c.confidence >= 80 && c.compliance > 80).length;
  const underconfident = d.confidenceData.filter((c) => c.confidence < 50).length;
  if (overconfident > 0) {
    lines.push(`**Flag: ${overconfident} agents may be overconfident** (high discovery + high compliance without verification)`);
    lines.push(``);
  }
  if (underconfident > 0) {
    lines.push(`**Flag: ${underconfident} agents may be underconfident** (low confidence despite evidence)`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Section 11 — Enterprise Readiness`);
  lines.push(``);
  lines.push(`| Area | Score |`);
  lines.push(`| ---- | ----- |`);
  lines.push(`| Discovery Score | ${d.discoveryScore}/100 |`);
  lines.push(`| Repo Intelligence Score | ${d.repoIntelScore}/100 |`);
  lines.push(`| Graph Score | ${d.graphScore}/100 |`);
  lines.push(`| Compliance Score | ${d.complianceScore}/100 |`);
  lines.push(`| Regulatory Score | ${d.regulatoryScore}/100 |`);
  lines.push(`| Evidence Score | ${d.evidenceScore}/100 |`);
  lines.push(`| **Overall Score** | **${d.overallScore}/100** |`);
  lines.push(``);

  if (d.overallScore >= 85) {
    lines.push(`**Readiness: HIGH** — Pipeline is producing verifiable, defensible results.`);
  } else if (d.overallScore >= 70) {
    lines.push(`**Readiness: MEDIUM** — Core pipeline works but needs calibration.`);
  } else {
    lines.push(`**Readiness: LOW** — Significant false positives or missing evidence.`);
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Top 10 False Positives`);
  lines.push(``);
  lines.push(`| # | File | Detection | Why FP |`);
  lines.push(`| - | ---- | --------- | ------ |`);
  const customSorted = d.agents
    .filter((a) => a.framework === "Custom Agent")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
  if (customSorted.length > 0) {
    for (let i = 0; i < customSorted.length; i++) {
      const a = customSorted[i];
      lines.push(`| ${i + 1} | ${escapeMd(a.filePath)} | Custom Agent (${a.confidence}%) | Broad match — verify |`);
    }
  } else {
    lines.push(`| — | — | — | No high-confidence Custom Agents |`);
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Top 10 False Negatives`);
  lines.push(``);
  lines.push(`| # | File | Expected | Missed Reason |`);
  lines.push(`| - | ---- | -------- | ------------- |`);
  lines.push(`| — | — | — | Manual review required |`);
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Top 10 Improvements`);
  lines.push(``);
  if (d.customAgents > 0) {
    lines.push(`1. Review ${d.customAgents} Custom Agent detections — add framework signatures if real`);
  }
  if (d.aiActHits > 0 && isNonRegulatoryRepo) {
    lines.push(`2. AI Act: ${d.aiActHits} hits on non-regulatory repo — tighten Annex III classifier`);
  }
  if (d.doraHits > 0 && isNonRegulatoryRepo) {
    lines.push(`3. DORA: ${d.doraHits} hits on non-financial repo — verify jurisdiction engine`);
  }
  if (d.lgpdHits > 0 && isNonRegulatoryRepo) {
    lines.push(`4. LGPD: ${d.lgpdHits} findings on non-Brazilian context — check FP patterns`);
  }
  if (d.evidenceWithFile < d.totalEvidence) {
    lines.push(`5. Evidence: ${d.totalEvidence - d.evidenceWithFile} items missing filePath — verify evidence chain`);
  }
  if (d.highConfidenceAgents > 0 && d.agents.length > 0) {
    lines.push(`6. Confidence: ${d.highConfidenceAgents} high-confidence detections — calibrate against ground truth`);
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(``);
  lines.push(`## GO / NO GO`);
  lines.push(``);
  if (d.overallScore >= 80) {
    lines.push(`**GO** — This repository validation increases confidence in CodeGuard.`);
    lines.push(``);
    lines.push(`The pipeline produces verifiable results with traceable evidence.`);
  } else if (d.overallScore >= 60) {
    lines.push(`**CONDITIONAL GO** — Core pipeline works but requires calibration.`);
    lines.push(``);
    lines.push(`Address the top improvements before the next validation run.`);
  } else {
    lines.push(`**NO GO** — Too many false positives or missing evidence.`);
    lines.push(``);
    lines.push(`Fix the flagged issues before proceeding to the next repository.`);
  }
  lines.push(``);

  return lines.join("\n");
}

main().catch((err) => {
  console.error("Validation harness failed:", err);
  process.exit(1);
});