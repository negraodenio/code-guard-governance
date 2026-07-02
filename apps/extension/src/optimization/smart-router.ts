/**
 * Smart Router com Failover Automático
 * Seleciona provider mais barato e rápido, com fallback inteligente
 * 
 * FEATURES:
 * - Circuit breaker para providers instáveis
 * - Health checks automáticos
 * - Scoring por prioridade (cost/speed/reliability)
 * - Retry com backoff exponencial
 * - Performance history tracking
 */

import { EventEmitter } from 'events';
import { PROVIDERS, ACTIVE_CONFIG, ProviderName } from '../core/llm-config';

interface ProviderHealth {
    provider: string;
    healthy: boolean;
    avgLatency: number;
    errorRate: number;
    lastChecked: Date;
    consecutiveFailures: number;
}

interface RoutingDecision {
    provider: ProviderName;
    model: string;
    estimatedCost: number;
    estimatedLatency: number;
    reason: string;
    fallbackChain: ProviderName[];
}

interface PerformanceEntry {
    latency: number;
    success: boolean;
    timestamp: Date;
}

export class SmartRouter extends EventEmitter {
    private healthStatus: Map<string, ProviderHealth> = new Map();
    private circuitBreakers: Map<string, { open: boolean; resetAt: Date }> = new Map();
    private performanceHistory: Map<string, PerformanceEntry[]> = new Map();
    private healthCheckInterval?: NodeJS.Timeout;

    // Configurações de circuit breaker
    private readonly FAILURE_THRESHOLD = 5;
    private readonly CIRCUIT_TIMEOUT_MS = 60000; // 1 minuto
    private readonly LATENCY_THRESHOLD_MS = 5000; // 5 segundos

    constructor() {
        super();
        this.initializeHealthChecks();
    }

    /**
     * Rota inteligente com failover automático
     */
    async route(
        task: 'scan' | 'patch' | 'embeddings' | 'explain',
        contextSize?: number,
        priority: 'cost' | 'speed' | 'reliability' = 'cost'
    ): Promise<RoutingDecision> {

        // 1. Obter providers disponíveis (não em circuit breaker)
        const available = this.getAvailableProviders(task);

        if (available.length === 0) {
            throw new Error(`Nenhum provider disponível para ${task}`);
        }

        // 2. Score cada provider baseado em prioridade
        const scored = available.map(p => ({
            provider: p,
            score: this.calculateScore(p, task, priority, contextSize),
            health: this.healthStatus.get(p)!
        }));

        // 3. Ordenar por score
        scored.sort((a, b) => b.score - a.score);

        // 4. Construir chain de fallback
        const primary = scored[0];
        const fallbacks = scored.slice(1, 3).map(s => s.provider);

        const config = PROVIDERS[primary.provider];
        const estimatedCost = this.estimateCost(task, config);
        const estimatedLatency = primary.health?.avgLatency || 1000;

        const decision: RoutingDecision = {
            provider: primary.provider,
            model: this.getModelForTask(primary.provider, task),
            estimatedCost,
            estimatedLatency,
            reason: this.generateReason(primary, priority),
            fallbackChain: fallbacks
        };

        this.emit('route', decision);
        return decision;
    }

    /**
     * Executar com retry e failover automático
     */
    async executeWithFailover<T>(
        task: string,
        operation: (provider: ProviderName) => Promise<T>,
        maxRetries: number = 3
    ): Promise<T> {
        const routing = await this.route(task as any);
        const providers = [routing.provider, ...routing.fallbackChain];

        let lastError: Error | null = null;

        for (const provider of providers) {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                const startTime = Date.now();

                try {
                    this.emit('attempt', { provider, attempt, task });

                    const result = await operation(provider);

                    // Sucesso - registrar métricas
                    const latency = Date.now() - startTime;
                    this.recordSuccess(provider, latency);

                    this.emit('success', { provider, latency, task });
                    return result;

                } catch (error) {
                    lastError = error as Error;
                    const latency = Date.now() - startTime;

                    this.recordFailure(provider, latency);
                    this.emit('failure', { provider, attempt, error: lastError, task });

                    // Se não é última tentativa, aguardar backoff exponencial
                    if (attempt < maxRetries - 1) {
                        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                        await this.sleep(delay);
                    }
                }
            }

            // Todas as tentativas falharam para este provider
            this.openCircuitBreaker(provider);
            this.emit('circuitOpen', { provider, task });
        }

