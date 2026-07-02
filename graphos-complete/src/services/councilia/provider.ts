/**
 * 🛡️ SHIELDED PROTOCOL v12.0.0 — LLM Provider (Zero-Variance)
 * Bridges the Engine with OpenRouter/SiliconFlow with Zero-Variance Determinism.
 * LOCKED: Do not modify without formal Change Request (CR).
 */

export async function callLLM(
  messages: any[], 
  options: { model?: string; temperature?: number; json?: boolean; seed?: number } = {}
): Promise<string> {
  const model = options.model || "openai/gpt-4o-mini";
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  // v12.0.0 Deterministic Standards
  const temperature = options.temperature ?? 0.1;
  const seed = options.seed ?? 42;

  if (!apiKey) {
    // Fallback to OpenAI if OpenRouter is missing
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      response_format: options.json ? { type: 'json_object' } : undefined,
      seed
    } as any);
    return response.choices[0].message.content || '';
  }

  // OpenRouter implementation with Resilience (60s timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://councilia.com',
        'X-Title': 'CouncilIA v12.0.0 Scientific Authority'
      },
      body: JSON.stringify({
        model: model.includes('/') ? model : `openai/${model}`,
        messages,
        temperature,
        response_format: options.json ? { type: 'json_object' } : undefined,
        seed
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM_API_ERROR: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || '';
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('LLM_TIMEOUT');
    throw err;
  }
}

/**
 * Generates semantic embeddings for text analysis (PSI Metrology).
 * Using Mistral as the primary authority for embeddings (v14 alignment).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (!mistralKey) {
    console.warn("[Provider] MISTRAL_API_KEY missing, using dummy embedding.");
    return new Array(1536).fill(0);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch('https://api.mistral.ai/v1/embeddings', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${mistralKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-embed',
        input: [text.replace(/\n/g, ' ')]
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`EMBEDDING_ERROR: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("[Provider] Embedding failed:", err.message);
    // Return a zero vector instead of crashing the whole simulation
    return new Array(1024).fill(0); 
  }
}

/**
 * Calculates cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 1.0;
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 1.0;
  return dotProduct / (magnitudeA * magnitudeB);
}
