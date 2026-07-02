/**
 * Legacy Scanner Bridge
 *
 * Embeds the rule sets from apps/extension/src/scanner/ (GDPR, LGPD, CCPA,
 * PCI, HIPAA, OWASP, Shadow-API, AI-Act) as pure-function scanners with no
 * VSCode or class-based dependencies, and converts the results to the
 * CodeViolation schema used by graphos-complete.
 *
 * Deliberately self-contained — no cross-app imports.
 */

import type { CodeViolation } from './types';

// ── Severity mapping ─────────────────────────────────────────────────────────
type LegacySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

function toNewSeverity(s: LegacySeverity): CodeViolation['severity'] {
  switch (s) {
    case 'CRITICAL': return 'critical';
    case 'HIGH':     return 'high';
    case 'MEDIUM':   return 'medium';
    default:         return 'low';
  }
}

type LegacyCategory = 'GDPR' | 'LGPD' | 'CCPA' | 'HIPAA' | 'PCI' | 'OWASP' | 'AI_ACT' | 'SECURITY';

function toNewCategory(c: LegacyCategory): CodeViolation['category'] {
  switch (c) {
    case 'GDPR':
    case 'LGPD':
    case 'CCPA':
    case 'AI_ACT':   return 'gdpr';   // privacy-first bucket
    case 'PCI':      return 'pci';
    case 'OWASP':
    case 'HIPAA':
    case 'SECURITY': return 'owasp';
    default:         return 'best_practice';
  }
}

interface LegacyRule {
  regex: RegExp;
  severity: LegacySeverity;
  message: string;
  rule: string;
  category: LegacyCategory;
  fix?: string;
}

