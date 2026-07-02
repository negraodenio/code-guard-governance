export interface DataLineageResult {
  containsPii: boolean;
  containsFinancialData: boolean;
  containsHealthData: boolean;
  containsCredentials: boolean;
  externalSinks: string[];
  internalSinks: string[];
  sensitiveSources: string[];
  transformations: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  evidence: Array<{ filePath: string; lineNumber: number; matchText: string; category: string }>;
}

const PII_PATTERNS: Array<{ category: string; regex: RegExp }> = [
  { category: "cpf", regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\bcpf\b/i },
  { category: "cnpj", regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\bcnpj\b/i },
  { category: "rg", regex: /\brg\b(?=.*\b(?:geral|documento|identidade|number|id)\b)|\bregistro\s+geral\b/i },
  { category: "email", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
  { category: "phone", regex: /\btelefone\b|\bcelular\b|\bwhatsapp\b|\bphone\b/i },
  { category: "address", regex: /\bendere[cç]o\b|\baddress\b|\bcep\b|\bzip\b/i },
  { category: "name", regex: /\bnome\b|\bpessoa\b|\bcliente\b|\bpaciente\b|\baluno\b/i },
  { category: "birth_date", regex: /\bdata\s+nascimento\b|\bdob\b|\bbirth\b/i },
  { category: "face_id", regex: /\bface\s*id\b|\bbiometria\b|\bbiometric\b/i },
];

const FINANCIAL_PATTERNS: Array<{ category: string; regex: RegExp }> = [
  { category: "credit_card", regex: /\bcredit\s*card\b|\bcvv\b|\bcvc\b|\bcard\s*number\b/i },
  { category: "bank", regex: /\bbanco\b|\bbank\b|\bconta\b|\baccount\b|\bag[eê]ncia\b/i },
  { category: "payment", regex: /\bpayment\b|\bpagamento\b|\btransaction\b|\btransa[cç][aã]o\b/i },
  { category: "pix", regex: /\bpix\b|\bchave\s*pix\b/i },
  { category: "salary", regex: /\bsal[aá]rio\b|\bsalary\b|\bincome\b|\brenda\b/i },
];

const HEALTH_PATTERNS: Array<{ category: string; regex: RegExp }> = [
  { category: "patient", regex: /\bpaciente\b|\bpatient\b|\bprontu[aá]rio\b/i },
  { category: "diagnosis", regex: /\bdiagn[oó]stico\b|\bdiagnos[ei]s\b|\bCID\b/i },
  { category: "medical", regex: /\bm[eé]dico\b|\bmedical\b|\bclinical\b|\bcl[ií]nico\b/i },
  { category: "health_plan", regex: /\bplano\s+sa[uú]de\b|\bhealth\s*plan\b|\binsurance\b/i },
  { category: "prescription", regex: /\bprescri[cç][aã]o\b|\bmedicamento\b|\bprescription\b|\bdrug\b/i },
];

const CREDENTIAL_PATTERNS: Array<{ category: string; regex: RegExp }> = [
  { category: "api_key", regex: /\bapi[_-]?key\b|\bapi[_-]?secret\b|\baccess[_-]?key\b/i },
  { category: "password", regex: /\bpassword\b|\bsenha\b|\bpasswd\b|\bpwd\b/i },
  { category: "token", regex: /\btoken\b(?=.*\b(?:access|refresh|auth|jwt|bearer|session)\b)|\brefresh[_-]?token\b|\baccess[_-]?token\b|\bauth[_-]?token\b|\bbearer\b/i },
  { category: "secret", regex: /\bsecret\b(?=.*\b(?:key|manager|vault|store|env)\b)|\bprivate[_-]?key\b/i },
  { category: "authorization", regex: /\bauthorization\b/i },
];

const EXTERNAL_SINK_PATTERNS: RegExp[] = [
  /fetch\s*\(/i, /axios\./i, /\.post\s*\(/i, /\.get\s*\(/i,
  /res\.send\s*\(/i, /res\.json\s*\(/i, /response\s*\(/i,
  /\.publish\s*\(/i, /\.emit\s*\(/i, /socket\./i,
  /kafka\./i, /rabbitmq/i, /sqs\./i, /sns\./i,
  /\bhttps?:\/\//i, /api\./i, /webhook/i,
  /openai\.chat\.completions/i, /claude\.messages\.create/i,
];

const INTERNAL_SINK_PATTERNS: RegExp[] = [
  /console\.log\s*\(/i, /console\.error\s*\(/i, /console\.warn\s*\(/i,
  /logger\./i, /log\./i,
  /\.write\s*\(/i, /\.save\s*\(/i, /\.insert\s*\(/i, /\.create\s*\(/i,
  /\.update\s*\(/i, /\.delete\s*\(/i,
  /db\./i, /database\./i, /repository\./i,
];

const TRANSFORMATION_PATTERNS: Array<{ method: string; regex: RegExp }> = [
  { method: "encrypt", regex: /encrypt|Encrypt|AES|RSA|crypto\./i },
  { method: "hash", regex: /hash|Hash|bcrypt|argon2|sha256|sha512|md5|pbkdf2/i },
  { method: "mask", regex: /mask|Mask|redact|Redact|sanitize|Sanitize|anonymize|Anonymize/i },
  { method: "tokenize", regex: /tokenize|Tokenize|pseudonymize|Pseudonymize/i },
  { method: "validate", regex: /validate|Validate|sanitize|escape|strip/i },
];

export function analyseDataLineage(content: string, filePath: string): DataLineageResult {
  const lines = content.split("\n");

  const piiMatches: Array<{ category: string; line: number }> = [];
  const finMatches: Array<{ category: string; line: number }> = [];
  const healthMatches: Array<{ category: string; line: number }> = [];
  const credMatches: Array<{ category: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of PII_PATTERNS) { if (p.regex.test(line)) piiMatches.push({ category: p.category, line: i + 1 }); }
    for (const p of FINANCIAL_PATTERNS) { if (p.regex.test(line)) finMatches.push({ category: p.category, line: i + 1 }); }
    for (const p of HEALTH_PATTERNS) { if (p.regex.test(line)) healthMatches.push({ category: p.category, line: i + 1 }); }
    for (const p of CREDENTIAL_PATTERNS) { if (p.regex.test(line)) credMatches.push({ category: p.category, line: i + 1 }); }
  }

  const evidence: DataLineageResult["evidence"] = [
    ...piiMatches.map((m) => ({ filePath, lineNumber: m.line, matchText: m.category, category: "pii" })),
    ...finMatches.map((m) => ({ filePath, lineNumber: m.line, matchText: m.category, category: "financial" })),
    ...healthMatches.map((m) => ({ filePath, lineNumber: m.line, matchText: m.category, category: "health" })),
    ...credMatches.map((m) => ({ filePath, lineNumber: m.line, matchText: m.category, category: "credential" })),
  ];

  const hasPii = piiMatches.length > 0;
  const hasFin = finMatches.length > 0;
  const hasHealth = healthMatches.length > 0;
  const hasCred = credMatches.length > 0;

  const externalSinks = EXTERNAL_SINK_PATTERNS
    .filter((p) => p.test(content))
    .map((p) => `Sink pattern: ${p.source.slice(0, 40)}`);

  const internalSinks = INTERNAL_SINK_PATTERNS
    .filter((p) => p.test(content))
    .map((p) => `Sink pattern: ${p.source.slice(0, 40)}`);

  const transformations = TRANSFORMATION_PATTERNS
    .filter((p) => p.regex.test(content))
    .map((p) => p.method);

  const totalSensitiveCategories = piiMatches.length + finMatches.length + healthMatches.length + credMatches.length;
  const hasExternalSinks = externalSinks.length > 0;
  const hasTransformations = transformations.length > 0;

  let riskLevel: DataLineageResult["riskLevel"] = "low";
  if (totalSensitiveCategories >= 3 && hasExternalSinks) riskLevel = "critical";
  else if (totalSensitiveCategories >= 3 && !hasTransformations) riskLevel = "high";
  else if (totalSensitiveCategories >= 2 && hasExternalSinks) riskLevel = "high";
  else if (totalSensitiveCategories >= 2) riskLevel = "medium";
  else if (hasExternalSinks && totalSensitiveCategories >= 1) riskLevel = "medium";

  return {
    containsPii: hasPii,
    containsFinancialData: hasFin,
    containsHealthData: hasHealth,
    containsCredentials: hasCred,
    externalSinks,
    internalSinks,
    sensitiveSources: [
      ...piiMatches.map((m) => m.category),
      ...finMatches.map((m) => m.category),
      ...healthMatches.map((m) => m.category),
      ...credMatches.map((m) => m.category),
    ],
    transformations,
    riskLevel,
    evidence,
  };
}