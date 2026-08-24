import type { AIModel } from './types';

const MODEL_PROVIDER_MAP: Record<string, string> = {
  'openai': 'OpenAI', 'gpt': 'OpenAI', 'o1': 'OpenAI', 'o3': 'OpenAI',
  'anthropic': 'Anthropic', 'claude': 'Anthropic',
  'mistral': 'Mistral', 'mixtral': 'Mistral',
  'deepseek': 'DeepSeek',
  'meta-llama': 'Meta', 'llama': 'Meta',
  'google': 'Google', 'gemini': 'Google',
  'cohere': 'Cohere', 'command': 'Cohere',
  'perplexity': 'Perplexity', 'sonar': 'Perplexity',
  'ai21': 'AI21', 'jamba': 'AI21',
  'replicate': 'Replicate',
};

const MODEL_USAGE_PATTERNS: { pattern: RegExp; usage: AIModel['usage'] }[] = [
  { pattern: /embed|ada-002|davinci-002|3-small|3-large/i, usage: 'embedding' },
  { pattern: /vision|vl$|v$|4o-v/i, usage: 'vision' },
  { pattern: /dall-e|dalle|dall[eE]/i, usage: 'completion' },
  { pattern: /tts|speech|whisper|audio/i, usage: 'completion' },
];

export function parseModelId(raw: string): AIModel {
  // Handle openrouter/ prefixed models
  if (raw.startsWith('openrouter/')) {
    const actualModel = raw.replace('openrouter/', '');
    const parts = actualModel.split('/');
    const providerKey = parts[0].toLowerCase();
    const modelId = parts.slice(1).join('/') || actualModel;
    const provider = MODEL_PROVIDER_MAP[providerKey] || 'OpenRouter';
    const usage = detectUsage(modelId);
    return { provider, modelId, usage };
  }

  // Handle provider/model format
  if (raw.includes('/')) {
    const parts = raw.split('/');
    const providerKey = parts[0].toLowerCase();
    const modelId = parts.slice(1).join('/') || raw;
    const provider = MODEL_PROVIDER_MAP[providerKey] || providerKey.charAt(0).toUpperCase() + providerKey.slice(1);
    const usage = detectUsage(modelId);
    return { provider, modelId, usage };
  }

  // Detect standard model patterns
  for (const [key, provider] of Object.entries(MODEL_PROVIDER_MAP)) {
    if (raw.toLowerCase().startsWith(key)) {
      const usage = detectUsage(raw);
      return { provider, modelId: raw, usage };
    }
  }

  return { provider: 'Unknown', modelId: raw, usage: 'unknown' };
}

function detectUsage(modelId: string): AIModel['usage'] {
  for (const { pattern, usage } of MODEL_USAGE_PATTERNS) {
    if (pattern.test(modelId)) return usage;
  }
  return 'chat';
}

const ALL_MODEL_PATTERNS: { provider: string; regex: RegExp; usage: AIModel['usage'] }[] = [
  { provider: 'OpenAI', regex: /gpt-?4?o?-?mini|gpt-?4?o|gpt-?4|gpt-?3\.5|text-davinci|o1|o3/gi, usage: 'chat' },
  { provider: 'OpenAI', regex: /text-embedding|ada-002|davinci-002/gi, usage: 'embedding' },
  { provider: 'Anthropic', regex: /claude-3?\.?\d?-?(haiku|sonnet|opus)?/gi, usage: 'chat' },
  { provider: 'Mistral', regex: /mistral-?(large|medium|small|embed|nemo)?/gi, usage: 'chat' },
  { provider: 'DeepSeek', regex: /deepseek-?(chat|reasoner|v3|r1)?/gi, usage: 'chat' },
  { provider: 'OpenRouter', regex: /openrouter|open-router/gi, usage: 'chat' },
];

export function scanModelIds(content: string): AIModel[] {
  const models: AIModel[] = [];
  const seen = new Set<string>();

  // OpenRouter model references
  const openRouterMatches = content.match(/openrouter\/([a-z0-9-]+(\/[a-z0-9-]+)*)/gi);
  if (openRouterMatches) {
    for (const ref of openRouterMatches) {
      const parsed = parseModelId(ref);
      const key = `${parsed.provider}:${parsed.modelId}`;
      if (!seen.has(key)) {
        seen.add(key);
        models.push(parsed);
      }
    }
  }

  // Standard model patterns
  for (const { provider, regex, usage } of ALL_MODEL_PATTERNS) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      const key = `${provider}:${m[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        models.push({ provider, modelId: m[0], usage });
      }
    }
  }

  // Provider import detection
  if (/(from\s+['"]openai['"]|require\(['"]openai['"]\))/.test(content) && !seen.has('OpenAI:import')) {
    seen.add('OpenAI:import');
    models.push({ provider: 'OpenAI', modelId: null, usage: 'chat' });
  }
  if (/(from\s+['"]@anthropic|require\(['"]@anthropic)/.test(content) && !seen.has('Anthropic:import')) {
    seen.add('Anthropic:import');
    models.push({ provider: 'Anthropic', modelId: null, usage: 'chat' });
  }
  if (/(from\s+['"]@mistralai|require\(['"]@mistralai)/.test(content) && !seen.has('Mistral:import')) {
    seen.add('Mistral:import');
    models.push({ provider: 'Mistral', modelId: null, usage: 'chat' });
  }

  return models;
}

export function estimateModelCost(provider: string, modelId: string | null): number {
  const modelStr = (modelId ?? '').toLowerCase();
  const costs: [RegExp, number][] = [
    [/gpt-?4o?/, 0.005], [/gpt-?4/, 0.03], [/gpt-?3\.5/, 0.0015], [/o1/, 0.015], [/o3/, 0.01],
    [/claude-3-5-sonnet/, 0.003], [/claude-3-opus/, 0.015], [/claude-3-haiku/, 0.00025], [/claude/, 0.008],
    [/mistral-large/, 0.002], [/mistral-medium/, 0.0007], [/mistral-small/, 0.0002],
    [/deepseek-(chat|v3)/, 0.0005], [/deepseek-r1/, 0.002],
    [/llama-3/, 0.0005], [/gemini/, 0.0005],
  ];
  for (const [pattern, cost] of costs) {
    if (pattern.test(modelStr)) return cost;
  }
  switch (provider.toLowerCase()) {
    case 'openai': return 0.01;
    case 'anthropic': return 0.008;
    case 'mistral': return 0.001;
    case 'deepseek': return 0.0005;
    default: return 0.001;
  }
}
