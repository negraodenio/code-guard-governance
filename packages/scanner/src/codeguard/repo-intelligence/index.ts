import type { RepoIntelligence, RepoFileInfo, AgentReference } from "./types";
import { analyseStructure, extractDependencies } from "./structure";
import { detectDomains } from "./domains";
import { detectEntrypoints } from "./entrypoints";
import { detectFrameworks } from "./frameworks";
import { inferTrustZone } from "../enrichment/trust-zone";
import type { DiscoveredAgent } from "../types";

function toRepoFileInfo(files: Array<{ path: string; name: string }>): RepoFileInfo[] {
  return files.map((f) => {
    const dotIdx = f.name.lastIndexOf(".");
    const ext = dotIdx > 0 ? f.name.substring(dotIdx).toLowerCase() : "";
    return {
      path: f.path,
      name: f.name,
      ext,
      dir: f.path.includes("/") ? f.path.substring(0, f.path.lastIndexOf("/")) : "root",
    };
  });
}

export async function generateRepoIntelligence(
  repositoryName: string,
  files: Array<{ path: string; name: string }>,
  discoveredAgents: DiscoveredAgent[],
  readFile?: (path: string) => Promise<string>
): Promise<RepoIntelligence> {
  const fileInfos = toRepoFileInfo(files);

  const { modules, projectTypes, entrypointCandidates } = analyseStructure(fileInfos);

  const depResults = extractDependencies(fileInfos, projectTypes);
  const { entrypoints, services, frameworks: configFrameworks } = detectEntrypoints(fileInfos);
  const { domains, businessCapabilities } = detectDomains(fileInfos, readFile);
  const { frameworks: aiFrameworks, languages } = detectFrameworks(fileInfos);

  const allFrameworks = [...aiFrameworks, ...configFrameworks].filter((v, i, a) => a.indexOf(v) === i);

  const finalEntrypoints = entrypoints.length > 0 ? entrypoints : entrypointCandidates.slice(0, 3);

  const agents: AgentReference[] = discoveredAgents.map((a) => ({
    name: a.name,
    filePath: a.filePath,
    framework: a.framework,
    agentType: a.agentType,
    riskLevel: a.suggestedRiskLevel,
  }));

  let trustZone: RepoIntelligence["trustZone"] = "development";
  try {
    const sampleFiles = files.slice(0, 5);
    const sampleResults = await Promise.all(
      sampleFiles.map(async (f) => {
        try {
          const content = readFile ? await readFile(f.path) : "";
          return inferTrustZone(f.path, content);
        } catch { return null; }
      })
    );
    const validResults = sampleResults.filter((r): r is NonNullable<typeof r> => r !== null);
    if (validResults.length > 0) {
      const prodCount = validResults.filter((r) => r.trustZone === "production").length;
      const stagingCount = validResults.filter((r) => r.trustZone === "staging").length;
      if (prodCount > validResults.length / 2) trustZone = "production";
      else if (stagingCount > validResults.length / 2) trustZone = "staging";
      else trustZone = validResults[0].trustZone;
    }
  } catch {}

  const isProduction = trustZone === "production";
  const hasAgents = agents.length > 0;
  const hasFinancial = domains.some((d) => ["payments", "fraud", "AML", "credit"].includes(d.name));
  const hasHealth = domains.some((d) => d.name === "health");

  const summaryParts: string[] = [];
  if (domains.length > 0) summaryParts.push(`Business domains: ${domains.map((d) => d.name).join(", ")}.`);
  if (services.length > 0) summaryParts.push(`${services.length} services detected.`);
  if (hasAgents) summaryParts.push(`${agents.length} AI agents from ${new Set(agents.map((a) => a.framework)).size} frameworks.`);
  if (hasFinancial) summaryParts.push("Financial services domain. DORA/LGPD applicable.");
  if (hasHealth) summaryParts.push("Healthcare domain. Sensitive data under LGPD Art. 5-II.");
  if (isProduction) summaryParts.push("Production environment. Critical governance required.");
  if (languages.length > 0) summaryParts.push(`${languages.join(", ")}.`);

  const summary = summaryParts.length > 0
    ? `${repositoryName} is a ${trustZone} project. ${summaryParts.join(" ")}`
    : `${repositoryName} is a ${trustZone} project. ${languages.length > 0 ? languages.join(", ") + "." : ""}`;

  let confidence = 50;
  confidence += domains.length * 5;
  confidence += services.length * 3;
  confidence += modules.length * 2;
  confidence += agents.length * 5;
  confidence += finalEntrypoints.length * 3;
  confidence = Math.min(95, confidence);

  return {
    repositoryName,
    languages,
    frameworks: allFrameworks,
    entrypoints: finalEntrypoints,
    domains,
    services,
    modules,
    dependencies: depResults.map((d) => ({ ...d, version: undefined })),
    agents,
    trustZone,
    businessCapabilities,
    summary,
    confidence,
  };
}