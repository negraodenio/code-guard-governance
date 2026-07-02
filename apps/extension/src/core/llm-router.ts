/**
 * LLM Router - Intelligent Provider Selection
 * 
 * Roteia automaticamente para o provider mais barato disponível,
 * com fallback automático e tracking de custos.
 * 
 * ESTRATÉGIA:
 * 1. MiniMax 2.7: Scan + Explain (contexto 205k, otimizado para coding)
 * 2. GPT-4o-mini: Patch (85% mais barato que Haiku)
 * 3. SiliconFlow: Embeddings (10x mais barato que OpenAI)
 * 4. Kimi K2.5: Fallback de contexto longo (262k)
 */

import {
    PROVIDERS,
    ROUTING_CONFIG,
    TaskType,
    ProviderName,
    LLMProviderConfig,
    getProviderForTask,
    estimateCost,
    checkCostLimit,
} from './llm-config.js';

import { costAnalytics } from '../dashboard/cost-analytics';

interface RoutingDecision {
    provider: ProviderName;
    model: string;
    estimatedCost: number;
    reason: string;
    warning?: string;
}

interface UsageRecord {
    timestamp: Date;
    task: TaskType;
    provider: ProviderName;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    success: boolean;
}

interface CompletionParams {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
    temperature?: number;
}

interface EmbeddingParams {
    input: string | string[];
    model?: string;
}

export class LLMRouter {
    private usageHistory: UsageRecord[] = [];
    private monthlySpend: number = 0;
    private lastResetDate: Date = new Date();

    constructor() {
        // Reset monthly spend on first day of month
        this.checkMonthlyReset();
    }

    /**
     * Route to best provider for a task
     */
    route(task: TaskType, contextSize?: number): RoutingDecision {
        const provider = getProviderForTask(task);
        const providerName = Object.entries(PROVIDERS).find(
            ([_, config]) => config === provider
        )?.[0] as ProviderName;

        const model = provider.models[task];
        const cost = estimateCost(task, provider);
        const withinLimit = checkCostLimit(task, cost);

        const decision: RoutingDecision = {
            provider: providerName,
            model,
            estimatedCost: cost,
            reason: this.getRoutingReason(task, providerName),
        };

        if (!withinLimit) {
            decision.warning = `Custo estimado ($${cost.toFixed(4)}) excede limite`;
        }

        if (contextSize && contextSize > provider.contextWindow) {
            decision.warning = `Contexto (${contextSize}) excede limite do provider (${provider.contextWindow})`;
        }

        return decision;
    }

    /**
     * Execute a completion request with automatic routing
     */
    async complete(
        task: TaskType,
        params: CompletionParams
    ): Promise<{ content: string; usage: { tokensIn: number; tokensOut: number; cost: number } }> {
        const decision = this.route(task);
        const provider = PROVIDERS[decision.provider];

        const startTime = Date.now();
        let tokensIn = 0;
        let tokensOut = 0;
        let success = false;

        try {
            const response = await this.callProvider(provider, task, params);
            tokensIn = response.usage?.prompt_tokens || 0;
            tokensOut = response.usage?.completion_tokens || 0;
            success = true;

            const cost = this.calculateActualCost(provider, tokensIn, tokensOut);
            this._trackUsageInternal(task, decision.provider, tokensIn, tokensOut, cost, success);

            return {
                content: response.choices[0].message.content,
                usage: { tokensIn, tokensOut, cost },
            };
        } catch (error) {
            // Try fallback
            console.warn(`❌ ${decision.provider} falhou, tentando fallback...`);

            for (const fallbackName of ROUTING_CONFIG.fallbacks[task]) {
                if (fallbackName === decision.provider) continue;

                const fallback = PROVIDERS[fallbackName];
                if (!fallback.apiKey || fallback.apiKey.length < 10) continue;

                try {
                    const response = await this.callProvider(fallback, task, params);
                    tokensIn = response.usage?.prompt_tokens || 0;
                    tokensOut = response.usage?.completion_tokens || 0;
                    success = true;

                    const cost = this.calculateActualCost(fallback, tokensIn, tokensOut);
                    this._trackUsageInternal(task, fallbackName as ProviderName, tokensIn, tokensOut, cost, success);

                    return {
                        content: response.choices[0].message.content,
                        usage: { tokensIn, tokensOut, cost },
                    };
                } catch (fallbackError) {
                    console.warn(`❌ Fallback ${fallbackName} também falhou`);
                }
            }

            throw new Error(`Todos os providers falharam para ${task}`);
        }
    }

