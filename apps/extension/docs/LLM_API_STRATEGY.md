# CodeGuard AI - Estratégia de LLM APIs

> **Documento de Referência Definitivo**  
> Versão: 2.0  
> Data: Janeiro 2026  
> Status: APROVADO

## 📋 Resumo Executivo

Este documento define a estratégia oficial de uso de APIs de LLM para o CodeGuard AI. **Sempre consulte este documento antes de fazer alterações na configuração de LLM.**

### Decisões Críticas

| Task | Provider Primário | Custo | Justificativa |
|------|-------------------|-------|---------------|
| **Scan** | Kimi K2.5 | $0.15/M in | Contexto 262k, ideal para arquivos grandes |
| **Patch** | GPT-4o-mini | $0.15/$0.60 | 85% mais barato que Claude Haiku |
| **Embeddings** | SiliconFlow | ~$0.01/M | 10x mais barato que OpenAI |
| **Explain** | Kimi K2.5 | $0.15/M in | Contexto longo para projetos inteiros |
| **Fallback** | OpenRouter | +5.5% markup | Apenas quando APIs diretas falharem |

---

## 💰 Análise de Custo Detalhada

### Comparativo de Preços (Jan 2026)

| Provider | Modelo | Input/1M | Output/1M | Contexto | Latência |
|----------|--------|----------|-----------|----------|----------|
| **Kimi** | K2.5 | $0.15 | $2.50 | **262k** | ~1s |
| **OpenAI** | GPT-4o-mini | $0.15 | $0.60 | 128k | ~1s |
| **SiliconFlow** | DeepSeek/BGE | ~$0.01 | ~$0.02 | 128k | ~0.5s |
| ~~Anthropic~~ | ~~Claude Haiku~~ | ~~$0.80~~ | ~~$4.00~~ | ~~200k~~ | ~~1.2s~~ |
| OpenRouter | Gateway | +5.5% | +5.5% | Varia | +100ms |

> **⚠️ IMPORTANTE:** Claude Haiku foi **removido** da estratégia por custo proibitivo ($4.00/M output vs $0.60 do GPT-4o-mini).

### Projeção de Custos Mensais (1M scans)

```
CENÁRIO: 1 milhão de scans/mês

OPERAÇÃO         TOKENS              PROVIDER        CUSTO
─────────────────────────────────────────────────────────
Scan (1M)        2M in/0.5M out      Kimi           $1,550
Patch (500k)     750K in/400K out    GPT-4o         $352
Embeddings (10M) 10M tokens          SiliconFlow    $100
Explain (200k)   600K in/300K out    Kimi           $840
─────────────────────────────────────────────────────────
TOTAL MENSAL:                                       $2,842

vs Configuração Anterior (com Haiku):               $7,650
ECONOMIA:                                           63% (-$4,808)
```

### Cenário Conservador (100k scans/mês)

```
Scan:       $155
Patch:      $35
Embeddings: $10
Explain:    $84
─────────────
TOTAL:      $284/mês
```

---

## 🏗️ Arquitetura de Roteamento

```
                    ┌──────────────────┐
                    │   LLM Router     │
                    │   (llm-router.ts)│
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
     ┌─────────┐       ┌───────────┐      ┌───────────┐
     │  SCAN   │       │   PATCH   │      │ EMBEDDINGS│
     │  Kimi   │       │  GPT-4o   │      │SiliconFlow│
     │   K2.5  │       │   mini    │      │    BGE    │
     └────┬────┘       └─────┬─────┘      └─────┬─────┘
          │                  │                  │
          │    FALLBACK      │    FALLBACK      │    FALLBACK
          ▼                  ▼                  ▼
     ┌─────────┐       ┌───────────┐      ┌───────────┐
     │ OpenAI  │       │   Kimi    │      │  OpenAI   │
     │GPT-4o-m │       │   K2.5    │      │ Embedding │
     └────┬────┘       └─────┬─────┘      └─────┬─────┘
          │                  │                  │
          ▼                  ▼                  ▼
     ┌─────────────────────────────────────────────┐
     │            OpenRouter (Gateway)             │
     │              (+5.5% markup)                 │
     │         ÚLTIMO RECURSO APENAS               │
     └─────────────────────────────────────────────┘
```

---

## 🔧 Configuração de Ambiente

### Variáveis Obrigatórias

