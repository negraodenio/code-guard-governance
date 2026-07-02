# CodeGuard AI - Architecture Overview v2.0

## 🎯 Vision

CodeGuard AI é um sistema de compliance automatizado de classe enterprise que combina **análise estática local** com **agentes de IA otimizados para custo** para auditoria profunda de conformidade.

---

## 🏗️ Arquitetura Antigravity

```
                          ┌─────────────────────────────────────┐
                          │       Antigravity Orchestrator      │
                          │         (Core Intelligence)         │
                          └─────────────────┬───────────────────┘
                                            │
          ┌─────────────────────────────────┼─────────────────────────────────┐
          │                                 │                                 │
          ▼                                 ▼                                 ▼
┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│   Repo Intelligence │         │    Coding Memory    │         │    Patch Engine     │
│       Layer         │         │    (RAG per file)   │         │    (Diff Engine)    │
├─────────────────────┤         ├─────────────────────┤         ├─────────────────────┤
│ • Indexação repo    │         │ • Embeddings via    │         │ • Geração via       │
│ • Grafo dependências│         │   SiliconFlow       │         │   GPT-4o-mini       │
│ • Arquivos sensíveis│         │ • Chunking auto     │         │ • Backup automático │
│ • Fluxos de dados   │         │ • Busca semântica   │         │ • Detecção conflitos│
│ • Detecção ciclos   │         │ • Cache local       │         │ • Ordenação deps    │
└─────────────────────┘         └─────────────────────┘         └─────────────────────┘
          │                                 │                                 │
          └────────────────────┬────────────┴─────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     LLM Router      │
                    │  (Cost Optimizer)   │
                    ├─────────────────────┤
                    │ Scan:   Kimi K2.5   │◄── $0.15/M input, 262k context
                    │ Patch:  GPT-4o-mini │◄── $0.60/M output (85% savings)
                    │ Embed:  SiliconFlow │◄── $0.01/M (10x cheaper)
                    │ Fallback: OpenRouter│◄── +5.5% markup only
                    └─────────────────────┘
```

---

## 📦 Components Detail

### 1. Repo Intelligence Layer (`ril.ts`)

**Responsabilidades:**
- Indexar estrutura do repositório
- Construir grafo de dependências entre arquivos
- Identificar arquivos sensíveis (auth, payment, PII)
- Analisar fluxos de dados cross-file
- Detectar ciclos de dependência

```typescript
const ril = new RepoIntelligence();
const context = await ril.indexRepository('/project');
// context.graph.sensitiveFiles = ['auth.ts', 'payment.ts']
// context.graph.cycles = [[file1, file2, file1]]
```

### 2. Coding Memory (`memory.ts`)

**Responsabilidades:**
- Gerar embeddings via SiliconFlow (10x mais barato que OpenAI)
- Chunking inteligente com overlap para arquivos grandes
- Busca semântica por similaridade de coseno
- Cache local + persistência em Supabase

```typescript
const memory = new CodingMemory();
await memory.initialize(context);
const result = await memory.query({
  query: 'authentication LGPD compliance',
  threshold: 0.7
});
// result.contextString → código relevante
```

### 3. Patch Engine (`patch.ts`)

**Responsabilidades:**
- Gerar correções via GPT-4o-mini (85% mais barato que Haiku)
- Backup automático antes de aplicar
- Detecção de conflitos entre patches
- Ordenação por dependência (bottom-up)
- Rollback em caso de falha

```typescript
const patcher = new PatchEngine();
const patch = await patcher.generatePatch(violation, ragContext);
// patch.confidence = 0.95
const result = await patcher.apply(patch);
// result.backupPath = '.codeguard/backups/file.ts.2026-01-29.bak'
```

### 4. LLM Router (`llm-router.ts`)

**Responsabilidades:**
- Roteamento inteligente por tipo de task
- Fallback automático se provider falhar
- Tracking de custos em tempo real
- Alertas de limite mensal

```typescript
const router = getLLMRouter();
const decision = router.route('scan');
// decision.provider = 'kimi'
// decision.estimatedCost = 0.0003
```

---

## 💰 Cost Strategy

| Task | Provider | Cost | Reason |
|------|----------|------|--------|
| **Scan** | Kimi K2.5 | $0.15/M in | 262k context window |
| **Patch** | GPT-4o-mini | $0.60/M out | 85% cheaper than Haiku |
| **Embeddings** | SiliconFlow | ~$0.01/M | 10x cheaper than OpenAI |
| **Explain** | Kimi K2.5 | $0.15/M in | Long context for analysis |
| **Fallback** | OpenRouter | +5.5% | Universal gateway |

**Monthly Projection (100k scans):** ~$284 (63% savings vs traditional)

> 📖 **Full documentation:** [`docs/LLM_API_STRATEGY.md`](docs/LLM_API_STRATEGY.md)

---

## 🔄 Data Flow: Deep Compliance Audit