    /**
     * Generate embeddings with automatic routing
     */
    async embed(
        input: string | string[]
    ): Promise<{ embeddings: number[][]; usage: { tokens: number; cost: number } }> {
        const decision = this.route('embeddings');
        const provider = PROVIDERS[decision.provider];

        try {
            const response = await this.callEmbeddingProvider(provider, input);
            const tokens = response.usage?.total_tokens || 0;
            const cost = (tokens / 1_000_000) * provider.pricing.inputPer1M;

            this._trackUsageInternal('embeddings', decision.provider, tokens, 0, cost, true);

            return {
                embeddings: response.data.map((d: any) => d.embedding),
                usage: { tokens, cost },
            };
        } catch (error) {
            // Fallback to OpenAI if SiliconFlow fails
            if (decision.provider !== 'openai' && PROVIDERS.openai.apiKey) {
                console.warn('⚠️ SiliconFlow embeddings falhou, usando OpenAI');
                const response = await this.callEmbeddingProvider(PROVIDERS.openai, input);
                const tokens = response.usage?.total_tokens || 0;
                const cost = (tokens / 1_000_000) * PROVIDERS.openai.pricing.inputPer1M;

                this._trackUsageInternal('embeddings', 'openai', tokens, 0, cost, true);

                return {
                    embeddings: response.data.map((d: any) => d.embedding),
                    usage: { tokens, cost },
                };
            }
            throw error;
        }
    }

    /**
     * Get usage statistics
     */
    getStats(): {
        totalSpend: number;
        monthlySpend: number;
        byProvider: Record<string, { calls: number; tokens: number; cost: number }>;
        byTask: Record<string, { calls: number; cost: number }>;
        recentCalls: UsageRecord[];
    } {
        const byProvider: Record<string, { calls: number; tokens: number; cost: number }> = {};
        const byTask: Record<string, { calls: number; cost: number }> = {};

        for (const record of this.usageHistory) {
            // By provider
            if (!byProvider[record.provider]) {
                byProvider[record.provider] = { calls: 0, tokens: 0, cost: 0 };
            }
            byProvider[record.provider].calls++;
            byProvider[record.provider].tokens += record.tokensIn + record.tokensOut;
            byProvider[record.provider].cost += record.cost;

            // By task
            if (!byTask[record.task]) {
                byTask[record.task] = { calls: 0, cost: 0 };
            }
            byTask[record.task].calls++;
            byTask[record.task].cost += record.cost;
        }

        return {
            totalSpend: this.usageHistory.reduce((sum, r) => sum + r.cost, 0),
            monthlySpend: this.monthlySpend,
            byProvider,
            byTask,
            recentCalls: this.usageHistory.slice(-10),
        };
    }

    /**
     * Check if monthly limit is approaching
     */
    checkMonthlyLimit(): { exceeded: boolean; percentage: number; warning?: string } {
        const limit = ROUTING_CONFIG.costLimits.maxMonthly;
        const percentage = (this.monthlySpend / limit) * 100;

        return {
            exceeded: this.monthlySpend >= limit,
            percentage,
            warning: percentage >= 80 ? `⚠️ ${percentage.toFixed(0)}% do limite mensal atingido` : undefined,
        };
    }

    // Private methods

