# GraphOS — Roadmap de Excelência

## Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────────┐
│                         VIEWS (9 executivas)                    │
│  CEO  CFO  CISO  DPO  Compliance  Auditor                       │
│  Board  Constitutional  AgentEcosystem                          │
└─────────────────────────────────────┬───────────────────────────┘
                                      │ query
┌─────────────────────────────────────▼───────────────────────────┐
│              QUERY / TRAVERSAL ENGINE                           │
│  @council/graphos: VIEW_BUILDERS  VIEW_META  buildFullGraph     │
│  Agent→Tool→Data→Regulation→Control→Evidence                   │
└─────────────────────────────────────┬───────────────────────────┘
                                      │ build
┌─────────────────────────────────────▼───────────────────────────┐
│         GRAPH DATA MODEL (dual: in-memory + Postgres)           │
│  GraphEngine  GraphEntity  Relationship  ViewResult             │
│  GraphNode  GraphEdge  GraphData  GraphMetadata                 │
└─────────────────────────────────────┬───────────────────────────┘
                                      │ source
┌─────────────────────────────────────▼───────────────────────────┐
│        DATA SOURCES (Supabase PostgreSQL + scanner cache)       │
│  gov_repo.*  governance_users  agents  agent_edges              │
│  risk_items  evidences  incidents  governance_ledger            │
└─────────────────────────────────────────────────────────────────┘
```

## Entity Model

```
Agent ──USES_TOOL──▶ Tool ──ACCESSES──▶ ExternalSystem
  │                    │
  │                    └──PROCESSES──▶ DataAsset ──HAS_PII──▶ Boolean
  │                                                  │
  ├──MAKES──▶ Decision ──EVIDENCED_BY──▶ Evidence     ├──LEGAL_BASIS──▶ Regulation
  │             │                                      └──RETENTION──▶ Policy
  │             └──IMPACTS──▶ Risk ──MITIGATED_BY──▶ Control
  │                                                    │
  └──GOVERNS──▶ Regulation ──REQUIRES──▶ Certificate   └──EVIDENCE──▶ Evidence
                                                   │
                   Incident ──TRIGGERS──▶ BreachNotification
```

---

## Status das Fases

### ✅ Fase 1 — Data Model Foundation
- [x] `packages/graphos/src/types/entities.ts` — AgentNode, DecisionNode, ToolNode, DataAssetNode, ControlNode, RegulationNode, CertificateNode, RiskNode, IncidentNode, EvidenceNode
- [x] `packages/graphos/src/types/relationships.ts` — Edge types com semântica: `USES_TOOL` | `ACCESSES_SYSTEM` | `PROCESSES_DATA` | `HAS_PII` | `LEGAL_BASIS` | `MAKES_DECISION` | `EVIDENCED_BY` | `IMPACTS_RISK` | `MITIGATED_BY` | `REQUIRES_CERT` | `REGULATES` | `GOVERNS` | `TRIGGERS_INCIDENT`
- [x] `packages/graphos/src/engine.ts` — GraphEngine com suporte a múltiplas fontes de dados
- [x] `packages/graphos/src/views/index.ts` — 9 view builders + VIEW_META
- [x] API: `POST /api/graphos` — recebe `{ view, param, repoUrl }`, retorna subgrafo

### ✅ Fase 2 — Core UI + CEO + CFO Views
- [x] `src/graphos/ui/ViewSelector.tsx` — Pill bar de navegação entre 9 views
- [x] `src/graphos/ui/StatsCard.tsx` — Card métrico glassmorphic
- [x] `src/ui/graphos/ReactFlowGraph.tsx` — React Flow + Dagre com 5 tipos de nós
- [x] `src/ui/graphos/nodes/AgentNode.tsx` — Card executivo 310px, inline styles
- [x] `src/ui/graphos/nodes/ControlNode.tsx` — Card CG-AG 270px, verde
- [x] `src/ui/graphos/nodes/RiskNode.tsx` — Card risco 270px, colorido por severidade
- [x] `src/ui/graphos/nodes/DataAssetNode.tsx` — Card data/PII 270px, violeta
- [x] `src/ui/graphos/nodes/GenericNode.tsx` — Card genérico 240px
- [x] **CEO View**: stats executivas + grafo de agentes em destaque
- [x] **CFO View**: custo por agente, token usage, FinOps

### ✅ Fase 3 — CISO + DPO Views
- [x] **CISO View**: Agent→Tool→ExternalSystem, risco por agent, sem owner
- [x] **DPO View**: Agent→Data→Classification→LegalBasis, PII badge
- [x] Progressive Disclosure: drill-down de agente → linhagem completa
- [x] Bottom Intelligence Cockpit Bar: risco, PII, score CG-AG em tempo real

### ✅ Fase 4 — Compliance + Auditor Views
- [x] **Compliance View**: Agent→Regulation map (EU AI Act, LGPD, DORA, ISO 42001)
- [x] **Auditor View**: Reconstrução de decisão com cadeia de custódia

### ✅ Fase 5 — Board + Constitutional + Agent Ecosystem
- [x] **Board View**: Top riscos materiais, agentes críticos, exposição regulatória
- [x] **Constitutional View**: Agent→Control→Evidence, score CG-AG por agente
- [x] **Agent Ecosystem View**: mapa completo de todos os agentes e dependências

### ✅ Fase 6 — Query Layer + Scanner + Export
- [x] **Talk to Governance**: linguagem natural → traversal determinística (PT/EN/ES)
- [x] **Scanner**: 13 regulações, LangChain/CrewAI/AutoGPT/MCP, Python + TypeScript
- [x] **GraphOS API**: GET + POST com view, param, repoUrl
- [x] **Report PDF**: `/api/report` com pdfkit + Board scorecard
- [x] **Fullscreen mode**: apresentação em board meeting
- [x] **MiniMap + Controls**: zoom, pan, minimap interativo
- [x] **Edge Legend**: Agree/Comply (verde) · Risk/Disagree (vermelho) · Governed (teal)
- [x] **Smart Filters**: Agentes · PII · Alto Risco · CG-AG Controls
- [x] **Direção de layout**: Horizontal (L→R) ↔ Vertical (T→B)

---

## Critérios de Excelência

1. ✅ **Cada view responde a uma pergunta de negócio** — CEO, CFO, CISO, DPO, Compliance, Auditor, Board, Constitutional, Ecosystem
2. ✅ **Todas as arestas têm semântica** — `PROCESSES_PII`, `MITIGATED_BY_CONTROL`, `EVIDENCED_BY`, `LEGAL_BASIS`
3. ✅ **Exportação** — PDF via `/api/report`, PNG via html2canvas
4. ✅ **Grafo interativo** — click=drill-down, hover=preview, drag=reorganizar, fullscreen
5. ✅ **Dados vivos** — construído do Supabase + scanner em tempo real
6. ✅ **Performance** — layout Dagre <100ms, fitView com animação 400ms
7. ⬜ **Acessível** — aria-labels pendentes nos nós do React Flow
8. ✅ **Responsivo** — funciona em desktop e tablet

---

## Pendente / Backlog

- [ ] `aria-label` nos nós do React Flow para acessibilidade
- [ ] Export PNG/SVG do canvas (html2canvas integrado mas não exposto no UI)
- [ ] Service Worker (`sw.js`) — remover registo ou implementar
- [ ] Modo apresentação com auto-rotate entre views (Fase 6 extra)
- [ ] Verificar licença React Flow Pro vs OSS (atribuição)
