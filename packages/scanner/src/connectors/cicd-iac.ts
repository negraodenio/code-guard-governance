// ─────────────────────────────────────────────────────────────────────────────
// CI/CD & IaC Signal Detection
// File-based — no API tokens required.
// Detects pipeline configs and AI infrastructure declarations.
// ─────────────────────────────────────────────────────────────────────────────
import type { CiCdSignal, IacAiSignal } from './types';

// ── CI/CD patterns ────────────────────────────────────────────────────────────

interface CiCdPattern {
  platform: CiCdSignal['platform'];
  pathPatterns: RegExp[];
  aiSignals: RegExp[];
}

const CICD_PATTERNS: CiCdPattern[] = [
  {
    platform: 'github-actions',
    pathPatterns: [/^\.github\/workflows\/[^/]+\.(ya?ml)$/i],
    aiSignals: [
      /uses:.*openai|uses:.*anthropic|uses:.*langchain|uses:.*crewai|uses:.*langgraph/i,
      /OPENAI_API_KEY|ANTHROPIC_API_KEY|LANGCHAIN|llm|gpt-4|claude-3/i,
      /ai.*agent|agent.*scan|codeguard|governance.*scan/i,
    ],
  },
  {
    platform: 'gitlab-ci',
    pathPatterns: [/^\.gitlab-ci\.ya?ml$/i, /^\.gitlab\/ci\/[^/]+\.ya?ml$/i],
    aiSignals: [
      /openai|anthropic|langchain|crewai|langgraph|dify|autogen/i,
      /OPENAI_API_KEY|ANTHROPIC_API_KEY|AI_MODEL|LLM_ENDPOINT/i,
    ],
  },
  {
    platform: 'azure-pipelines',
    pathPatterns: [/^azure-pipelines\.ya?ml$/i, /^\.azure\/pipelines\/[^/]+\.ya?ml$/i, /^pipelines\/[^/]+\.ya?ml$/i],
    aiSignals: [/AzureOpenAI|CognitiveServices|openai|anthropic|OPENAI_API_KEY/i],
  },
  {
    platform: 'jenkins',
    pathPatterns: [/^Jenkinsfile$/i, /^jenkins\/[^/]+\.groovy$/i],
    aiSignals: [/openai|anthropic|langchain|llm|gpt|claude/i],
  },
  {
    platform: 'argocd',
    pathPatterns: [
      /^\.?argocd\/[^/]+\.ya?ml$/i,
      /^k8s\/.*application\.ya?ml$/i,
      /^manifests\/.*argo.*\.ya?ml$/i,
    ],
    aiSignals: [/kind:\s*Application/i, /openai|anthropic|llm|ai-agent/i],
  },
  {
    platform: 'circle-ci',
    pathPatterns: [/^\.circleci\/config\.ya?ml$/i],
    aiSignals: [/openai|anthropic|langchain|llm|gpt|claude/i],
  },
  {
    platform: 'travis-ci',
    pathPatterns: [/^\.travis\.ya?ml$/i],
    aiSignals: [/openai|anthropic|llm/i],
  },
  {
    platform: 'tekton',
    pathPatterns: [/^tekton\/[^/]+\.ya?ml$/i, /^\.tekton\/[^/]+\.ya?ml$/i],
    aiSignals: [/kind:\s*Pipeline|kind:\s*Task/i, /openai|anthropic|llm/i],
  },
];

// ── IaC AI resource patterns ───────────────────────────────────────────────────

interface IacPattern {
  cloud: IacAiSignal['cloud'];
  service: string;
  riskLevel: IacAiSignal['riskLevel'];
  pathPatterns: RegExp[];
  contentSignals: RegExp[];
}

