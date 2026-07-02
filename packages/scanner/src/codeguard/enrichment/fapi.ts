export interface FAPIResult {
  financialServices: boolean;
  openBanking: boolean;
  fapiCompliant: boolean;
  fapiComplianceLevel: "none" | "partial" | "candidate" | "certified";
  fapiGaps: string[];
  doraExposure: boolean;
  signals: string[];
  confidence: number;
  evidence: Array<{ filePath: string; lineNumber: number; matchText: string; signal: string }>;
}

const FAPI_SIGNALS: Array<{ signal: string; regex: RegExp; weight: number; fapiRequirement?: string }> = [
  { signal: "PS256", regex: /\bPS256\b/, weight: 30, fapiRequirement: "FAPI-1 Advanced mandates PS256 or ES256 for token signing" },
  { signal: "ES256", regex: /\bES256\b/, weight: 20, fapiRequirement: "FAPI-1 Advanced accepts ES256 as alternative to PS256" },
  { signal: "JWKS", regex: /\bJWKS\b|\bjwks_uri\b|\bjwks\.json\b/, weight: 25, fapiRequirement: "FAPI requires JWKS endpoint for key rotation" },
  { signal: "issuer", regex: /\bissuer\b|\biss\b/, weight: 10 },
  { signal: "audience", regex: /\baudience\b|\baud\b/, weight: 10 },
  { signal: "scope_validation", regex: /\bscope\s*validation\b|\bvalidate.*scope\b|\bscope.*check\b/, weight: 15, fapiRequirement: "FAPI requires scope validation on every request" },
  { signal: "mtls", regex: /\bmTLS\b|\bmutual.*tls\b|\bclient.*certificate\b|\bTLS_CLIENT_CA\b/, weight: 25, fapiRequirement: "FAPI-1 Advanced requires mTLS or DPoP for sender-constrained tokens" },
  { signal: "par", regex: /\bPAR\b|\bpushed.*authorization\b/, weight: 20, fapiRequirement: "FAPI-1 Advanced requires PAR for authorization requests" },
  { signal: "dpop", regex: /\bDPoP\b|\bdemonstration.*proof\b/, weight: 20, fapiRequirement: "FAPI-1 Advanced accepts DPoP as alternative to mTLS" },
  { signal: "open_banking", regex: /\bopen.?banking\b|\bopen.?finance\b/, weight: 30 },
  { signal: "fapi", regex: /\bFAPI\b/, weight: 30 },
  { signal: "payment_initiation", regex: /\bpayment.*initiation\b|\bPISP\b|\bAISP\b/, weight: 20 },
  { signal: "consent_management", regex: /\bconsent.*management\b|\bconsent.*store\b|\bconsent.*revok/i, weight: 15, fapiRequirement: "FAPI requires explicit consent management for payment flows" },
  { signal: "dora", regex: /\bDORA\b|\bdigital.*operational.*resilience\b/, weight: 25 },
  { signal: "ict_risk", regex: /\bICT.*risk\b|\boperational.*resilience\b/, weight: 10 },
  { signal: "psd2", regex: /\bPSD2\b|\bpayment.*services.*directive\b/, weight: 20 },
];

