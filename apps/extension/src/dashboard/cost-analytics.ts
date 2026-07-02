/**
 * Dashboard de Custos em Tempo Real
 * Visualização e analytics de gastos por provider
 * 
 * FEATURES:
 * - Métricas em tempo real por provider
 * - Projeção de gastos mensais
 * - Recomendações de otimização
 * - Cálculo de savings vs OpenAI
 * - Export para CSV
 */

import { EventEmitter } from 'events';

interface CostMetrics {
    timestamp: Date;
    provider: string;
    task: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    latency: number;
    success: boolean;
}

interface ProviderStats {
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    avgLatency: number;
    successRate: number;
    costPer1KTokens: number;
}

interface DailyMetrics {
    date: string;
    totalCost: number;
    byProvider: Record<string, number>;
    byTask: Record<string, number>;
}

export class CostAnalytics extends EventEmitter {
    private metrics: CostMetrics[] = [];
    private readonly maxHistory = 10000; // Manter últimas 10k chamadas

    // Limites de alerta
    private budgetLimit: number = 1000; // $1000 default
    private alertThresholds = [0.5, 0.8, 0.95]; // 50%, 80%, 95%

    constructor(private storage?: Storage) {
        super();
        this.loadFromStorage();
    }

    /**
     * Registrar métrica de uma chamada
     */
    record(metrics: Omit<CostMetrics, 'timestamp'>): void {
        const entry: CostMetrics = {
            ...metrics,
            timestamp: new Date()
        };

        this.metrics.push(entry);

        // Limitar histórico
        if (this.metrics.length > this.maxHistory) {
            this.metrics = this.metrics.slice(-this.maxHistory);
        }

        // Persistir
        this.saveToStorage();

        // Verificar alertas
        this.checkBudgetAlerts();

        // Emitir evento
        this.emit('metric', entry);
        this.emit('update', this.getSummary());
    }

    /**
     * Resumo em tempo real
     */
    getSummary(): {
        today: {
            cost: number;
            calls: number;
            tokens: number;
        };
        thisMonth: {
            cost: number;
            budgetUsed: number;
            projected: number;
        };
        byProvider: Record<string, ProviderStats>;
        savings: {
            actual: number;
            vsOpenAI: number;
            percentage: number;
        };
    } {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thisMonth = now.toISOString().slice(0, 7);

        const todayMetrics = this.metrics.filter(m =>
            m.timestamp.toISOString().startsWith(today)
        );

        const monthMetrics = this.metrics.filter(m =>
            m.timestamp.toISOString().startsWith(thisMonth)
        );

        // Calcular savings vs OpenAI
        const actualCost = monthMetrics.reduce((sum, m) => sum + m.cost, 0);
        const openAICost = monthMetrics.reduce((sum, m) => {
            // OpenAI é ~3.5x mais caro em média
            const multiplier = m.provider === 'siliconflow' ? 10 :
                m.provider === 'kimi' ? 2.5 : 3.5;
            return sum + (m.cost * multiplier);
        }, 0);

        return {
            today: {
                cost: todayMetrics.reduce((sum, m) => sum + m.cost, 0),
                calls: todayMetrics.length,
                tokens: todayMetrics.reduce((sum, m) => sum + m.tokensIn + m.tokensOut, 0)
            },
            thisMonth: {
                cost: actualCost,
                budgetUsed: (actualCost / this.budgetLimit) * 100,
                projected: this.projectMonthlyCost(actualCost, now.getDate())
            },
            byProvider: this.calculateProviderStats(monthMetrics),
            savings: {
                actual: actualCost,
                vsOpenAI: openAICost,
                percentage: openAICost > 0 ? ((openAICost - actualCost) / openAICost) * 100 : 0
            }
        };
    }