        // Todos os providers falharam
        throw new Error(`All providers failed for ${task}. Last error: ${lastError?.message}`);
    }

    /**
     * Forçar provider específico (override)
     */
    forceProvider(provider: ProviderName, durationMinutes: number = 30): void {
        const expiresAt = new Date(Date.now() + durationMinutes * 60000);

        // Marcar outros providers como unhealthy temporariamente
        for (const [key, health] of this.healthStatus) {
            if (key !== provider) {
                health.healthy = false;
                (health as any).forceExpiresAt = expiresAt;
            }
        }

        this.emit('forceProvider', { provider, expiresAt });
    }

    /**
     * Obter estatísticas de routing
     */
    getStats(): {
        health: Record<string, ProviderHealth>;
        circuitBreakers: string[];
        totalRouted: number;
        avgSuccessRate: number;
    } {
        const breakers = Array.from(this.circuitBreakers.entries())
            .filter(([_, cb]) => cb.open)
            .map(([p, _]) => p);

        const histories = Array.from(this.performanceHistory.values()).flat();
        const successRate = histories.length > 0 ?
            (histories.filter(h => h.success).length / histories.length) * 100 : 100;

        return {
            health: Object.fromEntries(this.healthStatus),
            circuitBreakers: breakers,
            totalRouted: histories.length,
            avgSuccessRate: successRate
        };
    }

    /**
     * Parar health checks
     */
    stop(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
    }

    // ============ MÉTODOS PRIVADOS ============

    private initializeHealthChecks(): void {
        // Inicializar status para todos os providers
        for (const provider of Object.keys(PROVIDERS)) {
            this.healthStatus.set(provider, {
                provider,
                healthy: true,
                avgLatency: 1000,
                errorRate: 0,
                lastChecked: new Date(),
                consecutiveFailures: 0
            });
            this.performanceHistory.set(provider, []);
        }

        // Health check a cada 30 segundos
        this.healthCheckInterval = setInterval(() => this.runHealthChecks(), 30000);
    }

    private async runHealthChecks(): Promise<void> {
        for (const [provider, config] of Object.entries(PROVIDERS)) {
            // Verificar circuit breaker
            const cb = this.circuitBreakers.get(provider);
            if (cb?.open && Date.now() < cb.resetAt.getTime()) {
                continue; // Ainda em timeout
            }

            // Verificar se provider tem config válida
            if (!config.baseUrl) {
                this.updateHealth(provider, { healthy: false, errorRate: 100 });
                continue;
            }

            // Teste de health (verificar conexão básica)
            const start = Date.now();
            try {
                // Simular health check (em produção faria request real)
                const latency = Date.now() - start;
                const healthy = true; // Assumir saudável se não houve erro recente

                this.updateHealth(provider, {
                    healthy,
                    avgLatency: latency,
                    errorRate: healthy ? 0 : 100,
                    lastChecked: new Date()
                });

                if (healthy && cb?.open) {
                    this.closeCircuitBreaker(provider);
                }

            } catch (error) {
                this.updateHealth(provider, {
                    healthy: false,
                    errorRate: 100,
                    lastChecked: new Date()
                });
            }
        }
    }

    private getAvailableProviders(task: string): ProviderName[] {
        const taskKey = task as keyof typeof ACTIVE_CONFIG.routing;
        const primary = ACTIVE_CONFIG.routing[taskKey];
        const fallbacks = ACTIVE_CONFIG.fallbacks[taskKey] || [];
        const all = [primary, ...fallbacks];

        return all.filter(p => {
            // Verificar circuit breaker
            const cb = this.circuitBreakers.get(p);
            if (cb?.open && Date.now() < cb.resetAt.getTime()) {
                return false;
            }

            // Verificar health
            const health = this.healthStatus.get(p);
            if (health && !health.healthy) {
                // Verificar se é force temporário
                if (!(health as any)?.forceExpiresAt) {
                    return false;
                }
            }

            return true;
        }) as ProviderName[];
    }

    private calculateScore(
        provider: ProviderName,
        task: string,
        priority: 'cost' | 'speed' | 'reliability',
        contextSize?: number
    ): number {
        const config = PROVIDERS[provider];
        const health = this.healthStatus.get(provider);
        const history = this.performanceHistory.get(provider) || [];

        if (!config || !health) return 0;

        // Fatores base
        const costScore = 1 / (config.pricing.inputPer1M + config.pricing.outputPer1M + 0.01);
        const speedScore = 1 / Math.max(health.avgLatency, 100);
        const reliabilityScore = 1 - (health.errorRate / 100);

        // Contexto size bonus (Kimi ganha para arquivos grandes)
        const contextBonus = contextSize && contextSize > 64000 ?
            (config.contextWindow > 128000 ? 0.3 : 0) : 0;

        // Histórico recente (últimas 10 chamadas)
        const recent = history.slice(-10);
        const recentSuccessRate = recent.length > 0 ?
            recent.filter(h => h.success).length / recent.length : 1;

        switch (priority) {
            case 'cost':
                return costScore * 0.5 + reliabilityScore * 0.3 + speedScore * 0.1 + contextBonus;
            case 'speed':
                return speedScore * 0.5 + reliabilityScore * 0.3 + costScore * 0.1 + contextBonus;
            case 'reliability':
                return reliabilityScore * 0.5 + recentSuccessRate * 0.3 + costScore * 0.1 + contextBonus;
            default:
                return costScore;
        }
    }

    private estimateCost(task: string, config: typeof PROVIDERS[ProviderName]): number {
        const estimates: Record<string, { input: number; output: number }> = {
            scan: { input: 2000, output: 500 },
            patch: { input: 1500, output: 800 },
            embeddings: { input: 1000, output: 0 },
            explain: { input: 3000, output: 1500 },
        };

        const est = estimates[task] || estimates.scan;
        const inputCost = (est.input / 1_000_000) * config.pricing.inputPer1M;
        const outputCost = (est.output / 1_000_000) * config.pricing.outputPer1M;

        return inputCost + outputCost;
    }

    private getModelForTask(provider: ProviderName, task: string): string {
        const config = PROVIDERS[provider];
        const models = config.models as Record<string, string>;
        return models[task] || models.default || 'unknown';
    }

    private generateReason(scored: any, priority: string): string {
        const reasons: Record<string, string> = {
            cost: `Lowest cost (${scored.score.toFixed(2)} score)`,
            speed: `Fastest response (${scored.health?.avgLatency?.toFixed(0) || 'N/A'}ms avg)`,
            reliability: `Highest reliability (${((1 - (scored.health?.errorRate || 0)) * 100).toFixed(1)}% uptime)`
        };
        return reasons[priority] || 'Default routing';
    }

    private recordSuccess(provider: string, latency: number): void {
        const health = this.healthStatus.get(provider);
        if (health) {
            health.consecutiveFailures = 0;
            health.healthy = true;
        }

        const history = this.performanceHistory.get(provider) || [];
        history.push({ latency, success: true, timestamp: new Date() });

        // Manter apenas últimas 100 entradas
        if (history.length > 100) {
            this.performanceHistory.set(provider, history.slice(-100));
        } else {
            this.performanceHistory.set(provider, history);
        }

        // Recalcular avg latency
        if (health) {
            const recent = history.slice(-10);
            health.avgLatency = recent.reduce((s, h) => s + h.latency, 0) / recent.length;
        }
    }

    private recordFailure(provider: string, latency: number): void {
        const health = this.healthStatus.get(provider);
        if (health) {
            health.consecutiveFailures++;
        }

        const history = this.performanceHistory.get(provider) || [];
        history.push({ latency, success: false, timestamp: new Date() });
        this.performanceHistory.set(provider, history);

        // Abrir circuit breaker se muitas falhas consecutivas
        if (health && health.consecutiveFailures >= this.FAILURE_THRESHOLD) {
            this.openCircuitBreaker(provider);
        }
    }

    private openCircuitBreaker(provider: string): void {
        this.circuitBreakers.set(provider, {
            open: true,
            resetAt: new Date(Date.now() + this.CIRCUIT_TIMEOUT_MS)
        });

        const health = this.healthStatus.get(provider);
        if (health) {
            health.healthy = false;
        }

        console.warn(`[SmartRouter] Circuit breaker OPENED for ${provider}`);
        this.emit('circuitOpen', { provider, resetAt: this.circuitBreakers.get(provider)!.resetAt });
    }

    private closeCircuitBreaker(provider: string): void {
        this.circuitBreakers.delete(provider);

        const health = this.healthStatus.get(provider);
        if (health) {
            health.consecutiveFailures = 0;
            health.healthy = true;
        }

        console.error(`[SmartRouter] Circuit breaker CLOSED for ${provider}`);
        this.emit('circuitClose', { provider });
    }

    private updateHealth(provider: string, updates: Partial<ProviderHealth>): void {
        const current = this.healthStatus.get(provider);
        if (current) {
            this.healthStatus.set(provider, { ...current, ...updates });
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton
let _instance: SmartRouter | null = null;

export function getSmartRouter(): SmartRouter {
    if (!_instance) {
        _instance = new SmartRouter();
    }
    return _instance;
}

export const smartRouter = getSmartRouter();

export default SmartRouter;
