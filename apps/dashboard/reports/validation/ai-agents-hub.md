# Validation Report

| Field | Value |
| ----- | ----- |
| Repository | ai-agents-hub |
| Path | C:\Users\denio\AppData\Local\Temp\opencode\ai-agents-hub |
| Date | 2026-06-19 |
| Version | CodeGuard 8.6 |

---

## Section 1 — Discovery Accuracy

| Metric | Value |
| ------ | ----- |
| Files Scanned | 46 |
| Directories | 20 |
| Agents Detected | 2 |
| Frameworks Detected | 2 |
| Autonomous Agents | 0 |
| Orchestrators | 1 |
| Gateways | 0 |
| Retrieval Agents | 0 |
| Assistive | 1 |
| Supervisory | 0 |
| Enrichment Errors | 0 |

**Discovery Score: 73/100**

---

## Section 2 — Framework Detection

| Framework | Count | Avg Confidence |
| --------- | ----- | -------------- |
| CrewAI | 1 | 55% |
| Cursor Origin | 1 | 55% |

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
| Domains | 1 |
| Services | 0 |
| Modules | 7 |
| Entrypoints | 2 |
| Dependencies | 0 |
| Frameworks | 2 |
| Languages | Python |
| Trust Zone | development |
| Business Capabilities | 2 |

### Domains

| Domain | Confidence | Signals |
| ------ | ---------- | ------- |
| fraud | 60% | path:11 - Fraud Prevention/.gitkeep |

**Repo Intelligence Score: 78/100**

---

## Section 6 — Knowledge Graph

### Nodes

| Node Type | Count |
| --------- | ----- |
| agent | 2 |
| domain | 1 |
| entrypoint | 2 |
| module | 7 |
| repository | 1 |
| **Total** | **13** |

### Edges

| Edge Type | Count |
| --------- | ----- |
| contains | 10 |
| exposes | 2 |
| **Total** | **12** |

**Graph Completeness Score: 100/100**

---

## Section 7 — Compliance Validation

| Classification | Count | Verified |
| -------------- | ----- | -------- |
| containsPii | 1 | Manual review |
| containsFinancial | 0 | Manual review |
| containsHealth | 0 | Manual review |
| containsCredentials | 1 | Manual review |
| externalSinks | 2 | Manual review |

### PII/Financial/Health Agents

| Agent | File | PII | Financial | Health | Credentials |
| ----- | ---- | --- | --------- | ------ | ----------- |
| CrewAIAgent_routes_recruter | 02 - Recursos Humanos (RH)/Data_Talent_Scout_AI/app/backend/routes/routes_recruter.py | YES | — | — | YES |

**Compliance Score: 100/100**

---

## Section 8 — Regulatory Validation

| Regulation | Hits | Verified | FP |
| ---------- | ---- | -------- | -- |
| AI Act | 0 | Manual review | 0 |
| DORA | 0 | Manual review | 0 |
| GDPR | 0 | Manual review | 0 |
| LGPD | 0 | Manual review | 0 |

**Regulatory Score: 100/100**

---

## Section 9 — Evidence Quality

| Metric | Value |
| ------ | ----- |
| Evidence Nodes | 6 |
| Lineage Evidence | 4 |
| FAPI Evidence | 0 |
| LGPD Findings | 2 |
| File Coverage | 100% |
| Line Coverage | 100% |
| Match Coverage | 100% |

**Evidence Quality Score: 100/100**

---

## Section 10 — Confidence Calibration

| Metric | Value |
| ------ | ----- |
| Avg Discovery Confidence | 55% |
| Avg Governance Confidence | 62% |
| Avg Compliance Confidence | 60% |
| High Confidence Agents (>=80%) | 0 |
| Low Confidence Agents (<50%) | 0 |

| Detection | Confidence | Governance | Compliance |
| --------- | ---------- | ---------- | ---------- |
| CrewAIAgent_routes_recruter | 55% | 77% | 64% |
| CursorOriginAgent_README | 55% | 47% | 56% |

---

## Section 11 — Enterprise Readiness

| Area | Score |
| ---- | ----- |
| Discovery Score | 73/100 |
| Repo Intelligence Score | 78/100 |
| Graph Score | 100/100 |
| Compliance Score | 100/100 |
| Regulatory Score | 100/100 |
| Evidence Score | 100/100 |
| **Overall Score** | **92/100** |

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


---

## GO / NO GO

**GO** — This repository validation increases confidence in CodeGuard.

The pipeline produces verifiable results with traceable evidence.