const IAC_AI_PATTERNS: IacPattern[] = [
  // ── AWS ──
  { cloud: 'aws', service: 'Amazon Bedrock', riskLevel: 'high',
    pathPatterns: [/\.(tf|tfvars|json|ya?ml)$/i],
    contentSignals: [/aws_bedrock|bedrock.*model|BedrockRuntime|AmazonBedrock/i] },
  { cloud: 'aws', service: 'Amazon SageMaker', riskLevel: 'high',
    pathPatterns: [/\.(tf|json|ya?ml)$/i],
    contentSignals: [/aws_sagemaker|SageMaker.*Endpoint|sagemaker\.create_endpoint/i] },
  { cloud: 'aws', service: 'Amazon Comprehend', riskLevel: 'medium',
    pathPatterns: [/\.(tf|json|ya?ml)$/i],
    contentSignals: [/aws_comprehend|AmazonComprehend/i] },
  { cloud: 'aws', service: 'Amazon Kendra', riskLevel: 'medium',
    pathPatterns: [/\.(tf|json|ya?ml)$/i],
    contentSignals: [/aws_kendra|AmazonKendra/i] },
  // ── Azure ──
  { cloud: 'azure', service: 'Azure OpenAI', riskLevel: 'high',
    pathPatterns: [/\.(tf|bicep|json|ya?ml)$/i],
    contentSignals: [/azurerm_cognitive_account|azurerm_openai|cognitive_services.*OpenAI|azure_openai|AZURE_OPENAI/i] },
  { cloud: 'azure', service: 'Azure AI Foundry', riskLevel: 'high',
    pathPatterns: [/\.(tf|bicep|json|ya?ml)$/i],
    contentSignals: [/azurerm_ai_foundry|Microsoft\.MachineLearningServices\/workspaces/i] },
  { cloud: 'azure', service: 'Azure Machine Learning', riskLevel: 'high',
    pathPatterns: [/\.(tf|bicep|json|ya?ml)$/i],
    contentSignals: [/azurerm_machine_learning|AzureML/i] },
  { cloud: 'azure', service: 'Azure Bot Service', riskLevel: 'medium',
    pathPatterns: [/\.(tf|bicep|json|ya?ml)$/i],
    contentSignals: [/azurerm_bot_service|Microsoft\.BotService/i] },
  // ── GCP ──
  { cloud: 'gcp', service: 'Vertex AI', riskLevel: 'high',
    pathPatterns: [/\.(tf|json|ya?ml)$/i],
    contentSignals: [/google_vertex_ai|VertexAI|aiplatform\.googleapis|vertex-ai/i] },
  { cloud: 'gcp', service: 'Gemini / Generative AI', riskLevel: 'high',
    pathPatterns: [/\.(tf|json|ya?ml)$/i],
    contentSignals: [/generativelanguage\.googleapis|GEMINI_API_KEY|google-generativeai/i] },
  { cloud: 'gcp', service: 'Google Cloud AI APIs', riskLevel: 'medium',
    pathPatterns: [/\.(tf|json|ya?ml)$/i],
    contentSignals: [/google_project_service.*aiplatform|language\.googleapis|vision\.googleapis/i] },
];

// ── Exported detection functions ───────────────────────────────────────────────

/**
 * Detect CI/CD pipelines in a file tree.
 * Call with the full list of repo files; reads content lazily for matched paths.
 */
export async function detectCiCd(
  files: Array<{ path: string; name: string }>,
  readFile: (path: string) => Promise<string | null>,
): Promise<CiCdSignal[]> {
  const signals: CiCdSignal[] = [];

  for (const pattern of CICD_PATTERNS) {
    const matched = files.filter(f => pattern.pathPatterns.some(p => p.test(f.path)));
    for (const file of matched) {
      const content = await readFile(file.path).catch(() => null) ?? '';
      const matchedAi = pattern.aiSignals.filter(s => s.test(content));
      signals.push({
        platform: pattern.platform,
        configPath: file.path,
        hasAiSteps: matchedAi.length > 0,
        evidence: [
          `Config: ${file.path}`,
          ...matchedAi.map(s => `Pattern: ${s.source.slice(0, 60)}`),
        ],
      });
    }
  }
  return signals;
}

/**
 * Detect AI infrastructure declarations in IaC files (Terraform, Bicep, ARM, SAM).
 */
export async function detectIacAi(
  files: Array<{ path: string; name: string }>,
  readFile: (path: string) => Promise<string | null>,
): Promise<IacAiSignal[]> {
  const signals: IacAiSignal[] = [];
  const IaC_EXTENSIONS = /\.(tf|tfvars|bicep|json|ya?ml|template)$/i;
  const iaFiles = files.filter(f => IaC_EXTENSIONS.test(f.path)).slice(0, 300);

  for (const file of iaFiles) {
    const content = await readFile(file.path).catch(() => null);
    if (!content) continue;
    for (const p of IAC_AI_PATTERNS) {
      if (!p.pathPatterns.some(r => r.test(file.path))) continue;
      if (!p.contentSignals.some(r => r.test(content))) continue;
      signals.push({
        cloud: p.cloud, service: p.service, riskLevel: p.riskLevel,
        resource: p.contentSignals.find(r => r.test(content))?.source.slice(0, 60) ?? '',
        configPath: file.path,
      });
    }
  }
  return signals;
}
