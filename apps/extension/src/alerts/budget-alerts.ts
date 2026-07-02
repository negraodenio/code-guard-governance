/**
 * Sistema de Alertas de Orçamento
 * Notificações proativas quando atingir thresholds de gasto
 * 
 * FEATURES:
 * - Alertas em 50%, 80%, 95% do orçamento
 * - Detecção de spikes (2x acima da média)
 * - Previsão de overage
 * - Notificações: Console, Slack, Webhook, Email
 * - Cooldown para evitar spam
 */

import { EventEmitter } from 'events';

interface AlertConfig {
    monthlyLimit: number;
    thresholds: number[]; // [0.5, 0.8, 0.95] = 50%, 80%, 95%
    channels: {
        email?: boolean;
        slack?: string; // webhook URL
        webhook?: string;
        console?: boolean;
    };
    cooldownHours: number; // Evitar spam de alertas
}

interface Alert {
    id: string;
    type: 'budget' | 'spike' | 'anomaly';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    currentSpend: number;
    limit: number;
    percentage: number;
    timestamp: Date;
    acknowledged: boolean;
}

export class BudgetAlerts extends EventEmitter {
    private config: AlertConfig;
    private alerts: Alert[] = [];
    private lastAlertTime: Map<string, Date> = new Map();
    private spendHistory: Array<{ date: string; amount: number }> = [];
    private monitoringInterval?: NodeJS.Timeout;

    constructor(config: Partial<AlertConfig> = {}) {
        super();

        this.config = {
            monthlyLimit: 1000,
            thresholds: [0.5, 0.8, 0.95],
            channels: { console: true, email: true },
            cooldownHours: 24,
            ...config
        };

        this.startMonitoring();
    }

    /**
     * Atualizar gasto atual e verificar alertas
     */
    updateSpend(currentSpend: number): void {
        const today = new Date().toISOString().split('T')[0];

        // Atualizar ou adicionar entry do dia
        const todayEntry = this.spendHistory.find(h => h.date === today);
        if (todayEntry) {
            todayEntry.amount = currentSpend;
        } else {
            this.spendHistory.push({ date: today, amount: currentSpend });
        }

        // Manter apenas últimos 30 dias
        this.spendHistory = this.spendHistory.slice(-30);

        const percentage = currentSpend / this.config.monthlyLimit;

        // Verificar thresholds
        for (const threshold of this.config.thresholds) {
            if (percentage >= threshold) {
                this.triggerAlert('budget', this.getSeverity(threshold), currentSpend, percentage);
            }
        }

        // Detectar spike (gasto 2x maior que média dos últimos 7 dias)
        this.detectSpike(currentSpend);

        // Detectar anomalia (previsão extrapola orçamento)
        this.detectAnomaly(currentSpend);
    }

    /**
     * Configurar novo limite
     */
    setLimit(newLimit: number): void {
        const oldLimit = this.config.monthlyLimit;
        this.config.monthlyLimit = newLimit;

        this.emit('limitChanged', { old: oldLimit, new: newLimit });

        // Reavaliar alertas
        const currentSpend = this.getCurrentSpend();
        this.updateSpend(currentSpend);
    }

    /**
     * Adicionar canal de notificação
     */
    addChannel(type: 'slack' | 'webhook' | 'email', config: string | boolean): void {
        (this.config.channels as any)[type] = config;
    }

    /**
     * Listar alertas ativos
     */
    getActiveAlerts(): Alert[] {
        return this.alerts.filter(a => !a.acknowledged);
    }

    /**
     * Listar todos os alertas
     */
    getAllAlerts(): Alert[] {
        return [...this.alerts];
    }

