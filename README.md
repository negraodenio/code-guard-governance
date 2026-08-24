<div align="center">

# 🛡️ CodeGuard AI Governance OS

### *The first operating system for AI Agent Governance*

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Framework: CG-AG](https://img.shields.io/badge/Framework-CG--AG%20v1.0-0ECFB8)](https://github.com/negraodenio/code-guard-governance)
[![EU AI Act Aligned](https://img.shields.io/badge/EU%20AI%20Act-Aligned-blue)](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
[![ISO 42001](https://img.shields.io/badge/ISO%2FIEC-42001%3A2023-green)](https://www.iso.org/standard/81230.html)
[![Tests: 203/203](https://img.shields.io/badge/Tests-203%2F203%20passing-brightgreen)](https://github.com/negraodenio/code-guard-governance)
[![Status: Production](https://img.shields.io/badge/Status-Production-success)](https://www.code-guard.eu)

**[🌐 Platform](https://www.code-guard.eu) · [📘 Full Docs](TRACEABILITY_MATRIX.md) · [🎓 Course](#-course--certification) · [🤝 Beta Program](#-beta-tester-program)**

</div>

---

## 🔥 The Problem

> **85% of AI agents operating in organizations are undocumented and ungoverned.** — *Shadow Agents*

Organizations are deploying AI agents at breakneck speed — chatbots, autonomous assistants, decision-making pipelines, RAG systems, multi-agent swarms. But with no inventory, no audit trail, and no compliance layer, they face existential regulatory risk:

| Regulation | Obligation | Penalty |
|---|---|---|
| **EU AI Act (2024/1689)** | Register & audit all high-risk AI systems | Up to **7% of global turnover** |
| **LGPD / GDPR** | Accountability for automated decisions involving personal data | Fines + reputational damage |
| **ISO/IEC 42001:2023** | AI Management System certification | Loss of certification |
| **NIST AI RMF 1.0** | Govern, map, measure, and manage AI risk | Regulatory non-conformity |
| **DORA (2022/2554)** | ICT asset registers for financial entities | Supervisory action |

**Spreadsheets and Word documents fail.** The only answer is **Governance-as-Code**.

---

## 🚀 What is CodeGuard AI Governance OS?

CodeGuard is a **modular AI Governance Operating System** built on the open standard **CG-AG (CodeGuard Agent Governance)**. It transforms raw code repositories into a living, auditable governance layer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CODEGUARD GOVERNANCE STACK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔍 SCANNER         →  Discovers Shadow Agents in source code (13 regs)     │
│  🧠 GRAPHOS         →  Executive knowledge graph (React Flow + Dagre)       │
│  📋 INVENTORY       →  Agent lifecycle: Discovered → Active → Decommissioned│
│  🛡️ CG-AG CONTROLS  →  12 governance controls mapped to EU AI Act + LGPD   │
│  📜 LEDGER          →  Tamper-proof immutable audit log (cryptographic hash)│
│  💬 TALK TO GOV     →  Deterministic natural language audit queries (no LLM)│
│  🏅 CERTIFICATION   →  Bronze → Silver → Gold → Platinum                    │
│  📊 BOARD REPORT    →  Executive PDF for C-Level, Board and Regulators      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 The 12 CG-AG Governance Controls

The **CG-AG Framework** (CC BY 4.0 Open Standard) defines 12 mandatory controls for responsible AI agent operation:

| Control | Name | Regulation Coverage |
|---------|------|---------------------|
| **CG-AG-001** | Agent Master Inventory | EU AI Act Art. 11, DORA Art. 8 |
| **CG-AG-002** | Human Approval & Four-Eyes | EU AI Act Art. 14, LGPD Art. 20 |
| **CG-AG-003** | Model Lineage & Prompt Versioning | EU AI Act Art. 12, ISO 42001 §6.1 |
| **CG-AG-004** | Tool & API Authorization (MCP) | EU AI Act Art. 17, NIST AI RMF |
| **CG-AG-005** | PII Data Boundary (LGPD/GDPR) | LGPD Art. 7/11, GDPR Art. 22 |
| **CG-AG-006** | Explainability & Decision Reconstruction | EU AI Act Art. 13, LGPD Art. 20 |
| **CG-AG-007** | Risk Classification Matrix | EU AI Act Art. 9, NIST AI RMF |
| **CG-AG-008** | Governance Ledger (Tamper-Proof Logs) | DORA Art. 10, ISO 27001 A.12.4 |
| **CG-AG-009** | Continuous Governance & Drift Detection | EU AI Act Art. 9(6), DORA Art. 13 |
| **CG-AG-010** | Kill-Switch & Incident Response | EU AI Act Art. 9(4), DORA Art. 19 |
| **CG-AG-011** | Board Report & Executive Scorecards | EU AI Act Art. 26, DORA Art. 5 |
| **CG-AG-012** | Multi-Agent & Swarm Governance | EU AI Act Art. 25, NIST AI RMF |

> 📖 Full regulatory traceability mapping in [`TRACEABILITY_MATRIX.md`](TRACEABILITY_MATRIX.md)

---

## 🏅 Certification Levels

```
🥉 BRONZE    →  Formal agent inventory + shadow agent detection
🥈 SILVER    →  Access control, human approval gates, model lineage
🥇 GOLD      →  Active PII protection, continuous monitoring, immutable ledger
💎 PLATINUM  →  Multi-agent governance, DORA resilience, full deterministic audit
```

---

## 🧠 GraphOS — Executive Governance Cockpit

**GraphOS** is the visual intelligence layer — a **progressive disclosure knowledge graph** built with React Flow + Dagre that transforms compliance data into an executive cockpit.

### 9 Executive Perspectives
| View | Question | Audience |
|------|----------|----------|
| 👔 CEO | *Are we exposed?* | Chief Executive |
| 💰 CFO | *What does it cost?* | Finance |
| 🔒 CISO | *Where can we be attacked?* | Security |
| 🛡️ DPO | *Where is PII?* | Data Protection |
| ⚖️ Compliance | *Are we conforming?* | Legal/GRC |
| 🔍 Auditor | *Reconstruct the decision* | Audit |
| 🏛️ Board | *Where is the material risk?* | Board of Directors |
| 📜 Constitutional | *Is the constitution respected?* | Governance |
| 🌐 Ecosystem | *Who are all the agents?* | Architecture |

### Key Features
- **Progressive Disclosure** — Start with primary agent cards, drill down to full lineage: `Agent → Model → Tools → Data (PII) → Risks → Controls → Evidence`
- **Executive Node Cards** — Large readable cards with PII badge, risk severity, autonomy tag, and CG-AG score bar
- **Talk to Governance** — Filter graph by intent: *"Which agents process PII?"* → graph isolates only those nodes
- **Smart Filters** — `🤖 Agents` · `⚠️ PII Access` · `🔴 High Risk` · `🛡️ CG-AG Controls`
- **Intelligence Cockpit Bar** — Live bottom bar: Selected Agent | Risk | PII | Score | Expand Lineage

---

## 🔍 Scanner Capabilities

Analyzes source code across **13 regulatory frameworks** simultaneously:

**EU AI Act · LGPD · GDPR · ISO 42001 · NIST AI RMF · DORA · HIPAA · PCI DSS · CCPA/CPRA · FINRA · SOX · COPPA · FinOps**

**Supported Agent Frameworks:**
- 🐍 Python: LangChain, CrewAI, AutoGen, AutoGPT, LlamaIndex, Haystack, Agno
- 📘 TypeScript/JS: LangChain.js, OpenAI Assistants, Vercel AI SDK, Mastra
- 🔌 MCP (Model Context Protocol) tools and servers

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Graph Visualization** | React Flow (`@xyflow/react`), Dagre auto-layout |
| **Styling** | Tailwind CSS, glassmorphism dark theme |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Governance Engine** | Pure TypeScript — deterministic, zero LLM dependency |
| **Testing** | Jest — 203/203 tests across 8 suites |
| **Deployment** | Vercel Edge + Supabase Cloud |

---

## 🚦 Quick Start

```bash
# Clone & install
git clone https://github.com/negraodenio/code-guard-governance.git
cd code-guard-governance
npm install

# Configure environment
cp graphos-complete/.env.example graphos-complete/.env
# Fill in your Supabase credentials

# Run development server
cd graphos-complete
npm run dev
# Open http://localhost:3000/graphos

# Run governance tests
npm run test:graphos      # 203/203 passing
npm run typecheck:graphos # 0 TypeScript errors
```

---

## 💬 Talk to Governance API

```bash
curl -X POST http://localhost:3000/api/governance/talk \
  -H "Content-Type: application/json" \
  -d '{"query": "Which agents process PII?"}'
```

```json
{
  "ok": true,
  "data": {
    "detectedIntent": "pii_access_query",
    "confidence": 92,
    "answer": "3 agents with PII access found: Customer Support Agent, Triage Assistant, Data Pipeline Agent",
    "answerPt": "3 agentes com acesso a PII encontrados...",
    "evidence": ["cg-ag-005:customer-support", "cg-ag-005:triage-assistant"]
  }
}
```

---

## 🎓 Course & Certification

**Formação Executiva em Governança de Agentes de IA**
> 40 Hours · Intermediate/Advanced · **Certified AI Agent Governance Auditor (CG-AG)**

| Module | Topic |
|--------|-------|
| 1 | Agentic Risk & The Regulatory Vacuum (EU AI Act, LGPD, ISO 42001) |
| 2 | The CG-AG Framework & Certification Scale (Bronze → Platinum) |
| 3 | Inventory, Four-Eyes Approval & Tool Authorization (CG-AG-001 to 004) |
| 4 | Data Boundaries, PII & Agentic LGPD (CG-AG-005) |
| 5 | Explainability & Immutable Ledger (CG-AG-006 to 008) |
| 6 | Drift Detection, CI/CD & Kill-Switch (CG-AG-009 to 010) |
| 7 | Multi-Agent & Swarm Governance (CG-AG-012) |
| 8 | Board Reports & Executive Certification (CG-AG-011) |
| **9** | **🧪 Practical Lab — GraphOS Platform (Beta Tester Program)** |
| 10 | Final Project & Professional Certification |

📖 Full curriculum: [`CURSO_GOVERNANCA_AGENTES_IA.md`](CURSO_GOVERNANCA_AGENTES_IA.md)

---

## 🤝 Beta Tester Program

Students completing the course become the first **CodeGuard Beta Testers** — auditing real repositories using GraphOS and shaping the platform roadmap.

**Interested?** → [deniolisbon@gmail.com](mailto:deniolisbon@gmail.com)

---

## 📜 License

**CG-AG Framework** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) Open Standard  
**CodeGuard OS Platform** — Proprietary software

---

## 👤 Author

**Denio Negrão** — Enterprise AI Governance Architect  
🌐 [code-guard.eu](https://www.code-guard.eu) · ✉️ [deniolisbon@gmail.com](mailto:deniolisbon@gmail.com)

---

<div align="center">

**Built for the era where AI agents outnumber developers.**

*The law is changing. Your agents are already running. Govern them.*

</div>
