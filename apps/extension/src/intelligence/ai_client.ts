
import { vscode } from '../utils/vscode-compat';
import fetch from 'node-fetch';
import { getSupabaseClient } from '../supabase/client';

export interface AIAnalysis {
    riskAssessment: string;
    suggestedFix: string | null;
    confidence: number;
}

export class AIClient {

    private static getConfiguration() {
        const config = vscode.workspace.getConfiguration('codeguard');
        return {
            provider: config.get('aiProvider') as string || 'openrouter',
            apiKey: config.get('userApiKey') as string || '',
            model: config.get('modelName') as string || 'openai/gpt-4o-mini'
        };
    }

    static async generateEmbedding(text: string): Promise<number[] | null> {
        const { provider, apiKey, model } = this.getConfiguration();

        // 1. CodeGuard Cloud (Managed Mode)
        if (provider === 'codeguard-cloud') {
            const supabase = getSupabaseClient();
            if (!supabase) return null;

            // Call secure proxy
            const { data, error } = await supabase.functions.invoke('ai-proxy', {
                body: {
                    action: 'embedding',
                    input: text,
                    model: 'text-embedding-ada-002'
                }
            });

            if (error || !data) {
                console.error('[CodeGuard] Cloud Embedding Error:', error);
                return null; // Fail explicitly
            }
            return data.embedding;
        }

        // 2. BYOK (OpenRouter / OpenAI)
        if (!apiKey) {
            console.warn('AI Client: No API Key provided for BYOK.');
            return null;
        }

        const endpoint = provider === 'openai'
            ? 'https://api.openai.com/v1/embeddings'
            : 'https://openrouter.ai/api/v1/embeddings';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://codeguard.ai', 'X-Title': 'CodeGuard AI' } : {})
                },
                body: JSON.stringify({
                    input: text,
                    model: 'text-embedding-ada-002'
                })
            });

            if (!response.ok) {
                console.error(`AI Embedding Error: ${response.statusText}`);
                return null;
            }

            const data: any = await response.json();
            return data.data[0].embedding;

        } catch (error) {
            console.error('AI Client Embedding Exception:', error);
            return null;
        }
    }

    /**
     * Options for AI completion requests
     */
    static async complete(
        prompt: string,
        options?: {
            modelOverride?: string;
            systemPrompt?: string;
            maxTokens?: number;
        }
    ): Promise<string | null> {
        const { provider, apiKey, model } = this.getConfiguration();
        const effectiveModel = options?.modelOverride || model;
        const maxTokens = options?.maxTokens || 2000;

        // Build messages array with optional system prompt
        const messages: Array<{ role: string; content: string }> = [];
        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        // 1. CodeGuard Cloud (Managed Mode)
        if (provider === 'codeguard-cloud') {
            const supabase = getSupabaseClient();
            if (!supabase) return null;

            const { data, error } = await supabase.functions.invoke('ai-proxy', {
                body: {
                    action: 'chat',
                    messages: messages,
                    model: effectiveModel,
                    max_tokens: maxTokens
                }
            });

            if (error || !data) {
                console.error('[CodeGuard] Cloud AI Error:', error);
                return null; // Fail explicitly in production
            }
            return data.content;
        }

        // 2. BYOK (Bring Your Own Key)
        if (!apiKey) return null;

        const endpoint = provider === 'openai'
            ? 'https://api.openai.com/v1/chat/completions'
            : 'https://openrouter.ai/api/v1/chat/completions';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://codeguard.ai', 'X-Title': 'CodeGuard AI' } : {})
                },
                body: JSON.stringify({
                    model: effectiveModel,
                    messages: messages,
                    max_tokens: maxTokens
                })
            });

            if (!response.ok) {
                console.error(`AI Completion Error: ${response.status} ${response.statusText}`);
                return null;
            }
            const data: any = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error('AI Client Completion Exception:', error);
            return null;
        }
    }
}