const INSECURE_PATTERNS: Array<{ signal: string; regex: RegExp; issue: string }> = [
  { signal: "rs256_without_mtls", regex: /\bRS256\b/, issue: "RS256 without mTLS is insufficient for FAPI-1 Advanced — requires PS256/ES256 + mTLS or DPoP" },
  { signal: "bearer_without_binding", regex: /\bBearer\s+/i, issue: "Unbound Bearer tokens are not FAPI-compliant — requires sender-constrained tokens (mTLS or DPoP)" },
  { signal: "plaintext_redirect", regex: /redirect.*http:\/\//i, issue: "Non-HTTPS redirect URI violates FAPI security requirements" },
  { signal: "hardcoded_secret", regex: /client_secret\s*[:=]\s*["'][^"']+["']/i, issue: "Hardcoded client_secret detected — FAPI requires secure secret management" },
];

const FINANCIAL_DOMAIN_SIGNALS: RegExp[] = [
  /\bbanco\b|\bbank\b/i,
  /\bpayment\b|\bpagamento\b/i,
  /\btransaction\b|\btransa[cç][aã]o\b/i,
  /\bcredit\b|\bdebit\b|\bcr[eé]dito\b|\bd[eé]bito\b/i,
  /\baccount\b|\bconta\b/i,
  /\binsurance\b|\bseguro\b/i,
  /\binvestment\b|\binvestimento\b/i,
  /\bcard\b|\bcart[aã]o\b/i,
  /\bPIX\b/i,
  /\bTED\b|\bDOC\b/i,
  /\bBACEN\b|\bBanco\s+Central\b/i,
];

export function detectFAPI(content: string, filePath: string): FAPIResult {
  const lines = content.split("\n");
  const matchedSignals: Array<{ signal: string; weight: number; line: number; fapiRequirement?: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//") || line.trim().startsWith("#") || line.trim().startsWith("/*")) continue;

    for (const s of FAPI_SIGNALS) {
      if (s.regex.test(line) && !matchedSignals.find((m) => m.signal === s.signal)) {
        matchedSignals.push({ signal: s.signal, weight: s.weight, line: i + 1, fapiRequirement: s.fapiRequirement });
      }
    }
  }

  const isFinancial = FINANCIAL_DOMAIN_SIGNALS.some((p) => p.test(content)) ||
    filePath.toLowerCase().includes("bank") ||
    filePath.toLowerCase().includes("payment") ||
    filePath.toLowerCase().includes("fintech") ||
    filePath.toLowerCase().includes("finance");

  const totalWeight = matchedSignals.reduce((sum, s) => sum + s.weight, 0);
  const confidence = Math.min(95, totalWeight);

  const openBanking = matchedSignals.some((s) =>
    s.signal === "open_banking" || s.signal === "payment_initiation" || s.signal === "psd2"
  );

  const hasPS256orES256 = matchedSignals.some(s => s.signal === "PS256" || s.signal === "ES256");
  const hasJWKS = matchedSignals.some(s => s.signal === "JWKS");
  const hasMtlsOrDPoP = matchedSignals.some(s => s.signal === "mtls" || s.signal === "dpop");
  const hasPAR = matchedSignals.some(s => s.signal === "par");
  const hasScopeValidation = matchedSignals.some(s => s.signal === "scope_validation");
  const hasConsentMgmt = matchedSignals.some(s => s.signal === "consent_management");
  const hasFapiKeyword = matchedSignals.some(s => s.signal === "fapi");

  const fapiGaps: string[] = [];
  if (!hasPS256orES256) fapiGaps.push("Missing PS256 or ES256 token signing (FAPI-1 Advanced requirement)");
  if (!hasJWKS) fapiGaps.push("Missing JWKS endpoint for key rotation");
  if (!hasMtlsOrDPoP) fapiGaps.push("Missing mTLS or DPoP for sender-constrained tokens");
  if (!hasPAR && openBanking) fapiGaps.push("Missing PAR (Pushed Authorization Request) for open banking flows");
  if (!hasScopeValidation) fapiGaps.push("Missing explicit scope validation");
  if (openBanking && !hasConsentMgmt) fapiGaps.push("Missing consent management for payment/payment-initiation flows");

  const insecureFindings: Array<{ line: number; issue: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    for (const pat of INSECURE_PATTERNS) {
      if (pat.regex.test(lines[i])) {
        insecureFindings.push({ line: i + 1, issue: pat.issue });
      }
    }
  }
  for (const finding of insecureFindings) {
    fapiGaps.push(`${finding.issue} (line ${finding.line})`);
  }

  let fapiComplianceLevel: FAPIResult["fapiComplianceLevel"] = "none";
  let fapiCompliant = false;

  if (hasFapiKeyword && fapiGaps.length === 0 && hasPS256orES256 && hasMtlsOrDPoP && hasJWKS) {
    fapiComplianceLevel = "certified";
    fapiCompliant = true;
  } else if (hasPS256orES256 && hasMtlsOrDPoP && fapiGaps.length <= 1) {
    fapiComplianceLevel = "candidate";
    fapiCompliant = true;
  } else if (hasPS256orES256 || hasMtlsOrDPoP || hasJWKS) {
    fapiComplianceLevel = "partial";
    fapiCompliant = false;
  }

  const doraExposure = matchedSignals.some((s) =>
    s.signal === "dora" || s.signal === "ict_risk"
  ) || (isFinancial && confidence >= 30);

  return {
    financialServices: isFinancial,
    openBanking,
    fapiCompliant,
    fapiComplianceLevel,
    fapiGaps,
    doraExposure,
    signals: matchedSignals.map((s) => s.signal),
    confidence,
    evidence: matchedSignals.map((s) => ({
      filePath,
      lineNumber: s.line,
      matchText: s.signal,
      signal: s.fapiRequirement ?? s.signal,
    })),
  };
}