```
┌──────────────────────────────────────────────────────────────────┐
│  1. User triggers "Run Deep Compliance Audit"                   │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. RepoIntelligence.indexRepository()                          │
│     → Scans all files, builds dependency graph                  │
│     → Identifies sensitive files (auth, payment, PII)           │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. CodingMemory.initialize()                                   │
│     → Chunks files, generates embeddings via SiliconFlow        │
│     → Stores in cache + Supabase                                │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. LLMRouter.route('scan')                                     │
│     → Selects Kimi K2.5 (262k context)                          │
│     → Estimates cost: ~$0.0003/batch                            │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. ComplianceOrchestrator.runAudit()                           │
│     → Sends batches to LLM via AIClient                         │
│     → Compares against GDPR/LGPD/OWASP rules                    │
│     → Tracks tokens + cost in LLMRouter                         │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  6. PatchEngine.generatePatch() [for fixable violations]        │
│     → Uses GPT-4o-mini (85% cheaper than Haiku)                 │
│     → Creates backup before applying                            │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  7. Report Dashboard                                            │
│     → Aggregates results, shows cost summary                    │
│     → Exports to HTML/JSON/PDF                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Credit System (Pay-Per-Use)

1. **Check**: `get_credits` RPC before AI operation
2. **Authorize**: Block if balance <= 0
3. **Execute**: AI operation via LLMRouter
4. **Deduct**: `use_credits` RPC (server-side authoritative)

---

## 📁 Project Structure

```
src/
├── core/               # LLM routing and config
│   ├── llm-config.ts   # Provider pricing + routing rules
│   └── llm-router.ts   # Intelligent router with fallback
├── intelligence/       # Antigravity core
│   ├── ril.ts          # Repo Intelligence Layer
│   ├── memory.ts       # Coding Memory (RAG)
│   ├── patch.ts        # Patch Engine
│   ├── orchestrator.ts # Main orchestration
│   ├── ai_client.ts    # AI provider client
│   ├── batcher.ts      # Context batching
│   └── frameworks.ts   # Compliance frameworks
├── dashboard/          # Cost management (NEW)
│   └── cost-analytics.ts  # Real-time metrics
├── alerts/             # Budget monitoring (NEW)
│   └── budget-alerts.ts   # Multi-channel notifications
├── optimization/       # Smart routing (NEW)
│   └── smart-router.ts    # Circuit breaker + failover
├── scanner/            # Regex-based static analysis
│   ├── lgpd.ts
│   ├── gdpr.ts
│   ├── pci.ts
│   └── owasp.ts
├── credits/            # Credit system
├── report/             # Report generation
├── supabase/           # Database client
├── ui/                 # Webviews
└── extension.ts        # VS Code entry point

docs/
├── LLM_API_STRATEGY.md # 📖 LLM cost strategy (REFERENCE)
└── openapi.yaml        # API specification

starter/                # Platform starter templates
├── templates/
│   ├── lovable/
│   ├── vercel/
│   └── bolt/
├── sdk/                # Universal SDK
└── packages/           # CLI tools
```

---

## 💰 Cost Management Stack

```
┌──────────────────────────────────────────────────────────────────┐
│                    Cost Management System                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  CostAnalytics  │  │  BudgetAlerts   │  │   SmartRouter   │  │
│  │   (Dashboard)   │  │  (Notifications)│  │   (Failover)    │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  │
│  │ • Real-time     │  │ • 50/80/95%     │  │ • Circuit       │  │
│  │   metrics       │  │   thresholds    │  │   breaker       │  │
│  │ • Per-provider  │  │ • Slack/Email   │  │ • Auto retry    │  │
│  │   breakdown     │  │ • Spike detect  │  │ • Priority      │  │
│  │ • Savings calc  │  │ • Forecasting   │  │   scoring       │  │
│  │ • CSV export    │  │ • Cooldown      │  │ • Health check  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────────┐                      │
│                    │      LLMRouter      │                      │
│                    │   (llm-router.ts)   │                      │
│                    └─────────────────────┘                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Environment Variables

```bash
# Required for LLM
KIMI_API_KEY=sk-xxx           # Scan + Explain
OPENAI_API_KEY=sk-xxx         # Patch
SILICONFLOW_API_KEY=sf-xxx    # Embeddings

# Optional
OPENROUTER_API_KEY=sk-or-xxx  # Fallback only

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
```

---

## 📊 Metrics

The system tracks:
- **Cost per operation**: Automatically via LLMRouter
- **Monthly spend**: With 80% limit alerts
- **Provider distribution**: For optimization
- **Token usage**: By task type

```typescript
const stats = orchestrator.getUsageStats();
// {
//   monthlySpend: 284.50,
//   byProvider: { kimi: 0.45, openai: 0.12, siliconflow: 0.05 },
//   savings: 1.55 (vs OpenAI-only)
// }
```

---

**Author:** CodeGuard AI Team  
**Version:** 2.0  
**Last Updated:** January 2026
