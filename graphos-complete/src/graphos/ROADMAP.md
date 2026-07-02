# GraphOS — Roadmap de Excelência

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│                    VIEWS                        │
│  CEO  CFO  CISO  DPO  Compliance  Auditor       │
│  Board  Constitutional  AgentEcosystem          │
└───────────────────┬─────────────────────────────┘
                    │ query
┌───────────────────▼─────────────────────────────┐
│              QUERY / TRAVERSAL                   │
│  engine.ts  ·  traversals.ts  ·  filters.ts     │
│  Agent→Tool→Data→Regulation→Control→Evidence   │
└───────────────────┬─────────────────────────────┘
                    │ build
┌───────────────────▼─────────────────────────────┐
│          GRAPH DATA MODEL (in-memory)            │
│  entities.ts  ·  relationships.ts               │
│  GraphNode + GraphEdge + GraphData              │
└───────────────────┬─────────────────────────────┘
                    │ source
┌───────────────────▼─────────────────────────────┐
│         DATA SOURCES (Supabase + config)         │
│  debate_runs   validations   consents           │
│  persona_config  compliance_db  audit_logs      │
└─────────────────────────────────────────────────┘
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

## Fases & Entregáveis

### Fase 1 — Data Model Foundation (agora)
- [ ] `src/graphos/types/entities.ts` — AgentNode, DecisionNode, ToolNode, DataAssetNode, ControlNode, RegulationNode, CertificateNode, RiskNode, IncidentNode, EvidenceNode
- [ ] `src/graphos/types/relationships.ts` — Edge types com semântica de negócio:
  - `USES_TOOL` | `ACCESSES_SYSTEM` | `PROCESSES_DATA` | `HAS_PII` | `LEGAL_BASIS`
  - `MAKES_DECISION` | `EVIDENCED_BY` | `IMPACTS_RISK` | `MITIGATED_BY` | `REQUIRES_CERT`
  - `REGULATES` | `GOVERNS` | `TRIGGERS_INCIDENT` | `APPEALS_CONTROL`
- [ ] `src/graphos/engine.ts` — GraphEngine que constrói o grafo completo de múltiplas fontes:
  - Personas do council → AgentNodes
  - Ferramentas/config → ToolNodes + ExternalSystemNodes
  - Decisões/validações → DecisionNodes + EvidenceNodes
  - Compliance DB → ControlNodes + RegulationNodes + CertificateNodes
  - Consents → DataAssetNodes com classificação de PII
- [ ] `src/graphos/traversals.ts` — Traversals pré-construídas (as 9 queries das views)
- [ ] API: `POST /api/graphos/query` — recebe `{ view, filters }`, retorna subgrafo

### Fase 2 — Core UI + CEO + CFO Views
- [ ] `src/graphos/ui/ViewSelector.tsx` — Navegação entre as 9 views (abas + ícone)
- [ ] `src/graphos/ui/StatsCard.tsx` — Card métrico com label, valor, delta, cor
- [ ] `src/graphos/ui/GraphCanvas.tsx` — D3 force-directed refatorado com suporte a multi-tipo de node
- [ ] **CEO View**: stats dashboard (agentes, críticos, risco, compliance score) + mini-graph dos top-level nodes
- [ ] **CFO View**: árvore de custo Decision→Agent→Model→Token, gráfico de barras por agente

### Fase 3 — CISO + DPO Views
- [ ] **CISO View**: grafos de Agent→Tool→ExternalSystem com classificação de risco. Destaque para agents sem owner, tools expostas, MCPs, secrets
- [ ] **DPO View**: grafo Agent→Data→Classification→LegalBasis. Filtro por PII, consent status, retenção
- [ ] `PIIBadge` component, `RiskBadge` component

### Fase 4 — Compliance + Auditor Views
- [ ] **Compliance View**: grafo Agent→Decision→Regulation. Mapa de regulações (AI Act, GDPR, LGPD, DORA, NIS2, ISO 42001) com status por agente
- [ ] **Auditor View**: Decision reconstruction — cadeia completa: quem decidiu, qual modelo, qual prompt, qual evidência, quem aprovou, qual norma
- [ ] Timeline component para reconstrução temporal

### Fase 5 — Board + Constitutional + Agent Ecosystem
- [ ] **Board View**: Top 10 riscos materiais, top 10 agentes críticos, exposição regulatória agregada
- [ ] **Constitutional View**: grafo Agent→Control→Evidence→Certification. Score CG-AG por agente. Exceções e apelações
- [ ] **Agent Ecosystem View**: mapa completo de todos os agentes, suas ferramentas, dependências e relacionamentos

### Fase 6 — Query Layer + Integração + Export
- [ ] `QueryBar.tsx` — input de linguagem natural que traduz para traversal (ex: "mostre agents com PII e risco alto")
- [ ] Export dos grafos como PNG/SVG/PDF
- [ ] Integração com o dashboard existente
- [ ] Modo apresentação (fullscreen, auto-rotate entre views)

---

## Critérios de Excelência

1. **Cada view responde a uma pergunta de negócio** — não é só gráfico bonito, é insight acionável
2. **Todas as arestas têm semântica** — não é só "conectado", é `PROCESSES_PII`, `MITIGATED_BY_CONTROL`, `EVIDENCED_BY`
3. **Cada view pode ser exportada** — PNG para slide, JSON para auditoria
4. **Grafo é interativo** — clique = drill-down, hover = preview, drag = reorganizar
5. **Dados vivos** — não é mock, é construído do Supabase + config em tempo real
6. **Performance** — < 500ms para construir grafo, < 100ms para trocar de view
7. **Acessível** — contraste, aria-labels, keyboard navigation
8. **Responsivo** — funciona em desktop e tablet (apresentação em board meeting)
