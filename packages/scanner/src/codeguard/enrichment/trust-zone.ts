export type TrustZone = "production" | "staging" | "development" | "sandbox";

export interface TrustZoneResult {
  trustZone: TrustZone;
  confidence: number;
  evidence: string[];
}

const PRODUCTION_SIGNALS: RegExp[] = [
  /production/i, /prod/i, /live/i,
  /NODE_ENV\s*=\s*["']production["']/i,
  /ENVIRONMENT\s*=\s*["']production["']/i,
  /deploy.*production/i, /release/i,
  /\.github\/workflows\/.*deploy/i,
  /\.github\/workflows\/.*release/i,
];

const STAGING_SIGNALS: RegExp[] = [
  /staging/i, /stage/i, /homolog/i, /homologa[cç][aã]o/i,
  /NODE_ENV\s*=\s*["']staging["']/i,
  /ENVIRONMENT\s*=\s*["']staging["']/i,
  /pre.?prod/i, /uat/i, /qa/i,
];

const DEVELOPMENT_SIGNALS: RegExp[] = [
  /development/i, /dev/i, /local/i,
  /NODE_ENV\s*=\s*["']development["']/i,
  /ENVIRONMENT\s*=\s*["']development["']/i,
  /localhost/i, /127\.0\.0\.1/i,
];

const SANDBOX_SIGNALS: RegExp[] = [
  /sandbox/i, /test/i, /mock/i,
  /NODE_ENV\s*=\s*["']test["']/i,
  /ENVIRONMENT\s*=\s*["']test["']/i,
  /\.test\./i, /\.spec\./i, /__tests__/i,
  /jest\.config/i, /vitest\.config/i,
];

export function inferTrustZone(filePath: string, content: string): TrustZoneResult {
  const prodScore = PRODUCTION_SIGNALS.filter((s) => s.test(content)).length;
  const stagingScore = STAGING_SIGNALS.filter((s) => s.test(content)).length;
  const devScore = DEVELOPMENT_SIGNALS.filter((s) => s.test(content)).length;
  const sandboxScore = SANDBOX_SIGNALS.filter((s) => s.test(content)).length;

  const fileLower = filePath.toLowerCase();
  if (fileLower.includes("test") || fileLower.includes("spec") || fileLower.includes("mock") || fileLower.includes("__tests__")) {
    return { trustZone: "sandbox", confidence: 85, evidence: ["File path indicates test/sandbox environment"] };
  }

  const scores: Array<{ zone: TrustZone; score: number }> = [
    { zone: "production", score: prodScore },
    { zone: "staging", score: stagingScore },
    { zone: "development", score: devScore },
    { zone: "sandbox", score: sandboxScore },
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (best.score === 0) {
    return { trustZone: "development", confidence: 40, evidence: ["Default: no trust zone signals detected"] };
  }

  const evidence: string[] = [];
  if (prodScore > 0) evidence.push(`Production signals: ${prodScore}`);
  if (stagingScore > 0) evidence.push(`Staging signals: ${stagingScore}`);
  if (devScore > 0) evidence.push(`Development signals: ${devScore}`);
  if (sandboxScore > 0) evidence.push(`Sandbox signals: ${sandboxScore}`);

  const confidence = Math.min(95, 40 + best.score * 15);

  return { trustZone: best.zone, confidence, evidence };
}

export function computeGovernancePriority(
  trustZone: TrustZone,
  riskLevel: string,
  isAutonomous: boolean
): "critical" | "high" | "medium" | "low" {
  if (trustZone === "production" && (riskLevel === "high" || isAutonomous)) return "critical";
  if (trustZone === "production" && riskLevel === "medium") return "high";
  if (trustZone === "production") return "medium";
  if (trustZone === "staging" && (riskLevel === "high" || isAutonomous)) return "high";
  if (trustZone === "staging") return "medium";
  return "low";
}