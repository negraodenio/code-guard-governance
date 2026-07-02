/**
 * Compliance Orchestrator v2.0
 * Manages the deep compliance audit flow using LLM agents
 * 
 * ESTRATÉGIA DE LLM (docs/LLM_API_STRATEGY.md):
 * - Scan: Kimi K2.5 (contexto 262k, $0.15/M)
 * - Patch: GPT-4o-mini ($0.60/M output - 85% mais barato que Haiku)
 * - Embeddings: SiliconFlow (~$0.01/M - 10x mais barato que OpenAI)
 * - Explain: Kimi K2.5 (contexto longo)
 * - Fallback: OpenRouter (+5.5% markup - apenas emergência)
 */

import type * as vscodeTypes from 'vscode';
import { vscode } from '../utils/vscode-compat';
import { AIClient } from './ai_client';
import { ContextBatcher, BatchedContext, FileContext } from './batcher';
import { FrameworkConfig, getFrameworksByRegion, getLLMForFramework } from './frameworks';
import { getPromptForFramework } from './prompts';
import { LLMRouter, getLLMRouter } from '../core/llm-router';
import { getProviderForTask, estimateCost, PROVIDERS, TaskType, ROUTING_CONFIG } from '../core/llm-config';

// Cost Management System
import { costAnalytics, getCostAnalytics } from '../dashboard/cost-analytics';
import { budgetAlerts, getBudgetAlerts } from '../alerts/budget-alerts';
import { smartRouter, getSmartRouter } from '../optimization/smart-router';

// Antigravity Core (MCP)
import { RepoIntelligence } from './ril';
import { CodingMemory } from './memory';
import { PatchEngine, Violation } from './patch';

/**
 * Single compliance issue detected
 */
export interface ComplianceIssue {
    file_path: string;
    line_start: number;
    line_end: number;
    issue: string;
    article?: string;
    control?: string;
    regulation?: string;
    severity: 'Alta' | 'Média' | 'Baixa' | 'High' | 'Medium' | 'Low';
    recommendation: string;
    code_fix?: string;
}

/**
 * Result from a single framework audit
 */
export interface FrameworkAuditResult {
    framework: string;
    frameworkName: string;
    status_overall: 'pass' | 'warn' | 'fail';
    issues: ComplianceIssue[];
    summary: string;
    llm_used: string;
    execution_time_ms: number;
    risk_classification?: string;
    risk_class?: string;
    entity_type?: string;
}

/**
 * Consolidated audit result
 */
export interface ConsolidatedAuditResult {
    region: 'BR' | 'EU' | 'US' | 'GLOBAL';
    frameworks_audited: string[];
    total_issues: number;
    critical_issues: number;
    overall_status: 'pass' | 'warn' | 'fail';
    results: FrameworkAuditResult[];
    files_analyzed: number;
    total_tokens_used: number;
    execution_time_ms: number;
    timestamp: string;
    metadata?: {
        clientName?: string;
        repoUrl?: string;
        consultationDate?: string;
    };
}

/**
 * Parse LLM response to JSON
 */
function parseAuditResponse(raw: string, frameworkId: string): Partial<FrameworkAuditResult> {
    // Try to extract JSON from response
    let jsonStr = raw;

    // Handle markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    // Try direct JSON parse
    try {
        const parsed = JSON.parse(jsonStr);
        return {
            framework: parsed.framework || frameworkId,
            status_overall: parsed.status_overall || 'fail',
            issues: parsed.issues || [],
            summary: parsed.summary || 'No summary provided',
            risk_classification: parsed.risk_classification,
            risk_class: parsed.risk_class,
            entity_type: parsed.entity_type
        };
    } catch (e) {
        console.error('Failed to parse LLM response as JSON:', e);
        return {
            framework: frameworkId,
            status_overall: 'fail',
            issues: [{
                file_path: 'N/A',
                line_start: 0,
                line_end: 0,
                issue: 'Failed to parse LLM response',
                severity: 'Low',
                recommendation: 'Re-run the audit'
            }],
            summary: `Raw response: ${raw.substring(0, 500)}...`
        };
    }
}

/**
 * Normalize severity to consistent format
 */
function normalizeSeverity(severity: string): 'High' | 'Medium' | 'Low' {
    const s = severity.toLowerCase();
    if (s === 'alta' || s === 'high' || s === 'critical') return 'High';
    if (s === 'média' || s === 'medium') return 'Medium';
    return 'Low';
}

export class ComplianceOrchestrator {
    private batcher: ContextBatcher;
    private router: LLMRouter;

    // Antigravity Core
    private ril: RepoIntelligence;
    private memory: CodingMemory;
    private patcher: PatchEngine;

