import type { ShadowAIFinding, SourceAnalysis } from './types';

const KNOWN_PROVIDERS = ['openai', 'anthropic', 'mistral', 'google-ai', 'huggingface', 'cohere', 'deepseek'];
const GOVERNED_PATTERNS = [/auth|token|session|apiKey|middleware|protect/i, /registry|governance|audit|approved/i];

function isGoverned(content: string): boolean {
  return GOVERNED_PATTERNS.some(p => p.test(content));
}

function detectProvider(content: string): { provider: string; modelId: string | null } | null {
  for (const p of KNOWN_PROVIDERS) {
    if (new RegExp(p, 'i').test(content)) {
      const modelMatch = content.match(/(gpt-4|gpt-3\.5|claude|mistral-large|mistral-medium|deepseek|dall-e|whisper|tts)/i);
      return { provider: p, modelId: modelMatch?.[0] ?? null };
    }
  }
  return null;
}

export function detectShadowAI(files: Map<string, string>, source: SourceAnalysis): ShadowAIFinding[] {
  const findings: ShadowAIFinding[] = [];

  for (const agent of source.agents) {
    if (agent.models.includes('llm')) {
      // Check if the file content for this agent exists in the map
      const fileKey = Array.from(files.keys()).find(k => k.includes(agent.name));
      if (fileKey) {
        const content = files.get(fileKey) ?? '';
        if (!isGoverned(content)) {
          const providerInfo = detectProvider(content);
          findings.push({
            file: fileKey,
            provider: providerInfo?.provider ?? 'unknown',
            modelId: providerInfo?.modelId ?? null,
            usage: 'chat',
            governed: false,
            reason: agent.critical ? 'Agente crítico sem governança documentada' : 'Uso de LLM sem registro de governança',
          });
        }
      }
    }
  }

  // Also check files not mapped as agents but containing LLM calls
  for (const [path, content] of Array.from(files)) {
    if (!content || !path.endsWith('.ts') && !path.endsWith('.tsx') && !path.endsWith('.js')) continue;
    // Skip files already checked via agents
    if (source.agents.some(a => path.includes(a.name))) continue;
    // Skip node_modules and config files
    if (path.includes('node_modules') || path.includes('/config/')) continue;

    const hasApiCall = /\.chat\.completions|\.generate|\.create\b|\.invoke|\.stream/i.test(content);
    const providerInfo = detectProvider(content);

    if (hasApiCall && providerInfo && !isGoverned(content)) {
      findings.push({
        file: path,
        provider: providerInfo.provider,
        modelId: providerInfo.modelId,
        usage: hasApiCall ? 'chat' : 'unknown',
        governed: false,
        reason: 'Chamada LLM detectada sem contexto de governança',
      });
    }
  }

  return findings;
}
