# Validation Report

| Field | Value |
| ----- | ----- |
| Repository | openai-agents-python |
| Path | C:\Users\denio\AppData\Local\Temp\opencode\openai-agents-python |
| Date | 2026-06-19 |
| Version | CodeGuard 8.6 |

---

## Section 1 — Discovery Accuracy

| Metric | Value |
| ------ | ----- |
| Files Scanned | 1329 |
| Directories | 227 |
| Agents Detected | 64 |
| Frameworks Detected | 8 |
| Autonomous Agents | 33 |
| Orchestrators | 3 |
| Gateways | 14 |
| Retrieval Agents | 3 |
| Assistive | 11 |
| Supervisory | 0 |
| Enrichment Errors | 0 |

**Discovery Score: 75/100**

---

## Section 2 — Framework Detection

| Framework | Count | Avg Confidence |
| --------- | ----- | -------------- |
| OpenAI Agents SDK | 33 | 62% |
| MCP Server | 11 | 55% |
| OpenAI SDK | 7 | 55% |
| Dify | 3 | 60% |
| Claude Code / Anthropic | 3 | 55% |
| OpenRouter | 3 | 55% |
| LlamaIndex | 3 | 55% |
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
| Domains | 5 |
| Services | 35 |
| Modules | 170 |
| Entrypoints | 23 |
| Dependencies | 54 |
| Frameworks | 4 |
| Languages | Python, JavaScript |
| Trust Zone | development |
| Business Capabilities | 4 |

### Domains

| Domain | Confidence | Signals |
| ------ | ---------- | ------- |
| AML | 95% | path:.agents/skills/code-change-verification/agents/openai.yaml, path:.agents/skills/docs-sync/agents/openai.yaml, path:.agents/skills/examples-auto-run/agents/openai.yaml, path:.agents/skills/final-release-review/agents/openai.yaml, path:.agents/skills/implementation-strategy/agents/openai.yaml, path:.agents/skills/openai-knowledge/agents/openai.yaml, path:.agents/skills/pr-draft-summary/agents/openai.yaml, path:.agents/skills/runtime-behavior-probe/agents/openai.yaml, path:.agents/skills/test-coverage-improver/agents/openai.yaml, path:examples/sandbox/extensions/daytona/usaspending_text2sql/schema/glossary.md |
| credit | 95% | path:examples/sandbox/docs/repo/credit_note.sh, path:examples/sandbox/docs/repo/tests/test_credit_note.sh, path:examples/sandbox/docs/skills/credit-note-fixer/SKILL.md, path:tests/memory/test_session_limit.py |
| health | 95% | path:examples/sandbox/healthcare_support/data/fixtures/insurance_eligibility.json, path:examples/sandbox/healthcare_support/data/fixtures/patient_profiles.json, path:examples/sandbox/healthcare_support/data/fixtures/referral_status.json, path:examples/sandbox/healthcare_support/data/scenarios/billing_coverage_clarification.json, path:examples/sandbox/healthcare_support/data/scenarios/blue_cross_pt_benefits.json, path:examples/sandbox/healthcare_support/data/scenarios/eligibility_verification_basic.json, path:examples/sandbox/healthcare_support/data/scenarios/messy_ambiguous_knee_case.json, path:examples/sandbox/healthcare_support/data/scenarios/prior_auth_confusion_ct.json, path:examples/sandbox/healthcare_support/data/scenarios/referral_status_check.json, path:examples/sandbox/healthcare_support/data.py |
| identity | 95% | path:docs/ref/sandbox/util/token_truncation.md, path:examples/sandbox/healthcare_support/data/scenarios/prior_auth_confusion_ct.json, path:examples/sandbox/healthcare_support/policies/auth_review_queue_routing.md, path:examples/sandbox/healthcare_support/policies/blue_cross_ppo_prior_auth.md, path:examples/sandbox/healthcare_support/skills/prior-auth-packet-builder/SKILL.md, path:src/agents/sandbox/util/token_truncation.py, path:src/agents/_tool_identity.py, path:tests/mcp/test_mcp_auth_params.py, path:tests/sandbox/test_token_truncation.py, path:tests/test_tool_identity.py |
| customer | 90% | path:examples/customer_service/main.py, path:examples/sandbox/healthcare_support/data/fixtures/patient_profiles.json |

### Services

