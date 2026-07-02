# Validation Report

| Field | Value |
| ----- | ----- |
| Repository | councilIA-system |
| Path | C:\Users\denio\AppData\Local\Temp\opencode\councilIA-system |
| Date | 2026-06-19 |
| Version | CodeGuard 8.6 |

---

## Section 1 — Discovery Accuracy

| Metric | Value |
| ------ | ----- |
| Files Scanned | 281 |
| Directories | 105 |
| Agents Detected | 14 |
| Frameworks Detected | 4 |
| Autonomous Agents | 0 |
| Orchestrators | 7 |
| Gateways | 5 |
| Retrieval Agents | 0 |
| Assistive | 2 |
| Supervisory | 0 |
| Enrichment Errors | 0 |

**Discovery Score: 78/100**

---

## Section 2 — Framework Detection

| Framework | Count | Avg Confidence |
| --------- | ----- | -------------- |
| Dify | 6 | 55% |
| OpenRouter | 5 | 67% |
| OpenAI SDK | 2 | 70% |
| LangChain | 1 | 70% |

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
| Domains | 5 |
| Services | 5 |
| Modules | 27 |
| Entrypoints | 2 |
| Dependencies | 6 |
| Frameworks | 1 |
| Languages | JavaScript, TypeScript, TypeScript (React) |
| Trust Zone | development |
| Business Capabilities | 3 |

### Domains

| Domain | Confidence | Signals |
| ------ | ---------- | ------- |
| payments | 95% | path:src/app/api/stripe/checkout/route.ts, path:src/app/api/stripe/portal/route.ts, path:src/app/api/webhooks/stripe/route.ts, path:src/lib/stripe.ts |
| credit | 95% | path:src/config/limits.ts, path:src/lib/scoring.ts, path:src/services/councilia/scoring.ts |
| customer | 95% | path:src/app/api/custom-persona/route.ts, path:src/app/api/custom-persona/upload/route.ts, path:src/app/dashboard/custom-persona/page.tsx, path:src/services/councilia/judge/persona-baselines.ts, path:supabase/migrations/00_create_profiles.sql, path:supabase/migrations/20260224_custom_expert_persona.sql |
| identity | 95% | path:scripts/audit_auth.js, path:src/app/api/auth/callback/route.ts, path:src/app/api/auth/signout/route.ts, path:src/app/login/page.tsx, path:src/lib/security/auth-context.ts, path:src/lib/security/internal-auth.ts, path:src/token.txt |
| compliance | 95% | path:scripts/audit_api.js, path:scripts/audit_auth.js, path:src/app/api/audit/export/route.ts, path:src/lib/benchmark/run_audit_bench.ts, path:src/lib/compliance/anvisa.ts, path:src/lib/compliance/audit-logger.ts, path:src/lib/compliance/bcb-4893.ts, path:src/lib/compliance/gdpr.ts, path:src/lib/compliance/lgpd.ts, path:src/lib/security/audit.ts |

### Services

| Service | Type | Path |
| ------- | ---- | ---- |
| worker | api_service | src/app/api/session/worker |
| repo | data_service | src/lib/repo |
| councilia | domain_service | src/services/councilia |
| judge | domain_service | src/services/councilia/judge |
| rounds | domain_service | src/services/councilia/rounds |

**Repo Intelligence Score: 98/100**

---

## Section 6 — Knowledge Graph

### Nodes

| Node Type | Count |
| --------- | ----- |
| agent | 14 |
| dependency | 6 |
| domain | 5 |
| entrypoint | 2 |
| module | 27 |
| repository | 1 |
| service | 5 |
| **Total** | **60** |

### Edges

| Edge Type | Count |
| --------- | ----- |
| belongs_to | 6 |
| contains | 47 |
| depends_on | 6 |
| exposes | 2 |
| **Total** | **61** |

**Graph Completeness Score: 100/100**

---

## Section 7 — Compliance Validation

| Classification | Count | Verified |
| -------------- | ----- | -------- |
| containsPii | 0 | Manual review |
| containsFinancial | 0 | Manual review |
| containsHealth | 0 | Manual review |
| containsCredentials | 8 | Manual review |
| externalSinks | 9 | Manual review |

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
| Evidence Nodes | 36 |
| Lineage Evidence | 36 |
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
| Avg Discovery Confidence | 63% |
| Avg Governance Confidence | 63% |
| Avg Compliance Confidence | 61% |
| High Confidence Agents (>=80%) | 0 |
| Low Confidence Agents (<50%) | 0 |

| Detection | Confidence | Governance | Compliance |
| --------- | ---------- | ---------- | ---------- |
| OpenRouterAgent_audit_api | 55% | 82% | 77% |
| OpenRouterAgent_test_openrouter | 70% | 66% | 60% |
| OpenRouterAgent_route | 70% | 66% | 60% |
| OpenRouterAgent_route | 70% | 66% | 60% |
| OpenAISDKAgent_route | 70% | 61% | 52% |
| DifyAgent_page | 55% | 47% | 56% |
| LangChainAgent_chunker | 70% | 51% | 56% |
| DifyAgent_scoring | 55% | 47% | 56% |
| DifyAgent_middleware | 55% | 47% | 56% |
| DifyAgent_judge | 55% | 47% | 56% |
| OpenRouterAgent_provider | 70% | 86% | 73% |
| DifyAgent_provider | 55% | 77% | 65% |
| OpenAISDKAgent_provider | 70% | 86% | 73% |
| DifyAgent_validator | 55% | 47% | 56% |

---

## Section 11 — Enterprise Readiness

| Area | Score |
| ---- | ----- |
| Discovery Score | 78/100 |
| Repo Intelligence Score | 98/100 |
| Graph Score | 100/100 |
| Compliance Score | 100/100 |
| Regulatory Score | 100/100 |
| Evidence Score | 100/100 |
| **Overall Score** | **96/100** |

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
