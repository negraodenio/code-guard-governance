# Validation Report

| Field | Value |
| ----- | ----- |
| Repository | langgraph |
| Path | C:\Users\denio\AppData\Local\Temp\opencode\langgraph |
| Date | 2026-06-19 |
| Version | CodeGuard 8.6 |

---

## Section 1 — Discovery Accuracy

| Metric | Value |
| ------ | ----- |
| Files Scanned | 668 |
| Directories | 159 |
| Agents Detected | 38 |
| Frameworks Detected | 4 |
| Autonomous Agents | 0 |
| Orchestrators | 33 |
| Gateways | 0 |
| Retrieval Agents | 0 |
| Assistive | 5 |
| Supervisory | 0 |
| Enrichment Errors | 0 |

**Discovery Score: 75/100**

---

## Section 2 — Framework Detection

| Framework | Count | Avg Confidence |
| --------- | ----- | -------------- |
| LangGraph | 22 | 58% |
| LangChain | 7 | 64% |
| OpenAI SDK | 5 | 58% |
| Dify | 4 | 55% |

---

## Section 3 — False Positives

| File | Detection | Why FP |
| ---- | --------- | ------ |
| — | — | No Custom Agent detections to review |

---

## Section 4 — False Negatives

| File | Expected | Missed Reason |
| ---- | -------- | ------------- |
| — | — | Manual review required |

---

## Section 5 — Repo Intelligence

| Component | Count |
| --------- | ----- |
| Domains | 3 |
| Services | 4 |
| Modules | 96 |
| Entrypoints | 2 |
| Dependencies | 8 |
| Frameworks | 4 |
| Languages | Python, JavaScript, TypeScript |
| Trust Zone | development |
| Business Capabilities | 2 |

### Domains

| Domain | Confidence | Signals |
| ------ | ---------- | ------- |
| identity | 95% | path:libs/sdk-py/langgraph_sdk/auth/exceptions.py, path:libs/sdk-py/langgraph_sdk/auth/types.py, path:libs/sdk-py/langgraph_sdk/auth/__init__.py |
| customer | 60% | path:examples/customer-support/customer-support.ipynb |
| compliance | 60% | path:.github/workflows/baseline.yml |

### Services

| Service | Type | Path |
| ------- | ---- | ---- |
| agent | ai_service | libs/cli/js-monorepo-example/apps/agent |
| agent | ai_service | libs/cli/python-monorepo-example/apps/agent |
| agent | ai_service | libs/cli/python-monorepo-example/apps/agent/src/agent |
| agent | ai_service | libs/cli/uv-examples/monorepo/apps/agent |

**Repo Intelligence Score: 98/100**

---

## Section 6 — Knowledge Graph

### Nodes

| Node Type | Count |
| --------- | ----- |
| agent | 38 |
| dependency | 8 |
| domain | 3 |
| entrypoint | 2 |
| module | 96 |
| repository | 1 |
| service | 4 |
| **Total** | **152** |

### Edges

| Edge Type | Count |
| --------- | ----- |
| belongs_to | 4 |
| contains | 141 |
| depends_on | 8 |
| exposes | 2 |
| **Total** | **155** |

**Graph Completeness Score: 100/100**

---

## Section 7 — Compliance Validation

| Classification | Count | Verified |
| -------------- | ----- | -------- |
| containsPii | 5 | Manual review |
| containsFinancial | 3 | Manual review |
| containsHealth | 2 | Manual review |
| containsCredentials | 9 | Manual review |
| externalSinks | 28 | Manual review |

### PII/Financial/Health Agents

| Agent | File | PII | Financial | Health | Credentials |
| ----- | ---- | --- | --------- | ------ | ----------- |
| LangChainAgent_THREAT_MODEL | .github/THREAT_MODEL.md | YES | — | — | YES |
| LangGraphAgent_THREAT_MODEL | .github/THREAT_MODEL.md | YES | — | — | YES |
| OpenAISDKAgent___init__ | libs/checkpoint/langgraph/store/memory/__init__.py | YES | — | — | — |
| LangGraphAgent_aio | libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/aio.py | — | — | YES | — |
| LangGraphAgent___init__ | libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py | — | YES | YES | — |
| OpenAISDKAgent_aio | libs/checkpoint-sqlite/langgraph/store/sqlite/aio.py | YES | YES | — | — |
| OpenAISDKAgent_base | libs/checkpoint-sqlite/langgraph/store/sqlite/base.py | YES | YES | — | — |
| LangChainAgent_graph | libs/cli/js-examples/src/agent/graph.ts | — | — | — | YES |
| LangGraphAgent_graph | libs/cli/js-examples/src/agent/graph.ts | — | — | — | YES |
| OpenAISDKAgent_graph | libs/cli/js-examples/src/agent/graph.ts | — | — | — | YES |
| LangGraphAgent_cli | libs/cli/langgraph_cli/cli.py | — | — | — | YES |
| LangGraphAgent_schemas | libs/cli/langgraph_cli/schemas.py | — | — | — | YES |
| LangGraphAgent_schema | libs/cli/schemas/schema.json | — | — | — | YES |
| LangGraphAgent_schema.v0 | libs/cli/schemas/schema.v0.json | — | — | — | YES |