| Service | Type | Path |
| ------- | ---- | ---- |
| agent_patterns | ai_service | examples/agent_patterns |
| agents | ai_service | examples/financial_research_agent/agents |
| agents | ai_service | examples/research_bot/agents |
| repo | data_service | examples/sandbox/docs/repo |
| agents | ai_service | src/agents |
| codex | ai_service | src/agents/extensions/experimental/codex |
| extensions | ai_service | src/agents/extensions |
| memory | ai_service | src/agents/extensions/memory |
| models | ai_service | src/agents/extensions/models |
| blaxel | ai_service | src/agents/extensions/sandbox/blaxel |
| cloudflare | ai_service | src/agents/extensions/sandbox/cloudflare |
| daytona | ai_service | src/agents/extensions/sandbox/daytona |
| e2b | ai_service | src/agents/extensions/sandbox/e2b |
| modal | ai_service | src/agents/extensions/sandbox/modal |
| runloop | ai_service | src/agents/extensions/sandbox/runloop |
| mcp | ai_service | src/agents/mcp |
| memory | ai_service | src/agents/memory |
| models | ai_service | src/agents/models |
| realtime | ai_service | src/agents/realtime |
| run_internal | ai_service | src/agents/run_internal |
| sandbox | ai_service | src/agents/sandbox |
| capabilities | ai_service | src/agents/sandbox/capabilities |
| tools | ai_service | src/agents/sandbox/capabilities/tools |
| entries | ai_service | src/agents/sandbox/entries |
| mounts | ai_service | src/agents/sandbox/entries/mounts |
| providers | ai_service | src/agents/sandbox/entries/mounts/providers |
| memory | ai_service | src/agents/sandbox/memory |
| prompts | ai_service | src/agents/sandbox/memory/prompts |
| sandboxes | ai_service | src/agents/sandbox/sandboxes |
| session | ai_service | src/agents/sandbox/session |
| util | ai_service | src/agents/sandbox/util |
| tracing | ai_service | src/agents/tracing |
| util | ai_service | src/agents/util |
| voice | ai_service | src/agents/voice |
| models | ai_service | src/agents/voice/models |

**Repo Intelligence Score: 98/100**

---

## Section 6 — Knowledge Graph

### Nodes

| Node Type | Count |
| --------- | ----- |
| agent | 64 |
| dependency | 54 |
| domain | 5 |
| entrypoint | 23 |
| module | 170 |
| repository | 1 |
| service | 35 |
| **Total** | **352** |

### Edges

| Edge Type | Count |
| --------- | ----- |
| contains | 271 |
| depends_on | 54 |
| exposes | 23 |
| **Total** | **348** |

**Graph Completeness Score: 100/100**

---

## Section 7 — Compliance Validation

| Classification | Count | Verified |
| -------------- | ----- | -------- |
| containsPii | 4 | Manual review |
| containsFinancial | 6 | Manual review |
| containsHealth | 0 | Manual review |
| containsCredentials | 28 | Manual review |
| externalSinks | 49 | Manual review |

### PII/Financial/Health Agents

| Agent | File | PII | Financial | Health | Credentials |
| ----- | ---- | --- | --------- | ------ | ----------- |
| MCPServerAgent_mcp | docs/ja/mcp.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_index | docs/ja/models/index.md | — | — | — | YES |
| OpenRouterAgent_index | docs/ja/models/index.md | — | — | — | YES |
| LlamaIndexAgent_index | docs/ja/models/index.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_guide | docs/ja/realtime/guide.md | — | — | — | YES |
| OpenAISDKAgent_guide | docs/ja/realtime/guide.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_quickstart | docs/ja/realtime/quickstart.md | — | — | — | YES |
| OpenAISDKAgent_index | docs/ja/sessions/index.md | YES | YES | — | YES |
| OpenAISDKAgent_sessions | docs/ja/sessions.md | YES | YES | — | — |
| OpenAIAgentsSDKAgent_tools | docs/ja/tools.md | — | YES | — | YES |
| OpenAIAgentsSDKAgent_tracing | docs/ja/tracing.md | — | — | — | YES |
| MCPServerAgent_mcp | docs/ko/mcp.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_index | docs/ko/models/index.md | — | — | — | YES |
| OpenRouterAgent_index | docs/ko/models/index.md | — | — | — | YES |
| LlamaIndexAgent_index | docs/ko/models/index.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_guide | docs/ko/realtime/guide.md | — | — | — | YES |
| OpenAISDKAgent_guide | docs/ko/realtime/guide.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_quickstart | docs/ko/realtime/quickstart.md | — | — | — | YES |
| OpenAISDKAgent_index | docs/ko/sessions/index.md | YES | YES | — | YES |
| OpenAISDKAgent_sessions | docs/ko/sessions.md | YES | YES | — | — |
| OpenAIAgentsSDKAgent_tools | docs/ko/tools.md | — | YES | — | YES |
| OpenAIAgentsSDKAgent_tracing | docs/ko/tracing.md | — | — | — | YES |
| MCPServerAgent_mcp | docs/mcp.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_index | docs/models/index.md | — | — | — | YES |
| OpenRouterAgent_index | docs/models/index.md | — | — | — | YES |
| LlamaIndexAgent_index | docs/models/index.md | — | — | — | YES |
| DifyAgent_quickstart | docs/quickstart.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_guide | docs/realtime/guide.md | — | — | — | YES |
| OpenAISDKAgent_guide | docs/realtime/guide.md | — | — | — | YES |
| OpenAIAgentsSDKAgent_quickstart | docs/realtime/quickstart.md | — | — | — | YES |