```bash
# .env ou Supabase Secrets

# Primário: Kimi (Moonshot AI)
KIMI_API_KEY=sk-xxx-xxx-xxx

# Patch: OpenAI
OPENAI_API_KEY=sk-xxx

# Embeddings: SiliconFlow
SILICONFLOW_API_KEY=sf-xxx

# Fallback: OpenRouter (opcional)
OPENROUTER_API_KEY=sk-or-v1-xxx
```

### Onde Obter as Keys

| Provider | URL | Preço Mínimo |
|----------|-----|--------------|
| Kimi | https://platform.moonshot.cn | Pay-as-you-go |
| OpenAI | https://platform.openai.com | $5 mínimo |
| SiliconFlow | https://cloud.siliconflow.cn | Free tier disponível |
| OpenRouter | https://openrouter.ai | Pay-as-you-go |

---

## 📊 Métricas e Limites

### Limites de Custo (Alertas)

```typescript
costLimits: {
  maxPerScan: 0.01,      // $0.01 máximo por scan
  maxPerPatch: 0.05,     // $0.05 máximo por patch
  maxPerEmbed: 0.001,    // $0.001 máximo por embedding
  maxPerExplain: 0.02,   // $0.02 máximo por explicação
  maxMonthly: 1000,      // $1000/mês (trigger alerta)
}
```

### Monitoramento

O sistema rastreia automaticamente:
- Custo por operação
- Custo mensal acumulado
- Taxa de fallback
- Latência por provider

```typescript
const stats = getLLMRouter().getStats();
console.log(stats.monthlySpend);  // $284.50
console.log(stats.byProvider);    // { kimi: 80%, openai: 18%, siliconflow: 2% }
```

---

## 🚨 Regras Imutáveis

> **NUNCA VIOLE ESTAS REGRAS:**

1. ❌ **NÃO USE Claude Haiku para patches** - $4.00/M output é 6.7x mais caro que GPT-4o-mini
2. ❌ **NÃO USE OpenAI para embeddings em produção** - $0.10/M vs $0.01/M do SiliconFlow
3. ❌ **NÃO USE OpenRouter como primário** - 5.5% markup desnecessário
4. ✅ **SEMPRE use Kimi para contextos > 128k** - único com 262k tokens
5. ✅ **SEMPRE verifique limites de custo** antes de chamadas

---

## 📁 Arquivos de Implementação

| Arquivo | Descrição |
|---------|-----------|
| `src/core/llm-config.ts` | Configuração de providers e routing |
| `src/core/llm-router.ts` | Roteador inteligente com fallback |
| `docs/LLM_API_STRATEGY.md` | Este documento |

---

## 🔄 Histórico de Decisões

| Data | Decisão | Razão |
|------|---------|-------|
| Jan 2026 | Remover Claude Haiku | 85% mais caro que alternativas |
| Jan 2026 | Adicionar SiliconFlow | 10x mais barato para embeddings |
| Jan 2026 | Kimi como primário | Contexto 262k, preço competitivo |
| Jan 2026 | OpenRouter só fallback | 5.5% markup desnecessário |

---

## 🔄 Integração com Orchestrator

O `ComplianceOrchestrator` usa o `LLMRouter` automaticamente:

```typescript
// src/intelligence/orchestrator.ts

import { LLMRouter, getLLMRouter } from '../core/llm-router';

export class ComplianceOrchestrator {
    private router: LLMRouter;
    
    constructor() {
        this.router = getLLMRouter();
    }
    
    async runAudit(region: 'BR' | 'EU') {
        // Seleciona provider automaticamente
        const routing = this.router.route('scan');
        console.log(`Provider: ${routing.provider}`); // "kimi"
        console.log(`Custo: $${routing.estimatedCost}`);
        
        // Tracking de uso
        this.router.trackUsage(routing.provider, tokensIn, tokensOut);
    }
    
    // Estatísticas de custo
    getUsageStats() {
        return this.router.getStats();
        // { monthlySpend: 284.50, byProvider: {...} }
    }
}
```

### Logs de Execução