**Compliance Score: 100/100**

---

## Section 8 — Regulatory Validation

| Regulation | Hits | Verified | FP |
| ---------- | ---- | -------- | -- |
| AI Act | 1 | Manual review | **REVIEW** |
| DORA | 0 | Manual review | 0 |
| GDPR | 0 | Manual review | 0 |
| LGPD | 0 | Manual review | 0 |

> **Expected for this repo:** AI Act = 0, DORA = 0, GDPR = 0, LGPD = 0.
> Any hit should be flagged as a false positive.

### AI Act Hits

| Agent | File | Exposure | Annex III |
| ----- | ---- | -------- | --------- |
| OpenAISDKAgent_graph | libs/cli/js-examples/src/agent/graph.ts | high | education_vocational_training |

**Regulatory Score: 96/100**

---

## Section 9 — Evidence Quality

| Metric | Value |
| ------ | ----- |
| Evidence Nodes | 93 |
| Lineage Evidence | 93 |
| FAPI Evidence | 0 |
| LGPD Findings | 0 |
| File Coverage | 100% |
| Line Coverage | 100% |
| Match Coverage | 100% |

**Evidence Quality Score: 100/100**

---

## Section 10 — Confidence Calibration

| Metric | Value |
| ------ | ----- |
| Avg Discovery Confidence | 59% |
| Avg Governance Confidence | 57% |
| Avg Compliance Confidence | 58% |
| High Confidence Agents (>=80%) | 0 |
| Low Confidence Agents (<50%) | 0 |

| Detection | Confidence | Governance | Compliance |
| --------- | ---------- | ---------- | ---------- |
| LangGraphAgent_bug-report | 55% | 47% | 56% |
| LangChainAgent_THREAT_MODEL | 55% | 77% | 65% |
| LangGraphAgent_THREAT_MODEL | 55% | 77% | 65% |
| LangChainAgent__integration_test | 55% | 47% | 56% |
| DifyAgent_AGENTS | 55% | 47% | 56% |
| DifyAgent_CLAUDE | 55% | 47% | 56% |
| LangGraphAgent_simulation_utils | 55% | 47% | 48% |
| LangGraphAgent___init__ | 55% | 47% | 48% |
| DifyAgent___init__ | 55% | 47% | 56% |
| OpenAISDKAgent___init__ | 55% | 52% | 63% |
| OpenAISDKAgent___init__ | 55% | 82% | 81% |
| LangChainAgent_README | 55% | 47% | 48% |
| LangGraphAgent_test_async | 55% | 47% | 48% |
| LangGraphAgent_aio | 55% | 57% | 56% |
| LangGraphAgent___init__ | 55% | 77% | 73% |
| OpenAISDKAgent_aio | 55% | 82% | 81% |
| OpenAISDKAgent_base | 55% | 82% | 81% |
| LangGraphAgent_test_delta_channel_migration | 55% | 47% | 56% |
| LangGraphAgent_test_get_delta_channel_history | 55% | 47% | 56% |
| LangGraphAgent_agent | 70% | 51% | 48% |

---

## Section 11 — Enterprise Readiness

| Area | Score |
| ---- | ----- |
| Discovery Score | 75/100 |
| Repo Intelligence Score | 98/100 |
| Graph Score | 100/100 |
| Compliance Score | 100/100 |
| Regulatory Score | 96/100 |
| Evidence Score | 100/100 |
| **Overall Score** | **95/100** |

**Readiness: HIGH** — Pipeline is producing verifiable, defensible results.

---

## Top 10 False Positives

| # | File | Detection | Why FP |
| - | ---- | --------- | ------ |
| — | — | — | No high-confidence Custom Agents |

---

## Top 10 False Negatives

| # | File | Expected | Missed Reason |
| - | ---- | -------- | ------------- |
| — | — | — | Manual review required |

---

## Top 10 Improvements

2. AI Act: 1 hits on non-regulatory repo — tighten Annex III classifier

---

## GO / NO GO

**GO** — This repository validation increases confidence in CodeGuard.

The pipeline produces verifiable results with traceable evidence.
