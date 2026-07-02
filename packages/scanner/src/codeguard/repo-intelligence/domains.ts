import type { Domain, RepoFileInfo } from "./types";

const DOMAIN_DEFINITIONS: Array<{ domain: string; keywords: RegExp[]; weight: number }> = [
  {
    domain: "payments",
    keywords: [/payment|pagamento|gateway.*payment|checkout|stripe|adyen|pagar\.me|mercadopago|pix|transfer/i],
    weight: 10,
  },
  {
    domain: "fraud",
    keywords: [/fraud|fraude|antifraud|anti.?fraud|risk.*score|suspicious|chargeback|dispute|estelionato/i],
    weight: 10,
  },
  {
    domain: "AML",
    keywords: [/aml|anti.?money.*laundering|kyc|know.*customer|pl[dD].?FT|coaf|suspicious.*activity|suspicious.*transaction|sar|pep/i],
    weight: 10,
  },
  {
    domain: "risk",
    keywords: [/risk.*management|credit.*risk|operational.*risk|market.*risk|risk.*model|risk.*engine|risk.*analytics/i],
    weight: 10,
  },
  {
    domain: "credit",
    keywords: [/credit|crédito|loan|empréstimo|financiamento|scoring|underwriting|approval.*engine|limit|concessão/i],
    weight: 10,
  },
  {
    domain: "customer",
    keywords: [/customer|customer.*360|cliente|persona|profile|onboarding|account.*opening|cadastro|registro/i],
    weight: 10,
  },
  {
    domain: "claims",
    keywords: [/claim|sinistro|claims.*processing|insurance.*claim|reimbursement|indenização|apólice|cobertura/i],
    weight: 8,
  },
  {
    domain: "health",
    keywords: [/health|saúde|hospital|patient|paciente|clinical|clínico|medical|médico|diagnosis|diagnóstico|prontuário|prescrição|farmaceut/i],
    weight: 10,
  },
  {
    domain: "identity",
    keywords: [/identity|identidade|auth|authentication|autenticação|login|password|senha|biometric|biometria|face.*id|facial|token|jwt|oauth/i],
    weight: 8,
  },
  {
    domain: "compliance",
    keywords: [/compliance|conformidade|regulatory|regulatório|governance|governança|lgpd|gdpr|ccpa|dora|sox|basel|bacen|bcb|audit|auditoria/i],
    weight: 10,
  },
  {
    domain: "governance",
    keywords: [/governance|governança|ai.*governance|model.*governance|m[gl]ops|responsible.*ai|ethics|i[ée]tica|explainability|explicabilidade/i],
    weight: 10,
  },
];

const FRAMEWORK_DOMAIN_MAP: Record<string, string[]> = {
  "OpenAI Agents SDK": ["ai_agents", "automation"],
  "LangChain": ["ai_agents", "nlp"],
  "LangGraph": ["ai_agents", "workflow"],
  "CrewAI": ["ai_agents", "orchestration"],
  "AutoGen": ["ai_agents", "autonomous"],
  "Claude Code / Anthropic": ["ai_agents", "developer_tools"],
  "OpenAI SDK": ["ai_integration", "llm"],
  "MCP Server": ["ai_agents", "tool_integration"],
  "Dify": ["ai_agents", "low_code"],
  "n8n AI": ["automation", "workflow"],
};

export function detectDomains(files: RepoFileInfo[], contentFn?: (path: string) => Promise<string>): {
  domains: Domain[];
  businessCapabilities: string[];
} {
  const domainScores = new Map<string, { score: number; signals: string[] }>();

  for (const def of DOMAIN_DEFINITIONS) {
    domainScores.set(def.domain, { score: 0, signals: [] });
  }

  for (const file of files) {
    const filePath = file.path.toLowerCase();
    for (const def of DOMAIN_DEFINITIONS) {
      for (const kw of def.keywords) {
        if (kw.test(filePath)) {
          const entry = domainScores.get(def.domain)!;
          entry.score += def.weight;
          entry.signals.push(`path:${file.path}`);
          break;
        }
      }
    }
  }

  const domains: Domain[] = [];
  for (const [name, info] of domainScores) {
    if (info.score > 0) {
      domains.push({
        name,
        confidence: Math.min(95, 30 + info.score * 3),
        signals: info.signals.slice(0, 10),
      });
    }
  }

  domains.sort((a, b) => b.confidence - a.confidence);

  const businessCapabilities: string[] = [];
  if (domains.some((d) => d.name === "payments" || d.name === "credit" || d.name === "fraud")) {
    businessCapabilities.push("Financial Transaction Processing");
  }
  if (domains.some((d) => d.name === "AML" || d.name === "fraud" || d.name === "compliance")) {
    businessCapabilities.push("Regulatory Compliance & Risk");
  }
  if (domains.some((d) => d.name === "customer" || d.name === "identity")) {
    businessCapabilities.push("Customer Identity & Access Management");
  }
  if (domains.some((d) => d.name === "claims" || d.name === "health")) {
    businessCapabilities.push("Claims & Healthcare Management");
  }
  if (domains.some((d) => d.name === "governance")) {
    businessCapabilities.push("AI Governance & Ethics");
  }
  if (businessCapabilities.length === 0) {
    businessCapabilities.push("General Application Platform");
  }

  return { domains, businessCapabilities };
}