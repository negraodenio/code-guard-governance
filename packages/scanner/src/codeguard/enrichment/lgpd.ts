export interface LGPDPFinding {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  rule: string;
  match: string;
  line: number;
  filePath: string;
  message: string;
}

export interface LGPDPResult {
  findings: LGPDPFinding[];
  piiExposure: boolean;
  credentialExposure: boolean;
  biometricExposure: boolean;
  severity: "critical" | "high" | "medium" | "low";
}

const SENSITIVE_RULES: Array<{
  category: string;
  regex: RegExp;
  severity: LGPDPFinding["severity"];
  rule: string;
  message: string;
}> = [
  {
    category: "PII",
    regex: /\bcpf\b/i,
    severity: "high",
    rule: "LGPD_CPF_EXPOSURE",
    message: "CPF field detected. Ensure encryption at rest and transit, access logging, and consent basis.",
  },
  {
    category: "PII",
    regex: /\bcnpj\b/i,
    severity: "medium",
    rule: "LGPD_CNPJ_EXPOSURE",
    message: "CNPJ field detected. Corporate data still requires access controls.",
  },
  {
    category: "PII",
    regex: /\brg\b(?=.*\b(?:geral|documento|identidade|number|id)\b)|\bregistro\s+geral\b/i,
    severity: "high",
    rule: "LGPD_RG_EXPOSURE",
    message: "RG (national ID) field detected. Requires strict access controls and encryption.",
  },
  {
    category: "PII",
    regex: /\bpassaporte\b|\bpassport\b/i,
    severity: "high",
    rule: "LGPD_PASSPORT_EXPOSURE",
    message: "Passport number field detected.",
  },
  {
    category: "PII",
    regex: /\btelefone\b|\bcelular\b|\bwhatsapp\b/i,
    severity: "medium",
    rule: "LGPD_PHONE_EXPOSURE",
    message: "Phone number field detected. Personal data under LGPD.",
  },
  {
    category: "PII",
    regex: /\bendere[cç]o\b|\bcep\b|\baddress\b/i,
    severity: "medium",
    rule: "LGPD_ADDRESS_EXPOSURE",
    message: "Address field detected. Personal data under LGPD.",
  },
  {
    category: "PII",
    regex: /\bdata\s+nascimento\b|\bdob\b|\bbirth\s*date\b/i,
    severity: "high",
    rule: "LGPD_BIRTH_DATE_EXPOSURE",
    message: "Birth date field detected. Sensitive personal data.",
  },
  {
    category: "PII",
    regex: /\bnome\b|\bpessoa\b|\bcliente\b|\bpaciente\b|\baluno\b/i,
    severity: "medium",
    rule: "LGPD_NAME_EXPOSURE",
    message: "Personal name field detected. Requires consent or legal basis.",
  },
  {
    category: "CREDENTIAL",
    regex: /\bpassword\b|\bsenha\b|\bpasswd\b|\bpwd\b/i,
    severity: "critical",
    rule: "CREDENTIAL_PASSWORD",
    message: "Password field detected. Must be hashed (bcrypt/argon2), never logged.",
  },
  {
    category: "CREDENTIAL",
    regex: /\bapi[_-]?key\b|\bapi[_-]?secret\b|\baccess[_-]?key\b/i,
    severity: "critical",
    rule: "CREDENTIAL_API_KEY",
    message: "API key field detected. Must use secrets manager, never hardcoded.",
  },
  {
    category: "CREDENTIAL",
    regex: /\bauthorization\b/i,
    severity: "medium",
    rule: "CREDENTIAL_AUTH_HEADER",
    message: "Authorization header. Ensure tokens are not logged or exposed.",
  },
  {
    category: "CREDENTIAL",
    regex: /\btoken\b(?=.*\b(?:access|refresh|auth|jwt|bearer|session)\b)|\brefresh[_-]?token\b|\baccess[_-]?token\b/i,
    severity: "high",
    rule: "CREDENTIAL_TOKEN",
    message: "Token field. Must be stored securely, rotate regularly.",
  },
  {
    category: "CREDENTIAL",
    regex: /\bsecret\b(?=.*\b(?:key|manager|vault|store|env)\b)|\bSECRET\b(?=.*\b(?:KEY|MANAGER)\b)|\bprivate[_-]?key\b/i,
    severity: "critical",
    rule: "CREDENTIAL_SECRET",
    message: "Secret/private key detected. Must use secrets manager, never hardcoded.",
  },
  {
    category: "BIOMETRIC",
    regex: /\bface\s*id\b|\bbiometria\b|\bbiometric\b|\bdigital\b(?=.*\b(?:biometric|fingerprint|impress|polegar|dedo)\b)/i,
    severity: "critical",
    rule: "LGPD_BIOMETRIC_EXPOSURE",
    message: "Biometric data field detected. Sensitive under LGPD Art. 5-II. Requires explicit consent.",
  },
  {
    category: "FINANCIAL",
    regex: /\bcredit\s*card\b|\bcvv\b|\bcvc\b|\bcard\s*number\b/i,
    severity: "critical",
    rule: "LGPD_CREDIT_CARD",
    message: "Credit card data detected. PCI-DSS + LGPD compliance required.",
  },
  {
    category: "HEALTH",
    regex: /\bpaciente\b|\bpatient\b|\bprontu[aá]rio\b|\bdiagn[oó]stico\b/i,
    severity: "critical",
    rule: "LGPD_HEALTH_DATA",
    message: "Health data detected. Sensitive under LGPD Art. 5-II. Requires explicit consent.",
  },
];

export function scanLGPDP(content: string, filePath: string, jurisdiction?: string): LGPDPResult {
  const findings: LGPDPFinding[] = [];
  const credentialFindings: LGPDPFinding[] = [];
  const lines = content.split("\n");
  const isBrazilian = !jurisdiction || jurisdiction === "BR" || jurisdiction === "BRASIL";

  lines.forEach((line, index) => {
    for (const rule of SENSITIVE_RULES) {
      if (line.trim().startsWith("//") || line.trim().startsWith("#") || line.trim().startsWith("/*")) continue;
      if (line.trim().startsWith("*")) continue;

      const match = line.match(rule.regex);
      if (!match) continue;

      const finding: LGPDPFinding = {
        category: rule.category,
        severity: rule.severity,
        rule: rule.rule,
        match: match[0],
        line: index + 1,
        filePath,
        message: rule.message,
      };

      if (rule.category === "CREDENTIAL") {
        credentialFindings.push(finding);
      } else {
        findings.push(finding);
      }
    }
  });

  const piiExposure = findings.some((f) => f.category === "PII" && (f.severity === "critical" || f.severity === "high"));
  const credentialExposure = credentialFindings.length > 0;
  const biometricExposure = findings.some((f) => f.category === "BIOMETRIC");

  let severity: LGPDPResult["severity"] = "low";
  if (findings.some((f) => f.severity === "critical") || credentialFindings.some((f) => f.severity === "critical")) severity = "critical";
  else if (findings.some((f) => f.severity === "high") || credentialFindings.some((f) => f.severity === "high")) severity = "high";
  else if (findings.length + credentialFindings.length > 0) severity = "medium";

  return {
    findings: findings.slice(0, 20),
    piiExposure,
    credentialExposure,
    biometricExposure,
    severity: isBrazilian ? severity : (severity === "critical" ? "high" : severity),
  };
}