    /**
     * Reconhecer alerta
     */
    acknowledge(alertId: string): void {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            this.emit('acknowledged', alert);
        }
    }

    /**
     * Previsão de gasto até final do mês
     */
    getForecast(): {
        projectedSpend: number;
        projectedOverage: number;
        daysUntilLimit: number | null;
        confidence: 'low' | 'medium' | 'high';
    } {
        const currentSpend = this.getCurrentSpend();
        const dayOfMonth = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

        // Projeção linear simples
        const dailyAverage = dayOfMonth > 0 ? currentSpend / dayOfMonth : 0;
        const projectedSpend = dailyAverage * daysInMonth;

        // Ajustar baseado em tendência (se temos histórico)
        const trend = this.calculateTrend();
        const adjustedProjection = projectedSpend * trend;

        const projectedOverage = Math.max(0, adjustedProjection - this.config.monthlyLimit);

        // Dias até atingir limite
        const remainingBudget = this.config.monthlyLimit - currentSpend;
        const daysUntilLimit = dailyAverage > 0 ?
            Math.floor(remainingBudget / dailyAverage) : null;

        // Confiança baseada em quantidade de dados
        const confidence = dayOfMonth < 5 ? 'low' :
            dayOfMonth < 15 ? 'medium' : 'high';

        return {
            projectedSpend: adjustedProjection,
            projectedOverage,
            daysUntilLimit,
            confidence
        };
    }

    /**
     * Parar monitoramento
     */
    stop(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
    }

    // ============ MÉTODOS PRIVADOS ============

    private startMonitoring(): void {
        // Verificar a cada hora
        this.monitoringInterval = setInterval(() => {
            const current = this.getCurrentSpend();
            this.updateSpend(current);
        }, 60 * 60 * 1000);
    }

    private triggerAlert(
        type: 'budget' | 'spike' | 'anomaly',
        severity: 'info' | 'warning' | 'critical',
        currentSpend: number,
        percentage: number
    ): void {
        const alertKey = `${type}-${severity}`;
        const lastAlert = this.lastAlertTime.get(alertKey);
        const now = new Date();

        // Verificar cooldown
        if (lastAlert) {
            const hoursSince = (now.getTime() - lastAlert.getTime()) / (1000 * 60 * 60);
            if (hoursSince < this.config.cooldownHours) {
                return; // Ainda em cooldown
            }
        }

        const alert: Alert = {
            id: this.generateId(),
            type,
            severity,
            message: this.generateMessage(type, severity, currentSpend, percentage),
            currentSpend,
            limit: this.config.monthlyLimit,
            percentage: percentage * 100,
            timestamp: now,
            acknowledged: false
        };

        this.alerts.push(alert);
        this.lastAlertTime.set(alertKey, now);

        // Manter apenas últimos 100 alertas
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }

        // Enviar notificações
        this.sendNotifications(alert);

        this.emit('alert', alert);
    }

    private sendNotifications(alert: Alert): void {
        if (this.config.channels.console) {
            const emoji = alert.severity === 'critical' ? '🚨' :
                alert.severity === 'warning' ? '⚠️' : 'ℹ️';
            console.error(`${emoji} [CodeGuard Alert] ${alert.message}`);
            console.error(`   Current: $${alert.currentSpend.toFixed(2)} / $${alert.limit} (${alert.percentage.toFixed(1)}%)`);
        }

        // Slack
        if (this.config.channels.slack) {
            this.sendSlack(alert);
        }

        // Webhook
        if (this.config.channels.webhook) {
            this.sendWebhook(alert);
        }

        // Email (log for now - integrate with SendGrid/AWS SES)
        if (this.config.channels.email) {
            console.error(`[Email] Would send to admin: ${alert.message}`);
        }
    }

    private async sendSlack(alert: Alert): Promise<void> {
        const webhook = this.config.channels.slack;
        if (!webhook || typeof webhook !== 'string') return;

        const color = alert.severity === 'critical' ? 'danger' :
            alert.severity === 'warning' ? 'warning' : 'good';

        const payload = {
            attachments: [{
                color,
                title: `CodeGuard Budget Alert: ${alert.type.toUpperCase()}`,
                text: alert.message,
                fields: [
                    { title: 'Current Spend', value: `$${alert.currentSpend.toFixed(2)}`, short: true },
                    { title: 'Budget Limit', value: `$${alert.limit}`, short: true },
                    { title: 'Percentage', value: `${alert.percentage.toFixed(1)}%`, short: true }
                ],
                footer: 'CodeGuard Cost Management',
                ts: Math.floor(alert.timestamp.getTime() / 1000)
            }]
        };

        try {
            await fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('[BudgetAlerts] Failed to send Slack alert:', error);
        }
    }

    private async sendWebhook(alert: Alert): Promise<void> {
        const url = this.config.channels.webhook;
        if (!url) return;

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alert)
            });
        } catch (error) {
            console.error('[BudgetAlerts] Failed to send webhook:', error);
        }
    }

    private detectSpike(currentSpend: number): void {
        const last7Days = this.spendHistory.slice(-7);
        if (last7Days.length < 3) return;

        const avg = last7Days.reduce((sum, d) => sum + d.amount, 0) / last7Days.length;

        if (currentSpend > avg * 2) {
            this.triggerAlert('spike', 'warning', currentSpend, currentSpend / this.config.monthlyLimit);
        }
    }

    private detectAnomaly(currentSpend: number): void {
        const forecast = this.getForecast();

        if (forecast.projectedOverage > 0 && forecast.confidence !== 'low') {
            this.triggerAlert(
                'anomaly',
                'critical',
                currentSpend,
                forecast.projectedSpend / this.config.monthlyLimit
            );
        }
    }

    private getSeverity(threshold: number): 'info' | 'warning' | 'critical' {
        if (threshold >= 0.95) return 'critical';
        if (threshold >= 0.8) return 'warning';
        return 'info';
    }

    private generateMessage(
        type: string,
        severity: string,
        spend: number,
        percentage: number
    ): string {
        const messages: Record<string, Record<string, string>> = {
            budget: {
                info: `Budget 50% utilized ($${spend.toFixed(2)})`,
                warning: `Budget 80% utilized ($${spend.toFixed(2)}) - Consider optimizing`,
                critical: `Budget 95% utilized ($${spend.toFixed(2)}) - Immediate action required`
            },
            spike: {
                warning: `Spending spike detected: 2x above average`,
                critical: `Spending spike detected: 2x above average`
            },
            anomaly: {
                critical: `Projected overage of $${Math.max(0, spend - this.config.monthlyLimit).toFixed(2)} by month end`,
                warning: `Projected overage of $${Math.max(0, spend - this.config.monthlyLimit).toFixed(2)} by month end`
            }
        };

        return messages[type]?.[severity] || `Alert: ${type} - ${severity}`;
    }

    private getCurrentSpend(): number {
        return this.spendHistory[this.spendHistory.length - 1]?.amount || 0;
    }

    private calculateTrend(): number {
        if (this.spendHistory.length < 7) return 1;

        const firstWeek = this.spendHistory.slice(0, 7).reduce((s, d) => s + d.amount, 0) / 7;
        const lastWeek = this.spendHistory.slice(-7).reduce((s, d) => s + d.amount, 0) / 7;

        if (firstWeek === 0) return 1;
        return lastWeek / firstWeek;
    }

    private generateId(): string {
        return `alert_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    }
}

// Singleton
let _instance: BudgetAlerts | null = null;

export function getBudgetAlerts(config?: Partial<AlertConfig>): BudgetAlerts {
    if (!_instance) {
        _instance = new BudgetAlerts(config);
    }
    return _instance;
}

export const budgetAlerts = getBudgetAlerts();

export default BudgetAlerts;