**Compliance Score: 100/100**

---

## Section 8 — Regulatory Validation

| Regulation | Hits | Verified | FP |
| ---------- | ---- | -------- | -- |
| AI Act | 3 | Manual review | **REVIEW** |
| DORA | 0 | Manual review | 0 |
| GDPR | 0 | Manual review | 0 |
| LGPD | 0 | Manual review | 0 |

> **Expected for this repo:** AI Act = 0, DORA = 0, GDPR = 0, LGPD = 0.
> Any hit should be flagged as a false positive.

### AI Act Hits

| Agent | File | Exposure | Annex III |
| ----- | ---- | -------- | --------- |
| ClaudeCode/AnthropicAgent_examples | docs/examples.md | high | education_vocational_training |
| ClaudeCode/AnthropicAgent_examples | docs/ja/examples.md | high | education_vocational_training |
| ClaudeCode/AnthropicAgent_examples | docs/ko/examples.md | high | education_vocational_training |

**Regulatory Score: 88/100**

---

## Section 9 — Evidence Quality

| Metric | Value |
| ------ | ----- |
| Evidence Nodes | 107 |
| Lineage Evidence | 107 |
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
| Avg Compliance Confidence | 56% |
| High Confidence Agents (>=80%) | 0 |
| Low Confidence Agents (<50%) | 0 |

| Detection | Confidence | Governance | Compliance |
| --------- | ---------- | ---------- | ---------- |
| OpenAIAgentsSDKAgent_SKILL | 55% | 47% | 56% |
| DifyAgent_SKILL | 55% | 47% | 56% |
| OpenAIAgentsSDKAgent_SKILL | 55% | 47% | 56% |
| OpenAIAgentsSDKAgent_AGENTS | 55% | 47% | 56% |
| DifyAgent_AGENTS | 55% | 47% | 56% |
| OpenAIAgentsSDKAgent_agents | 70% | 51% | 56% |
| ClaudeCode/AnthropicAgent_examples | 55% | 50% | 56% |
| OpenAIAgentsSDKAgent_handoffs | 55% | 47% | 56% |
| CursorOriginAgent_human_in_the_loop | 55% | 47% | 56% |
| MCPServerAgent_human_in_the_loop | 55% | 47% | 56% |
| OpenAIAgentsSDKAgent_index | 70% | 51% | 56% |
| OpenAIAgentsSDKAgent_agents | 70% | 51% | 56% |
| ClaudeCode/AnthropicAgent_examples | 55% | 50% | 56% |
| OpenAIAgentsSDKAgent_handoffs | 55% | 47% | 56% |
| MCPServerAgent_human_in_the_loop | 55% | 47% | 48% |
| OpenAIAgentsSDKAgent_index | 70% | 51% | 56% |
| MCPServerAgent_mcp | 55% | 62% | 56% |
| OpenAIAgentsSDKAgent_index | 70% | 61% | 48% |
| OpenRouterAgent_index | 55% | 62% | 56% |
| LlamaIndexAgent_index | 55% | 62% | 56% |

---

## Section 11 — Enterprise Readiness

| Area | Score |
| ---- | ----- |
| Discovery Score | 75/100 |
| Repo Intelligence Score | 98/100 |
| Graph Score | 100/100 |
| Compliance Score | 100/100 |
| Regulatory Score | 88/100 |
| Evidence Score | 100/100 |
| **Overall Score** | **94/100** |

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

2. AI Act: 3 hits on non-regulatory repo — tighten Annex III classifier

---

## GO / NO GO

**GO** — This repository validation increases confidence in CodeGuard.

The pipeline produces verifiable results with traceable evidence.