```
[Orchestrator] LLMRouter inicializado com estratégia de custo otimizada
[Orchestrator] Scan Provider: kimi (Kimi K2.5: Contexto 262k, $0.15/M input)
[Orchestrator] Custo estimado por batch: $0.0003
[auditFramework] LGPD usando modelo: kimi-k2-5

[Usage Stats] {
  kimi: { tokens: 15000, cost: 0.45 },
  openai: { tokens: 8000, cost: 0.12 },
  siliconflow: { tokens: 50000, cost: 0.05 }
}
Total: $0.62
Savings vs OpenAI-only: $1.55 (71%)
```

---

## 💰 Sistema de Gestão de Custos

O CodeGuard AI inclui um sistema completo de gestão de custos em 3 camadas:

### 1. CostAnalytics (`src/dashboard/cost-analytics.ts`)

Dashboard em tempo real com métricas por provider:

```typescript
import { costAnalytics } from './dashboard/cost-analytics';

// Registrar métrica após chamada LLM
costAnalytics.record({
    provider: 'kimi',
    task: 'scan',
    tokensIn: 2000,
    tokensOut: 500,
    cost: 0.0003,
    latency: 1200,
    success: true
});

// Obter resumo
const summary = costAnalytics.getSummary();
// summary.savings.percentage = 71% (vs OpenAI)
// summary.thisMonth.projected = $284.50

// Exportar para análise
const csv = costAnalytics.exportToCSV();
```

### 2. BudgetAlerts (`src/alerts/budget-alerts.ts`)

Alertas proativos com múltiplos canais:

```typescript
import { budgetAlerts } from './alerts/budget-alerts';

// Configurar limite
budgetAlerts.setLimit(500); // $500/mês

// Adicionar Slack
budgetAlerts.addChannel('slack', 'https://hooks.slack.com/xxx');

// Ouvir alertas
budgetAlerts.on('alert', (alert) => {
    // alert.severity = 'critical' | 'warning' | 'info'
    // alert.percentage = 80% (do orçamento)
    console.log(`🚨 ${alert.message}`);
});

// Previsão
const forecast = budgetAlerts.getForecast();
// forecast.daysUntilLimit = 15
// forecast.projectedOverage = $50
```

### 3. SmartRouter (`src/optimization/smart-router.ts`)

Failover automático com circuit breaker:

```typescript
import { smartRouter } from './optimization/smart-router';

// Rota com prioridade
const routing = await smartRouter.route('scan', 50000, 'cost');
// routing.provider = 'kimi'
// routing.fallbackChain = ['openai', 'openrouter']

// Executar com failover automático
const result = await smartRouter.executeWithFailover(
    'scan',
    async (provider) => {
        return await callLLM(provider, prompt);
    }
);
// Automaticamente tenta fallbacks se provider falhar

// Estatísticas
const stats = smartRouter.getStats();
// stats.avgSuccessRate = 99.9%
// stats.circuitBreakers = [] (nenhum aberto)
```

### Integração no Orchestrator

```typescript
// orchestrator.ts
import { costAnalytics } from './dashboard/cost-analytics';
import { budgetAlerts } from './alerts/budget-alerts';
import { smartRouter } from './optimization/smart-router';

async scan(request: ScanRequest) {
    // 1. Rota inteligente
    const routing = await smartRouter.route('scan', contextSize, 'cost');
    
    // 2. Executar com failover
    const result = await smartRouter.executeWithFailover('scan', 
        (provider) => this.performScan(request, provider)
    );
    
    // 3. Registrar métricas
    costAnalytics.record({
        provider: routing.provider,
        task: 'scan',
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        cost: routing.estimatedCost,
        latency: Date.now() - startTime,
        success: true
    });
    
    // 4. Atualizar alertas
    budgetAlerts.updateSpend(costAnalytics.getSummary().thisMonth.cost);
}
```

---

## ✅ Checklist de Implementação

- [x] Criar `llm-config.ts` com preços atualizados
- [x] Criar `llm-router.ts` com roteamento inteligente
- [x] Documentar estratégia (este arquivo)
- [x] Integrar com `ComplianceOrchestrator`
- [x] Criar `cost-analytics.ts` (Dashboard)
- [x] Criar `budget-alerts.ts` (Alertas)
- [x] Criar `smart-router.ts` (Failover)
- [ ] Configurar variáveis no Supabase
- [ ] Testar roteamento em staging
- [ ] Monitorar custos primeira semana

---

**Autor:** CodeGuard AI Team  
**Aprovador:** Denio  
**Próxima Revisão:** Abril 2026 (ou quando preços mudarem significativamente)
