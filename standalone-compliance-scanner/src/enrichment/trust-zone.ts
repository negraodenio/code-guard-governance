import type { TrustZoneResult, TrustZone } from '../types';

const PRODUCTION: RegExp[] = [
  /production/i, /prod/i, /live/i,
  /NODE_ENV\s*=\s*["']production["']/i,
  /ENVIRONMENT\s*=\s*["']production["']/i,
  /deploy.*production/i, /release/i,
  /\.github\/workflows\/.*deploy/i,
];

const STAGING: RegExp[] = [
  /staging/i, /stage/i, /homolog/i, /pre.?prod/i, /uat/i, /qa/i,
  /NODE_ENV\s*=\s*["']staging["']/i,
];

const DEVELOPMENT: RegExp[] = [
  /development/i, /dev/i, /local/i,
  /NODE_ENV\s*=\s*["']development["']/i,
  /localhost/i, /127\.0\.0\.1/i,
];

const SANDBOX: RegExp[] = [
  /sandbox/i, /test/i, /mock/i,
  /NODE_ENV\s*=\s*["']test["']/i,
  /\.test\./i, /\.spec\./i, /__tests__/i,
  /jest\.config/i, /vitest\.config/i,
];

function scorePatterns(content: string, patterns: RegExp[]): number {
  return patterns.filter(p => p.test(content)).length;
}

export function inferTrustZone(fileContents: Map<string, string>, fileNames: string[]): TrustZoneResult {
  let allContent = '';
  Array.from(fileContents.values()).forEach(content => {
    allContent += content + '\n';
  });

  const filePathStr = fileNames.join(' ');

  const prodScore = scorePatterns(allContent, PRODUCTION);
  const stagingScore = scorePatterns(allContent, STAGING);
  const devScore = scorePatterns(allContent, DEVELOPMENT);
  const sandboxScore = scorePatterns(allContent, SANDBOX);

  if (/test|spec|mock|__tests__/i.test(filePathStr)) {
    return { trustZone: 'sandbox', confidence: 85, evidence: ['File paths indicate test/sandbox environment'] };
  }

  const scores: Array<{ zone: TrustZone; score: number }> = [
    { zone: 'production', score: prodScore },
    { zone: 'staging', score: stagingScore },
    { zone: 'development', score: devScore },
    { zone: 'sandbox', score: sandboxScore },
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (best.score === 0) {
    return { trustZone: 'development', confidence: 40, evidence: ['Default: no trust zone signals detected'] };
  }

  const evidence: string[] = [];
  if (prodScore > 0) evidence.push(`Production signals: ${prodScore}`);
  if (stagingScore > 0) evidence.push(`Staging signals: ${stagingScore}`);
  if (devScore > 0) evidence.push(`Development signals: ${devScore}`);
  if (sandboxScore > 0) evidence.push(`Sandbox signals: ${sandboxScore}`);

  const confidence = Math.min(95, 40 + best.score * 15);

  return { trustZone: best.zone, confidence, evidence };
}