    /**
     * Métricas detalhadas por provider
     */
    getProviderBreakdown(provider: string): {
        hourly: Array<{ hour: string; cost: number; calls: number }>;
        byTask: Record<string, { cost: number; count: number }>;
        efficiency: {
            costPerCall: number;
            tokensPerCall: number;
            successRate: number;
        };
    } {
        const providerMetrics = this.metrics.filter(m => m.provider === provider);
        const last24h = providerMetrics.filter(m =>
            m.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        // Agrupar por hora
        const hourly = new Map<string, { cost: number; calls: number }>();
        last24h.forEach(m => {
            const hour = m.timestamp.toISOString().slice(0, 13) + ':00';
            const current = hourly.get(hour) || { cost: 0, calls: 0 };
            hourly.set(hour, {
                cost: current.cost + m.cost,
                calls: current.calls + 1
            });
        });

        // Agrupar por task
        const byTask: Record<string, { cost: number; count: number }> = {};
        providerMetrics.forEach(m => {
            if (!byTask[m.task]) {
                byTask[m.task] = { cost: 0, count: 0 };
            }
            byTask[m.task].cost += m.cost;
            byTask[m.task].count += 1;
        });

        const totalCalls = providerMetrics.length;
        const successful = providerMetrics.filter(m => m.success).length;

        return {
            hourly: Array.from(hourly.entries())
                .map(([hour, data]) => ({ hour, ...data }))
                .sort((a, b) => a.hour.localeCompare(b.hour)),
            byTask,
            efficiency: {
                costPerCall: totalCalls > 0 ? providerMetrics.reduce((sum, m) => sum + m.cost, 0) / totalCalls : 0,
                tokensPerCall: totalCalls > 0 ? providerMetrics.reduce((sum, m) => sum + m.tokensIn + m.tokensOut, 0) / totalCalls : 0,
                successRate: totalCalls > 0 ? (successful / totalCalls) * 100 : 100
            }
        };
    }

    /**
     * Recomendações de otimização
     */
    getRecommendations(): Array<{
        type: 'cost' | 'performance' | 'reliability';
        severity: 'low' | 'medium' | 'high';
        message: string;
        potentialSavings: number;
        action: string;
    }> {
        const recommendations = [];
        const summary = this.getSummary();

        // Alerta de orçamento
        if (summary.thisMonth.budgetUsed > 80) {
            recommendations.push({
                type: 'cost' as const,
                severity: 'high' as const,
                message: `Orçamento 80% utilizado ($${summary.thisMonth.cost.toFixed(2)})`,
                potentialSavings: summary.thisMonth.projected - this.budgetLimit,
                action: 'Considere aumentar o limite ou reduzir uso de IA'
            });
        }

        // Provider caro
        const expensiveProvider = Object.entries(summary.byProvider)
            .find(([_, stats]) => stats.costPer1KTokens > 0.50);

        if (expensiveProvider) {
            recommendations.push({
                type: 'cost' as const,
                severity: 'medium' as const,
                message: `${expensiveProvider[0]} está custando $${expensiveProvider[1].costPer1KTokens.toFixed(2)} por 1k tokens`,
                potentialSavings: expensiveProvider[1].totalCost * 0.3,
                action: 'Migre tarefas para SiliconFlow ou Kimi'
            });
        }

        // Falhas frequentes
        const unreliableProvider = Object.entries(summary.byProvider)
            .find(([_, stats]) => stats.successRate < 95);

        if (unreliableProvider) {
            recommendations.push({
                type: 'reliability' as const,
                severity: 'high' as const,
                message: `${unreliableProvider[0]} tem taxa de sucesso de ${unreliableProvider[1].successRate.toFixed(1)}%`,
                potentialSavings: 0,
                action: 'Configure fallback para outro provider'
            });
        }

        // Latência alta
        const slowProvider = Object.entries(summary.byProvider)
            .find(([_, stats]) => stats.avgLatency > 2000);

        if (slowProvider) {
            recommendations.push({
                type: 'performance' as const,
                severity: 'low' as const,
                message: `${slowProvider[0]} está lento (${slowProvider[1].avgLatency.toFixed(0)}ms média)`,
                potentialSavings: 0,
                action: 'Considere SiliconFlow (2.3x mais rápido)'
            });
        }

        return recommendations.sort((a, b) =>
            ['high', 'medium', 'low'].indexOf(a.severity) -
            ['high', 'medium', 'low'].indexOf(b.severity)
        );
    }

    /**
     * Exportar dados para CSV
     */
    exportToCSV(): string {
        const headers = ['timestamp', 'provider', 'task', 'tokensIn', 'tokensOut', 'cost', 'latency', 'success'];
        const rows = this.metrics.map(m => [
            m.timestamp.toISOString(),
            m.provider,
            m.task,
            m.tokensIn,
            m.tokensOut,
            m.cost.toFixed(6),
            m.latency,
            m.success
        ]);

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    /**
     * Configurar limite de orçamento
     */
    setBudgetLimit(limit: number): void {
        this.budgetLimit = limit;
        this.emit('budgetUpdate', { limit, current: this.getSummary().thisMonth.cost });
    }

    /**
     * Obter métricas raw (para debug)
     */
    getRawMetrics(): CostMetrics[] {
        return [...this.metrics];
    }

    /**
     * Limpar histórico
     */
    clearHistory(): void {
        this.metrics = [];
        this.saveToStorage();
    }

    // ============ MÉTODOS PRIVADOS ============

    private calculateProviderStats(metrics: CostMetrics[]): Record<string, ProviderStats> {
        const byProvider = new Map<string, CostMetrics[]>();

        metrics.forEach(m => {
            const list = byProvider.get(m.provider) || [];
            list.push(m);
            byProvider.set(m.provider, list);
        });

        const result: Record<string, ProviderStats> = {};

        for (const [provider, list] of byProvider) {
            const totalTokens = list.reduce((sum, m) => sum + m.tokensIn + m.tokensOut, 0);
            const totalCost = list.reduce((sum, m) => sum + m.cost, 0);

            result[provider] = {
                totalCalls: list.length,
                totalTokens,
                totalCost,
                avgLatency: list.reduce((sum, m) => sum + m.latency, 0) / list.length,
                successRate: (list.filter(m => m.success).length / list.length) * 100,
                costPer1KTokens: totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0
            };
        }

        return result;
    }

    private projectMonthlyCost(currentCost: number, currentDay: number): number {
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        return currentDay > 0 ? (currentCost / currentDay) * daysInMonth : 0;
    }

    private checkBudgetAlerts(): void {
        const summary = this.getSummary();
        const used = summary.thisMonth.budgetUsed / 100;

        for (const threshold of this.alertThresholds) {
            if (used >= threshold && used < threshold + 0.05) {
                this.emit('budgetAlert', {
                    threshold: threshold * 100,
                    used: summary.thisMonth.budgetUsed,
                    limit: this.budgetLimit,
                    currentCost: summary.thisMonth.cost
                });
            }
        }
    }

    private loadFromStorage(): void {
        if (!this.storage) return;

        try {
            const data = this.storage.getItem('codeguard_metrics');
            if (data) {
                const parsed = JSON.parse(data);
                this.metrics = (parsed.metrics || parsed).map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
                this.budgetLimit = parsed.budgetLimit || 1000;
            }
        } catch (error) {
            console.error('[CostAnalytics] Failed to load metrics:', error);
        }
    }

    private saveToStorage(): void {
        if (!this.storage) return;

        try {
            this.storage.setItem('codeguard_metrics', JSON.stringify({
                metrics: this.metrics,
                budgetLimit: this.budgetLimit
            }));
        } catch (error) {
            console.error('[CostAnalytics] Failed to save metrics:', error);
        }
    }
}

// Singleton para uso global
let _instance: CostAnalytics | null = null;

export function getCostAnalytics(storage?: Storage): CostAnalytics {
    if (!_instance) {
        _instance = new CostAnalytics(storage);
    }
    return _instance;
}

export const costAnalytics = getCostAnalytics();

export default CostAnalytics;