    private async callProvider(
        provider: LLMProviderConfig,
        task: TaskType,
        params: CompletionParams
    ): Promise<any> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
        };

        // OpenRouter specific headers
        if (provider.name === 'OpenRouter') {
            headers['HTTP-Referer'] = 'https://codeguard.ai';
            headers['X-Title'] = 'CodeGuard AI';
        }

        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: provider.models[task],
                messages: params.messages,
                max_tokens: params.maxTokens || 2000,
                temperature: params.temperature || 0.3,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`${provider.name} error: ${response.status} - ${JSON.stringify(error)}`);
        }

        return response.json();
    }

    private async callEmbeddingProvider(
        provider: LLMProviderConfig,
        input: string | string[]
    ): Promise<any> {
        const response = await fetch(`${provider.baseUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
                model: provider.models.embeddings,
                input: Array.isArray(input) ? input : [input],
            }),
        });

        if (!response.ok) {
            throw new Error(`Embedding error: ${response.status}`);
        }

        return response.json();
    }

    private calculateActualCost(
        provider: LLMProviderConfig,
        tokensIn: number,
        tokensOut: number
    ): number {
        return (
            (tokensIn / 1_000_000) * provider.pricing.inputPer1M +
            (tokensOut / 1_000_000) * provider.pricing.outputPer1M
        );
    }

    /**
     * Track usage for analytics (public for orchestrator access)
     */
    trackUsage(
        provider: ProviderName,
        tokensIn: number,
        tokensOut: number,
        task: TaskType = 'scan'
    ): void {
        const providerConfig = PROVIDERS[provider];
        const cost = providerConfig
            ? this.calculateActualCost(providerConfig, tokensIn, tokensOut)
            : 0;
        this._trackUsageInternal(task, provider, tokensIn, tokensOut, cost, true);
    }

    private _trackUsageInternal(
        task: TaskType,
        provider: ProviderName,
        tokensIn: number,
        tokensOut: number,
        cost: number,
        success: boolean
    ): void {
        const record: UsageRecord = {
            timestamp: new Date(),
            task,
            provider,
            tokensIn,
            tokensOut,
            cost,
            success,
        };

        // 🆕 Sync with Dashboard Analytics
        costAnalytics.record({
            provider,
            task,
            tokensIn,
            tokensOut,
            cost,
            latency: 0,
            success
        });

        this.usageHistory.push(record);
        this.monthlySpend += cost;

        // Keep only last 1000 records
        if (this.usageHistory.length > 1000) {
            this.usageHistory = this.usageHistory.slice(-1000);
        }

        // Check monthly limit
        const limitCheck = this.checkMonthlyLimit();
        if (limitCheck.warning) {
            console.warn(limitCheck.warning);
        }
    }

    private checkMonthlyReset(): void {
        const now = new Date();
        if (now.getMonth() !== this.lastResetDate.getMonth()) {
            this.monthlySpend = 0;
            this.lastResetDate = now;
        }
    }

    private getRoutingReason(task: TaskType, provider: ProviderName): string {
        const reasons: Record<TaskType, Record<string, string>> = {
            scan: {
                minimax: 'MiniMax 2.7: Contexto 205k, otimizado para Deep Coding & Agents',
                kimi: 'Kimi K2.5: Fallback de contexto longo (262k)',
                openai: 'GPT-4o-mini: Fallback confiável, $0.15/M input',
                openrouter: 'OpenRouter: Gateway universal (+5.5% markup)',
            },
            patch: {
                openai: 'GPT-4o-mini: $0.60/M output - 85% mais barato que Claude Haiku',
                kimi: 'Kimi K2.5: Bom para patches complexos, contexto longo',
                siliconflow: 'DeepSeek: Custo mínimo para patches simples',
                openrouter: 'OpenRouter: Gateway universal (+5.5% markup)',
            },
            embeddings: {
                siliconflow: 'SiliconFlow BGE: ~$0.01/M - 10x mais barato que OpenAI',
                openai: 'OpenAI Embedding: Fallback confiável, $0.10/M',
                openrouter: 'OpenRouter: Gateway universal',
                kimi: 'Kimi fallback',
            },
            explain: {
                kimi: 'Kimi K2.5: Contexto 262k para análise de projetos inteiros',
                openai: 'GPT-4o-mini: Explicações concisas',
                siliconflow: 'DeepSeek: Custo mínimo',
                openrouter: 'OpenRouter: Gateway universal',
            },
        };

        return reasons[task]?.[provider] || `Provider: ${provider}`;
    }
}

// Singleton instance
let routerInstance: LLMRouter | null = null;

export function getLLMRouter(): LLMRouter {
    if (!routerInstance) {
        routerInstance = new LLMRouter();
    }
    return routerInstance;
}

export default LLMRouter;