// ── All rules in one flat list ────────────────────────────────────────────────
const LEGACY_RULES: LegacyRule[] = [
  // GDPR
  {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    severity: 'CRITICAL', category: 'GDPR', rule: 'GDPR_EMAIL_HARDCODED',
    message: 'Hardcoded Email detected. Potential Personal Data leak.',
    fix: '// [REDACTED] Personal Data removed by CodeGuard',
  },
  {
    regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
    severity: 'CRITICAL', category: 'GDPR', rule: 'GDPR_NATIONAL_ID',
    message: 'Potential National ID (CPF/SSN) pattern detected.',
  },
  {
    regex: /(sk_live_|AIza|eyJ[a-zA-Z0-9_-]{10,})/,
    severity: 'CRITICAL', category: 'GDPR', rule: 'GDPR_SECRET_EXPOSED',
    message: 'Potential Secret Key or Token detected in source code.',
  },
  {
    regex: /\b(password|senha|passwd|api_key|access_token|secret)\s*[:=]\s*["'][^"']{3,}["']/,
    severity: 'CRITICAL', category: 'SECURITY', rule: 'SEC_HARDCODED_CREDENTIAL',
    message: 'Hardcoded Credential detected. High security risk.',
    fix: 'Move secret to environment variable (process.env.SECRET_KEY)',
  },
  {
    regex: /console\.log\s*\(\s*.*(email|user|password|token|creds).*/,
    severity: 'CRITICAL', category: 'GDPR', rule: 'GDPR_LOGGING_SENSITIVE',
    message: 'Logging sensitive user data triggers GDPR violation risks.',
  },

  // LGPD
  {
    regex: /\.(save|insert|create|store)\s*\(\s*.*(user|cliente|aluno|paciente).*\)/i,
    severity: 'HIGH', category: 'LGPD', rule: 'LGPD_DATA_PERSISTENCE',
    message: 'Data persistence detected without explicit consent guard. LGPD Art. 7.',
  },
  {
    regex: /\bcpf\b/i,
    severity: 'MEDIUM', category: 'LGPD', rule: 'LGPD_SENSITIVE_FIELD_CPF',
    message: 'CPF field detected. Ensure strict access controls and LGPD compliance.',
  },
  {
    regex: /\b(telefone|celular|whatsapp)\b/i,
    severity: 'MEDIUM', category: 'LGPD', rule: 'LGPD_SENSITIVE_FIELD_PHONE',
    message: 'Phone number field detected. Personal Data under LGPD.',
  },

  // CCPA
  {
    regex: /\b(ssn|social_security|socialsecurity)\b/i,
    severity: 'HIGH', category: 'CCPA', rule: 'CCPA_SENSITIVE_PII_SSN',
    message: 'Social Security Number reference detected. CPRA Highly Sensitive PII.',
  },
  {
    regex: /\b(driver.*license|dl_number)\b/i,
    severity: 'HIGH', category: 'CCPA', rule: 'CCPA_SENSITIVE_PII_DL',
    message: "Driver License number detected. Requires encryption (CPRA Sensitive PII).",
  },
  {
    regex: /\b(sell_data|share_data|ad_network|third_party_share)\b/i,
    severity: 'CRITICAL', category: 'CCPA', rule: 'CCPA_DATA_SELLING_INDICATOR',
    message: 'Potential data selling activity. Ensure "Do Not Sell" compliance.',
  },
  {
    regex: /\b(gps|latitude|longitude|precise_location)\b/i,
    severity: 'MEDIUM', category: 'CCPA', rule: 'CPRA_SENSITIVE_GEOLOCATION',
    message: 'Precise Geolocation data detected. Requires explicit Opt-In (CPRA).',
  },
  {
    regex: /\b(face_id|fingerprint|biometric|retina)\b/i,
    severity: 'HIGH', category: 'CCPA', rule: 'CCPA_BIOMETRIC_DATA',
    message: 'Biometric data collection detected. Requires explicit notice at collection.',
  },

  // PCI-DSS
  {
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
    severity: 'CRITICAL', category: 'PCI', rule: 'PCI_PAN_EXPOSED',
    message: 'Credit card PAN detected. PCI-DSS requires tokenisation/masking.',
  },
  {
    regex: /\b(cvv|cvc|cvn)\s*[:=]\s*[0-9]{3,4}\b/i,
    severity: 'CRITICAL', category: 'PCI', rule: 'PCI_SAD_EXPOSED',
    message: 'CVV/CVC code detected. PCI-DSS prohibits storing card verification codes.',
  },
  {
    regex: /\b(track2|magnetic)\b/i,
    severity: 'CRITICAL', category: 'PCI', rule: 'PCI_TRACK_DATA',
    message: 'Magnetic stripe/Track2 data reference. PCI-DSS prohibits storing track data.',
  },

  // HIPAA
  {
    regex: /\b(ssn|social\s*security|mrn|medical\s*record)\b/i,
    severity: 'HIGH', category: 'HIPAA', rule: 'HIPAA_PHI_IDENTIFIER',
    message: 'Potential PHI Identifier (SSN/MRN) detected. HIPAA requires encryption.',
  },
  {
    regex: /\b(diagnosis|icd-10|prescription|treatment|patient)\b/i,
    severity: 'MEDIUM', category: 'HIPAA', rule: 'HIPAA_HEALTH_DATA',
    message: 'Health-related terms detected. Ensure data is encrypted at rest and in transit.',
  },

  // OWASP Top 10
  {
    regex: /(SELECT|INSERT|UPDATE|DELETE)\s+.*(?:WHERE|VALUES)\s+.*(?:\+|\|\||\$)/i,
    severity: 'HIGH', category: 'OWASP', rule: 'OWASP_SQLI',
    message: 'Potential SQL Injection: Unparameterised query detected (OWASP A03).',
    fix: 'Use parameterised queries or an ORM. Never concatenate user input into SQL.',
  },
  {
    regex: /\.innerHTML\s*=/i,
    severity: 'MEDIUM', category: 'OWASP', rule: 'OWASP_XSS',
    message: 'Unsafe DOM manipulation (innerHTML). Risk of XSS (OWASP A03).',
    fix: 'Use textContent instead of innerHTML, or sanitize with DOMPurify.',
  },
  {
    regex: /\bpassword\s*=\s*['"][^'"]+['"]/i,
    severity: 'CRITICAL', category: 'OWASP', rule: 'OWASP_AUTH_FAIL',
    message: 'Hardcoded password (OWASP A07 – Identification and Authentication Failures).',
    fix: 'Move password to environment variable.',
  },

  // Shadow API (undocumented endpoints)
  {
    regex: /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/,
    severity: 'HIGH', category: 'SECURITY', rule: 'SHADOW_API_UNDOCUMENTED',
    message: 'Potentially undocumented API endpoint detected (Shadow API). Add OpenAPI docs.',
    fix: '/** @openapi\\n * GET /path\\n * @description Add description here\\n */',
  },

  // EU AI Act
  {
    regex: /\b(creditScore|riskScore|socialScore|trustScore)\b/i,
    severity: 'MEDIUM', category: 'AI_ACT', rule: 'AI_ACT_SOCIAL_SCORING',
    message: '[AI Act] Scoring/Profiling detected. Social Scoring is BANNED. Credit scoring is HIGH RISK.',
  },
  {
    regex: /\b(biometric|facial|fingerprint|retina|emotion)\b/i,
    severity: 'MEDIUM', category: 'AI_ACT', rule: 'AI_ACT_BIOMETRICS',
    message: '[AI Act] Biometric data processing detected. Strict categorisation required.',
  },
  {
    regex: /(predict|approve|reject|decide)\s*\(.*(loan|hire|fire|exclude|grant).*\)/i,
    severity: 'HIGH', category: 'AI_ACT', rule: 'AI_ACT_AUTOMATED_DECISION',
    message: '[AI Act] Automated decision in critical sector (employment/finance). High Risk System.',
  },
  {
    regex: /\b(race|religion|political|union|genetic|orient)\b/i,
    severity: 'MEDIUM', category: 'AI_ACT', rule: 'AI_ACT_SENSITIVE_DATA',
    message: '[AI Act] Processing sensitive categories for AI training is heavily restricted.',
  },
];

// Rules that produce too many false-positives in framework files — suppress them
const NOISY_RULES = new Set([
  'LGPD_DATA_PERSISTENCE',   // triggers on .create() calls in any ORM
  'SHADOW_API_UNDOCUMENTED',  // already handled better by new scanner
]);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run all 7 legacy scanners against a single file's content.
 * Returns CodeViolation[] compatible with graphos-complete's pipeline.
 */
export function runLegacyScanners(content: string, filePath: string): CodeViolation[] {
  if (!content || content.length > 500_000) return [];

  // Skip framework/vendor/generated files to reduce noise
  if (/node_modules|\.d\.ts$|\.map$|dist\/|build\/|\.min\.js$/.test(filePath)) return [];

  const violations: CodeViolation[] = [];
  const lines = content.split('\n');
  const seenKeys = new Set<string>(); // deduplicate same rule+line

  for (const rule of LEGACY_RULES) {
    if (NOISY_RULES.has(rule.rule)) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comment lines
      if (/^\s*(\/\/|#|<!--|\*|\/\*)/.test(line)) continue;

      const match = line.match(rule.regex);
      if (!match) continue;

      // Extra filter for SHADOW_API: only flag if no JSDoc in preceding 8 lines
      if (rule.rule === 'SHADOW_API_UNDOCUMENTED') {
        const preceding = lines.slice(Math.max(0, i - 8), i).join('\n');
        if (/@openapi|@swagger|@api|\/\*\*/.test(preceding)) continue;
      }

      const key = `${rule.rule}:${filePath}:${i + 1}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      violations.push({
        rule: rule.rule,
        severity: toNewSeverity(rule.severity),
        category: toNewCategory(rule.category),
        message: rule.message,
        file: filePath,
        line: i + 1,
        match: match[0].slice(0, 80),
        recommendation: rule.fix ?? `Review and fix: ${rule.rule}`,
      });
    }
  }

  return violations;
}

/**
 * Run legacy scanners over an entire file map and collect all violations.
 */
export function runLegacyScannersOnFileMap(files: Map<string, string>): CodeViolation[] {
  const all: CodeViolation[] = [];
  for (const [path, content] of Array.from(files)) {
    const results = runLegacyScanners(content, path);
    all.push(...results);
  }
  return all;
}