    private usageStats: {
        scans: number;
        tokensUsed: number;
        estimatedCost: number;
        providers: Record<string, number>;
    };

    constructor() {
        this.batcher = new ContextBatcher(80000); // 80k tokens per batch
        this.router = getLLMRouter();

        // Initialize Antigravity Core
        this.memory = new CodingMemory();
        this.ril = new RepoIntelligence({ memory: this.memory });
        this.patcher = new PatchEngine();

        this.usageStats = {
            scans: 0,
            tokensUsed: 0,
            estimatedCost: 0,
            providers: {}
        };

        // Initialize cost management system
        this.setupCostManagement();
        console.error('[Orchestrator] Stack Antigravity v2.0 inicializado (RIL + Memory + Patch)');
    }

    /**
     * Configure cost management system with alerts and monitoring
     */
    private setupCostManagement(): void {
        // Set budget limit from config
        const monthlyLimit = ROUTING_CONFIG.costLimits.maxMonthly || 1000;
        budgetAlerts.setLimit(monthlyLimit);

        // Listen for budget alerts
        budgetAlerts.on('alert', (alert) => {
            console.error(`🚨 [BUDGET ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
            console.error(`   Spend: $${alert.currentSpend.toFixed(2)} / $${alert.limit} (${alert.percentage.toFixed(1)}%)`);
        });

        // Listen for circuit breaker events
        smartRouter.on('circuitOpen', ({ provider, resetAt }) => {
            console.warn(`⚠️ [SmartRouter] Circuit OPENED for ${provider}, reset at ${resetAt}`);
        });

        smartRouter.on('circuitClose', ({ provider }) => {
            console.error(`✅ [SmartRouter] Circuit CLOSED for ${provider}`);
        });

        // Listen for routing decisions
        smartRouter.on('route', (decision) => {
            console.error(`[SmartRouter] Routed to ${decision.provider} (${decision.reason})`);
        });

        console.error(`[CostManagement] Configurado: limite $${monthlyLimit}/mês`);
    }

    /**
     * Run a full compliance audit on the workspace
     */
    async runAudit(
        region: 'BR' | 'EU' | 'US',
        selectedFrameworks?: string[],
        progress?: any, // Use any to avoid runtime dependency on types
        metadata?: { clientName?: string; repoUrl?: string },
        targetDir?: string
    ): Promise<ConsolidatedAuditResult> {
        const startTime = Date.now();
        const results: FrameworkAuditResult[] = [];

        // 1. Get frameworks for region
        const allFrameworks = getFrameworksByRegion(region);
        const frameworks = selectedFrameworks
            ? allFrameworks.filter(f => selectedFrameworks.includes(f.id))
            : allFrameworks;

        if (frameworks.length === 0) {
            throw new Error('No frameworks selected for audit');
        }

        progress?.report({ message: 'Collecting workspace files...' });

        // 2. Collect and batch files
        const files = await this.batcher.collectWorkspaceFiles(targetDir);
        if (files.length === 0) {
            throw new Error('No supported files found in workspace');
        }

        const batches = this.batcher.batchFiles(files);
        // console.debug(this.batcher.getStats(files, batches));

        // --- ANTIGRAVITY PHASE 1: INTELLIGENCE ---
        progress?.report({ message: '🧠 Antigravity: Indexing repository & Graph...' });
        const rootPath = targetDir || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (rootPath) {
            const repoContext = await this.ril.indexRepository(rootPath);

            // Memory uses batcher files (already in memory) to avoid re-reading
            // This initializes embeddings via SiliconFlow
            await this.memory.initialize({ files });

            // Build dependency graph and identify sensitive files
            await this.ril.buildDependencyGraph(repoContext);
            await this.ril.identifySensitiveFiles(repoContext);

            console.error('[Orchestrator] Antigravity Intelligence ready.');
        }

        let totalTokensUsed = 0;
        let totalEstimatedCost = 0;
        const incrementPerFramework = 100 / frameworks.length;

        // NOVO: Selecionar provider otimizado para scan
        const scanRouting = this.router.route('scan');
        console.error(`[Orchestrator] Scan Provider: ${scanRouting.provider} (${scanRouting.reason})`);
        console.error(`[Orchestrator] Custo estimado por batch: $${scanRouting.estimatedCost.toFixed(4)}`);

        // 3. Run each framework audit
        for (const framework of frameworks) {
            const frameworkStartTime = Date.now();
            progress?.report({
                message: `Auditing ${framework.name} via ${scanRouting.provider}...`,
                increment: incrementPerFramework / 2
            });

            try {
                const frameworkResult = await this.auditFramework(framework, batches, scanRouting.provider);
                frameworkResult.execution_time_ms = Date.now() - frameworkStartTime;
                results.push(frameworkResult);

                // Calcular tokens e custo real
                const batchTokens = batches.reduce((sum, b) => sum + b.totalTokens, 0);
                const outputTokens = frameworkResult.issues.length * 200;
                totalTokensUsed += batchTokens;

                // Registrar uso no router para tracking
                this.router.trackUsage(scanRouting.provider, batchTokens, outputTokens);
                const actualCost = scanRouting.estimatedCost * batches.length;
                totalEstimatedCost += actualCost;

                // 🆕 Registrar métricas no CostAnalytics
                costAnalytics.record({
                    provider: scanRouting.provider,
                    task: 'scan',
                    tokensIn: batchTokens,
                    tokensOut: outputTokens,
                    cost: actualCost,
                    latency: frameworkResult.execution_time_ms,
                    success: frameworkResult.status_overall !== 'fail'
                });

            } catch (error) {
                console.error(`Error auditing ${framework.id}:`, error);

                // 🆕 Registrar falha no CostAnalytics
                costAnalytics.record({
                    provider: scanRouting.provider,
                    task: 'scan',
                    tokensIn: 0,
                    tokensOut: 0,
                    cost: 0,
                    latency: Date.now() - frameworkStartTime,
                    success: false
                });

                results.push({
                    framework: framework.id,
                    frameworkName: framework.name,
                    status_overall: 'fail',
                    issues: [{
                        file_path: 'N/A',
                        line_start: 0,
                        line_end: 0,
                        issue: `Audit failed: ${(error as Error).message}`,
                        severity: 'High',
                        recommendation: 'Check API configuration and try again'
                    }],
                    summary: `Audit failed: ${(error as Error).message}`,
                    llm_used: framework.llm,
                    execution_time_ms: Date.now() - frameworkStartTime
                });
            }

            progress?.report({ increment: incrementPerFramework / 2 });
        }

        // --- ANTIGRAVITY PHASE 3: AUTO-FIX ---
        progress?.report({ message: '🔧 Antigravity: Generating patches for critical issues...' });

        for (const res of results) {
            for (const issue of res.issues) {
                // Generate patch for High severity issues if no fix exists
                if (normalizeSeverity(issue.severity) === 'High' && !issue.code_fix) {
                    const violation: Violation = {
                        id: Math.random().toString(36).substring(7),
                        ruleId: issue.control || issue.regulation || 'unknown',
                        filePath: issue.file_path,
                        line: issue.line_start,
                        message: issue.issue,
                        severity: 'high',
                        fixable: true,
                        source: 'ai'
                    };

                    try {
                        // Use OpenAI (GPT-4o-mini) for patches as per strategy
                        const patch = await this.patcher.generatePatch(violation);
                        if (patch) {
                            issue.code_fix = patch.fixedCode;
                            console.error(`[PatchEngine] Generated fix for ${issue.file_path} (Rule: ${violation.ruleId})`);
                        }
                    } catch (err) {
                        console.warn(`[PatchEngine] Failed to generate patch:`, err);
                    }
                }
            }
        }

        // 🆕 Atualizar alertas de orçamento após audit completo
        const currentMonthlySpend = costAnalytics.getSummary().thisMonth.cost;
        budgetAlerts.updateSpend(currentMonthlySpend);
        console.error(`[Orchestrator] Audit completo. Custo total: $${totalEstimatedCost.toFixed(4)}, Mensal: $${currentMonthlySpend.toFixed(2)}`);

        // 4. Consolidate results
        const allIssues = results.flatMap(r => r.issues);
        const criticalIssues = allIssues.filter(i =>
            normalizeSeverity(i.severity as string) === 'High'
        ).length;

        const overallStatus: 'pass' | 'warn' | 'fail' =
            results.some(r => r.status_overall === 'fail') ? 'fail' :
                results.some(r => r.status_overall === 'warn') ? 'warn' : 'pass';

        return {
            region,
            frameworks_audited: frameworks.map(f => f.id),
            total_issues: allIssues.length,
            critical_issues: criticalIssues,
            overall_status: overallStatus,
            results,
            files_analyzed: files.length,
            total_tokens_used: totalTokensUsed,
            execution_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            metadata: {
                ...metadata,
                consultationDate: new Date().toLocaleDateString()
            }
        };
    }

    /**
     * Audit a single framework across all batches
     * @param provider - Provider otimizado selecionado pelo LLMRouter
     */
    private async auditFramework(
        framework: FrameworkConfig,
        batches: BatchedContext[],
        provider?: string
    ): Promise<FrameworkAuditResult> {
        const prompt = getPromptForFramework(framework.id);
        const allIssues: ComplianceIssue[] = [];
        let worstStatus: 'pass' | 'warn' | 'fail' = 'pass';
        const summaries: string[] = [];

        // Determinar modelo baseado no provider selecionado
        const modelToUse = provider ? this.getModelForProvider(provider, 'scan') : framework.llm;
        console.error(`[auditFramework] ${framework.name} usando modelo: ${modelToUse}`);

        // Process each batch
        for (const batch of batches) {
            const codeContent = this.batcher.formatBatchForPrompt(batch);

            // --- ANTIGRAVITY PHASE 2: RAG CONTEXT ---
            // Construct query based on framework compliance rules and file names
            const query = `compliance rules for ${framework.name} regarding: ${batch.files.map(f => f.relativePath).join(', ')}`;
            let contextMsg = '';

            try {
                const ragResult = await this.memory.query({ query, maxResults: 3 });
                if (ragResult.contextString) {
                    contextMsg = `\n\nCONTEXTO RELEVANTE (RAG Knowledge Base):\n${ragResult.contextString}\n`;
                    console.error(`[RAG] Enriched ${batch.files.length} files with ${ragResult.chunks.length} chunks`);
                }
            } catch (err) {
                console.warn('[RAG] Failed to query memory:', err);
            }

            const userPrompt = prompt.userPromptTemplate.replace('{CODE_CONTENT}', codeContent) + contextMsg;

            const response = await AIClient.complete(userPrompt, {
                modelOverride: modelToUse,
                systemPrompt: prompt.systemPrompt,
                maxTokens: 4000
            });

            if (response) {
                const parsed = parseAuditResponse(response, framework.id);

                if (parsed.issues) {
                    allIssues.push(...parsed.issues);
                }

                if (parsed.status_overall === 'fail') {
                    worstStatus = 'fail';
                } else if (parsed.status_overall === 'warn' && worstStatus !== 'fail') {
                    worstStatus = 'warn';
                }

                if (parsed.summary) {
                    summaries.push(parsed.summary);
                }
            }
        }

        return {
            framework: framework.id,
            frameworkName: framework.name,
            status_overall: worstStatus,
            issues: allIssues,
            summary: summaries.join('\n\n') || 'Audit completed.',
            llm_used: framework.llm,
            execution_time_ms: 0 // Will be set by caller
        };
    }

    /**
     * Get quick stats without running full audit
     */
    async getWorkspaceStats(): Promise<{ files: number; tokens: number; batches: number }> {
        const files = await this.batcher.collectWorkspaceFiles();
        const batches = this.batcher.batchFiles(files);
        const tokens = files.reduce((sum, f) => sum + f.tokenEstimate, 0);

        return {
            files: files.length,
            tokens,
            batches: batches.length
        };
    }

    /**
     * Retorna estatísticas combinadas de uso e custo (LLMRouter + CostAnalytics)
     */
    getUsageStats(): {
        monthlySpend: number;
        byProvider: Record<string, { calls: number; tokens: number; cost: number }>;
        savings: number;
        forecast: { projectedSpend: number; daysUntilLimit: number | null };
        recommendations: Array<{ type: string; severity: string; message: string }>;
    } {
        // Dados do LLMRouter
        const routerStats = this.router.getStats();

        // Dados do CostAnalytics (mais detalhados)
        const analyticsSummary = costAnalytics.getSummary();
        const recommendations = costAnalytics.getRecommendations();

        // Dados de forecast do BudgetAlerts
        const forecast = budgetAlerts.getForecast();

        // Usar CostAnalytics como fonte principal (mais preciso)
        const totalCost = analyticsSummary.thisMonth.cost;

        return {
            monthlySpend: totalCost,
            byProvider: analyticsSummary.byProvider as any,
            savings: analyticsSummary.savings.vsOpenAI - analyticsSummary.savings.actual,
            forecast: {
                projectedSpend: forecast.projectedSpend,
                daysUntilLimit: forecast.daysUntilLimit
            },
            recommendations: recommendations.map(r => ({
                type: r.type,
                severity: r.severity,
                message: r.message
            }))
        };
    }

    /**
     * Verifica limite mensal de custo
     */
    checkCostLimit(): { exceeded: boolean; percentage: number; warning?: string } {
        return this.router.checkMonthlyLimit();
    }

    /**
     * Mapeia provider para modelo específico por task
     */
    private getModelForProvider(provider: string, task: TaskType): string {
        const providerConfig = PROVIDERS[provider];
        if (!providerConfig) {
            console.warn(`[getModelForProvider] Provider ${provider} não encontrado, usando fallback`);
            return 'gpt-4o-mini';
        }
        return providerConfig.models[task];
    }
}
