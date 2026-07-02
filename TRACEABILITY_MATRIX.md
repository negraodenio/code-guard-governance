# CodeGuard AI Governance OS — Regulatory Traceability Matrix
## CG-AG-001 through CG-AG-012

**Document version:** 1.0  
**Basis:** EU AI Act (2024/1689) · DORA (2022/2554) · ISO/IEC 42001:2023 · NIST AI RMF 1.0 · ISO/IEC 27001:2022  
**Schema anchor:** `gov_repo` schema, migrations 003–005  
**Review status:** Principal Enterprise Architect review

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **Primary** | The control directly implements this requirement |
| **Contributing** | The control partially satisfies this requirement; other controls also required |
| **Triggered** | The control activates a workflow that satisfies this requirement |

---

## Matrix Structure

Each control is presented as a full block covering all five regulatory frameworks.  
A consolidated cross-reference summary table follows at the end.

---

---

## CG-AG-001 — Agent Inventory

**Control definition:** Every AI agent must be formally registered in the master agent inventory with a non-null `agent_code`, `name`, `agent_type`, and `organisation_id` before it is permitted to operate in any environment.  
**Schema flag:** `gov_repo.agents.cg_ag_001_registered` (auto-set by `trg_agents_compliance_flags`)  
**Gap index:** `idx_agents_cg001_gap`  
**Compliance function:** `gov_repo.agent_compliance_gaps()` → `gap_cg_ag_001`

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Providers of high-risk AI systems must maintain technical documentation sufficient to demonstrate conformity. Documentation must include a general description of the AI system and its intended purpose. | Art. 11 + Annex IV §1 | Complete inventory record: `agent_code`, `name`, `description`, `agent_type`, `version`, `organisation_id`, `deployment_env`. Timestamp of registration. | `gov_repo.agents` — full row. `gov_repo.governance_ledger` — INSERT event for the agent. | Agent registration form → `trg_agents_compliance_flags` sets `cg_ag_001_registered = true` → ledger entry written → compliance dashboard updated. |
| High-risk AI systems must be registered in the EU AI database before being placed on the market or put into service. | Art. 49 + Art. 71 | `eu_ai_db_registered = true`, `eu_ai_db_ref` populated. | `gov_repo.agents.eu_ai_db_registered`, `gov_repo.agents.eu_ai_db_ref` | Registration workflow → EU AI database submission → ref stored → flag set. |
| Operators must ensure they use AI systems only as intended and in accordance with the provider's instructions. | Art. 26(1) | Agent `description`, `intended_use` (Annex IV), `deployment_env` documented. | `gov_repo.agents.description`, `gov_repo.agents.deployment_env` | Deployment approval workflow; operator acceptance recorded. |
| Quality management system must include procedures for the systematic examination, testing and validation of AI systems. | Art. 17(1)(b) | Evidence that agent entered inventory via governed registration process, not ad-hoc. | `gov_repo.governance_ledger` — event `agent_registered` with approver ID. | Registration → four-eyes approval (M006) → ledger. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Financial entities shall identify, classify and document all ICT assets, including systems, applications and information assets supporting critical or important functions. | Art. 8(1) | All agents registered with `agent_code`, `status`, `deployment_env`, `business_domain`, `department`. | `gov_repo.agents` full inventory; `idx_agents_org`, `idx_agents_status` indexes. | ICT asset discovery → registration → tagging with business function → periodic reconciliation. |
| Financial entities shall keep updated registers of all ICT assets. | Art. 8(4) | `updated_at` timestamp on every agent record; change history in ledger. | `gov_repo.agents.updated_at` (via `trg_agents_updated_at`); `gov_repo.governance_ledger`. | Trigger fires on every UPDATE; ledger records state transitions. |
| ICT risk management framework must cover the full lifecycle of ICT assets. | Art. 5(2) | Evidence that decommissioned agents are tracked, not deleted. `status = 'decommissioned'` with timestamp. | `gov_repo.agents.status` enum (`decommissioned` value); `gov_repo.agents.suspended_at`. | Decommission workflow → status change → ledger → compliance gap indexes exclude decommissioned. |
| Registers of ICT assets must support the identification of dependencies and single points of failure. | Art. 8(6) | `agent_graph_traverse()` can enumerate all agent dependencies from any root. | `gov_repo.agent_edges`; `gov_repo.agent_graph_traverse()` function. | Graph traversal on demand; risk propagation recomputation triggered on graph changes. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall determine the scope of the AIMS and document it, including the AI systems within scope. | 4.3 | Complete list of all agents in scope, with `organisation_id`, `status`, `agent_type`. | `gov_repo.agents` filtered by `organisation_id`; `v_agents_without_ai_system` for gap detection. | Scope definition → agent registration → AIMS scope document references registry. |
| The organisation shall identify and document AI systems and their characteristics. | 6.1.2 | Agent inventory with `agent_type`, `risk_level`, `ai_act_risk_class`, `capabilities`, `tags`. | `gov_repo.agents` — classification columns; `gov_repo.agents.capabilities` (JSONB). | Initial classification during registration; updated on material change. |
| The organisation shall maintain documented information as evidence of the AI management system. | 9.1 | Inventory record exists, is current, and has an audit trail. | `gov_repo.agents`; `gov_repo.governance_ledger`; `gov_repo.evidence.control_refs` array includes `CG-AG-001`. | Evidence collection workflow; control assessment `gov_repo.control_assessments` with `control_ref = 'CG-AG-001'`. |
| Top management shall ensure the AIMS is integrated into the organisation's processes. | 5.1 | `business_domain` and `department` populated; agent linked to organisational structure. | `gov_repo.agents.business_domain`, `gov_repo.agents.department`. | Registration form requires business domain assignment; validated at submission. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Catalogue AI systems in use and understand their context, capabilities, and risks. | MAP 1.1 — Categorise | Complete inventory with context: `agent_type`, `model_name`, `model_provider`, `deployment_env`, `business_domain`. | `gov_repo.agents` — all classification columns. | Registration wizard captures all required context fields. |
| Document the organisational roles, responsibilities, and decision-making authority for AI. | GOVERN 1.1 — Policies | `owner_user_id`, `technical_owner_id`, `created_by` all populated. | `gov_repo.agents.owner_user_id`; `gov_repo.agents.technical_owner_id`. | Owner assignment is mandatory at registration (`owner_user_id NOT NULL`). |
| Identify and document intended uses and reasonably foreseeable uses of AI systems. | MAP 1.5 — Use Context | `description`, `capabilities` (JSONB array), `agent_type`, `deployment_env`. | `gov_repo.agents.description`; `gov_repo.agents.capabilities`. | Capabilities documented during registration; reviewed at each version increment. |
| Maintain awareness of the AI lifecycle stage for deployed systems. | MANAGE 1.4 — Lifecycle | `status` reflects current lifecycle stage; `version` tracks iteration. | `gov_repo.agents.status` (7-value enum); `gov_repo.agents.version`. | Status transitions are governed events recorded to ledger. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Assets associated with information and information processing facilities shall be identified and an inventory of these assets shall be drawn up and maintained. | A.5.9 — Inventory of Information and Other Associated Assets | All agents registered with owner, classification, environment, and status. | `gov_repo.agents` — full inventory with `owner_user_id`, `data_classification` (via linked resources), `deployment_env`. | Annual asset inventory review; `updated_at` and ledger confirm currency. |
| Assets shall be returned, removed, adjusted or disposed of in accordance with organisational policy. | A.5.10 — Acceptable Use | `deployment_env` check constraint; `deployment_type` enforced. `status = 'decommissioned'` for retired agents. | `gov_repo.agents.deployment_env` (CHECK constraint); `gov_repo.agents.status`. | Decommission workflow; no hard-delete permitted (soft-delete to `decommissioned`). |
| Information and other assets shall be classified in accordance with the information security needs. | A.5.12 — Classification of Information | `ai_act_risk_class`, `risk_level` populated for every agent. | `gov_repo.agents.ai_act_risk_class`; `gov_repo.agents.risk_level`. | Classification set at registration; re-assessment triggered on material change to agent. |
| Roles and responsibilities for information security shall be defined and allocated. | A.5.2 — Information Security Roles | `owner_user_id` not null; `technical_owner_id` documented. | `gov_repo.agents.owner_user_id` (NOT NULL FK); `gov_repo.agents.technical_owner_id`. | Owner is mandatory field; orphan agent view `v_orphan_agents` surfaces gaps. |

---

---

## CG-AG-002 — Agent Owner

**Control definition:** Every registered agent must have an identified, accountable human owner (`owner_user_id NOT NULL`). Agents without an owner are a governance gap surfaced in real time.  
**Schema flag:** `gov_repo.agents.cg_ag_002_owner` (auto-set: `owner_user_id IS NOT NULL`)  
**Gap view:** `gov_repo.v_orphan_agents`  
**Compliance function:** `gov_repo.agent_compliance_gaps()` → `gap_cg_ag_002`

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Providers shall have a quality management system that allocates responsibilities for all phases of the AI system lifecycle. | Art. 17(1)(c) | Named individual with `owner_user_id` linked to `gov_repo.governance_users`. Owner's `full_name` and `email` queryable. | `gov_repo.agents.owner_user_id` FK → `gov_repo.governance_users`; `v_orphan_agents`; `v_ciso_agent_risk_lens.owner_name`. | Mandatory owner assignment at registration; ownership transfer workflow (M006 approval workflow). |
| Deployers of high-risk AI systems shall assign human oversight to appropriately skilled persons. | Art. 26(5) | `owner_user_id` and `technical_owner_id` both populated for high-risk agents; oversight level documented. | `gov_repo.agents.owner_user_id`; `gov_repo.agents.technical_owner_id`; `gov_repo.agents.oversight_level`. | Owner assigns oversight level; `cg_ag_007_oversight` flag validates oversight is appropriate for risk level. |
| Providers must designate authorised representatives and ensure accountability. | Art. 22 | Owner identity traceable through `governance_users` table. | `gov_repo.governance_users` joined via `owner_user_id`. | User identity management; ownership recorded to ledger on assignment or transfer. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Financial entities shall allocate responsibility for managing ICT risk at management body level and define clear roles and responsibilities. | Art. 5(4) | Each agent has a named owner. Ownership assignment is a ledger event. | `gov_repo.agents.owner_user_id`; `gov_repo.governance_ledger` — ownership assignment event. | Owner assignment during registration; escalation to management body for critical-risk agents. |
| ICT risk management framework must define accountability for ICT assets. | Art. 6(4) | `owner_user_id` NOT NULL constraint enforced at database level. | `gov_repo.agents.owner_user_id NOT NULL`. | DB constraint prevents agent creation without owner; application layer validates before insert. |
| Roles and responsibilities must be documented and communicated. | Art. 5(2) | `v_orphan_agents` view is zero rows for a compliant organisation. | `gov_repo.v_orphan_agents` — real-time orphan detection. | Automated alert when `v_orphan_agents` returns rows (notification engine, M008). |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| Top management shall ensure that responsibilities and authorities for relevant roles are assigned, communicated and understood. | 5.3 | Owner assigned and linked; owner's identity verifiable. | `gov_repo.agents.owner_user_id`; `gov_repo.governance_users.full_name`, `email`. | Role assignment workflow; AIMS responsibility matrix maintained alongside registry. |
| The organisation shall determine and provide the resources needed for the establishment, implementation, maintenance and improvement of the AIMS. | 7.1 | Owner has sufficient authority and resources (attested in governance record). | `gov_repo.agents.owner_user_id`; governance attestation record (M007). | Annual owner reconfirmation; ownership gap (`v_orphan_agents`) triggers remediation workflow. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Establish and maintain accountability structures and human oversight mechanisms for AI systems. | GOVERN 1.2 — Accountability | Named owner per agent; ownership is non-delegable without formal transfer. | `gov_repo.agents.owner_user_id NOT NULL`; `v_orphan_agents` monitors compliance. | Four-eyes ownership transfer workflow (M006). |
| Define and document roles, responsibilities, and decision-making authority for AI risk management. | GOVERN 1.1 — Policies | Owner role defined in `governance_users`; technical owner optional but tracked. | `gov_repo.agents.owner_user_id`; `gov_repo.agents.technical_owner_id`. | RACI matrix per agent type documented; owner is accountable party. |
| Establish processes for the ongoing oversight of AI systems throughout their lifecycle. | MANAGE 1.3 — Risk Response | Ownership continuity — ownership gaps surface immediately in `v_orphan_agents`. | `gov_repo.v_orphan_agents`; `gov_repo.agent_compliance_gaps()`. | Orphan detection → automated alert → escalation to department head within 5 business days. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Ownership of assets shall be assigned and maintained. | A.5.9 — Inventory (ownership dimension) | `owner_user_id` populated for 100% of non-decommissioned agents. | `gov_repo.agents.owner_user_id NOT NULL`; `gov_repo.v_orphan_agents` = 0 rows. | Owner assignment at registration; annual confirmation; orphan workflow for gaps. |
| Personnel and other interested parties shall be made aware of their responsibilities. | A.6.3 — Information Security Awareness | Owner notified of their agents via dashboard; CG-AG-002 compliance flag visible. | `gov_repo.v_ciso_agent_risk_lens.owner_email`; compliance dashboard (Talk-to-Governance, M008). | Owner receives notification on agent creation, risk reclassification, or compliance gap. |

---

---

## CG-AG-003 — Model Registration

**Control definition:** Every agent's AI model must be documented with at minimum `model_name` and `model_provider`. All external resources (models, tools, MCP servers, prompts, APIs) must be registered as `agent_resource_links`.  
**Schema flag:** `gov_repo.agents.cg_ag_003_model_reg` (auto-set: `model_name IS NOT NULL AND model_provider IS NOT NULL`)  
**Resource table:** `gov_repo.agent_resource_links`  
**Compliance function:** `gov_repo.agent_compliance_gaps()` → `gap_cg_ag_003`

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Technical documentation must include a detailed description of the elements of the AI system and the process for its development, including the training methodologies, techniques, and datasets used. | Art. 11 + Annex IV §2 | `model_name`, `model_version`, `model_provider`, `model_is_local`, `model_endpoint` all populated. Resource links include model type with version. | `gov_repo.agents.model_name`; `gov_repo.agents.model_version`; `gov_repo.agents.model_provider`; `gov_repo.agent_resource_links` where `resource_type = 'model'`. | Model registration at agent creation; version increment creates new resource link revision. |
| High-risk AI systems must meet requirements on accuracy, robustness, and cybersecurity throughout their lifecycle. | Art. 15 | Model provider identified; local/remote flag set (`model_is_local`); endpoint documented. | `gov_repo.agents.model_is_local`; `gov_repo.agents.model_endpoint`; `gov_repo.agent_resource_links.resource_provider`. | Data sovereignty check at registration: if `model_is_local = false` and data is PHI/PII, escalation triggered. |
| Providers shall ensure that the data used is relevant, representative and, to the best extent possible, free of errors. | Art. 10(2) | Training dataset documented (M007 gap); model version tracked for drift monitoring. | `gov_repo.agents.model_version`; `gov_repo.agent_resource_links.resource_version`. | Model version change → re-assessment workflow; training dataset registry (M007). |
| Technical documentation must describe the computational resources used. | Annex IV §2(g) | `model_endpoint`, `deployment_type`, `deployment_region` populated. | `gov_repo.agents.model_endpoint`; `gov_repo.agents.deployment_region`; `gov_repo.agents.deployment_type`. | Infrastructure registration during deployment; region recorded for data residency compliance. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| ICT asset register must include all software assets, including AI/ML models, their versions, and dependencies. | Art. 8(1)(b) | `model_name`, `model_version` on agents; all resource links registered. | `gov_repo.agents` model columns; `gov_repo.agent_resource_links` — complete resource inventory. | Asset discovery process; all new resource links require registration before agent goes active. |
| Financial entities must manage ICT third-party risk including all material third-party providers. | Art. 28(1) | `model_provider` identified; if third party, linked to `gov_repo.third_party_providers` (M006). | `gov_repo.agents.model_provider`; `gov_repo.agent_resource_links.resource_provider` → M006 FK. | Third-party registration workflow (M006); provider risk tier assessment before approval. |
| Financial entities must maintain up-to-date information on the configuration of ICT assets and their interconnections. | Art. 8(4) | Resource links maintained with `is_active` flag; deactivated links preserved with reason. | `gov_repo.agent_resource_links.is_active`; `gov_repo.agent_resource_links` — full history (no hard delete). | Resource change → update link record → ledger entry; deactivation records reason. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall identify and document the data and AI models used, including provenance, characteristics and intended use. | 8.4 (AI System Impact Assessment) | Model provenance: `model_name`, `model_version`, `model_provider`, `model_is_local`. | `gov_repo.agents` model columns; `gov_repo.agent_resource_links` resource inventory. | Impact assessment at agent creation; model provenance fields mandatory for high-risk agents. |
| The organisation shall assess and manage risks arising from the use of third-party AI components. | 6.1.3 | Third-party provider registered and risk-assessed; `resource_provider` linked to provider register (M006). | `gov_repo.agent_resource_links.resource_provider`; M006 `gov_repo.third_party_providers`. | Third-party risk assessment workflow; periodic re-assessment on contract renewal. |
| The organisation shall determine and document the objectives, purpose and context for each AI system. | 6.2 | Resource links document the function of each model/tool within the agent. | `gov_repo.agent_resource_links.resource_name`; `gov_repo.agent_resource_links.access_type`. | Resource link registration includes purpose documentation; reviewed at periodic audit. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Identify and document the AI system's components, including models, training data, and infrastructure. | MAP 2.1 — System Documentation | `model_name`, `model_version`, `model_provider`, `deployment_type`, `deployment_region` all populated. | `gov_repo.agents` model and deployment columns. | Model documentation is a mandatory gate in the registration workflow. |
| Document AI supply chain, including third-party components and their provenance. | MAP 2.3 — Supply Chain | All resource providers documented; `model_is_local` flag for sovereignty. | `gov_repo.agent_resource_links`; `gov_repo.agents.model_is_local`. | Supply chain inventory maintained; third-party providers reviewed at onboarding (M006). |
| Identify potential impacts of AI system components on accuracy and reliability. | MEASURE 2.1 — Testing | Model version documented to enable drift comparison; endpoint monitored. | `gov_repo.agents.model_version`; `gov_repo.agent_resource_links.resource_version`. | Model version change triggers performance re-evaluation (M008 MRM framework). |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Software to be used in the organisation shall be inventoried, assessed, and managed. | A.8.8 — Management of Technical Vulnerabilities | All models and tools registered; versions tracked; vulnerability status assessable per version. | `gov_repo.agent_resource_links.resource_version`; `gov_repo.agents.model_version`. | Model vulnerability alert → resource link review → version update or suspension. |
| Relationships with suppliers shall be managed to maintain an agreed level of information security. | A.5.19 — Information Security in Supplier Relationships | Third-party model providers registered with contractual and security assessment status (M006). | `gov_repo.agent_resource_links.resource_provider` → M006 `gov_repo.third_party_providers`. | Supplier onboarding security assessment; annual review of critical providers. |
| Configuration of information systems shall be established, documented, implemented and monitored. | A.8.9 — Configuration Management | Endpoint, version, access type documented for each resource link. | `gov_repo.agent_resource_links.resource_endpoint`; `gov_repo.agent_resource_links.access_type`. | Configuration change management; all changes recorded to ledger via trigger. |

---

---

## CG-AG-004 — Tool Authorisation

**Control definition:** Every tool and external resource accessed by an agent must be explicitly authorised before use. Authorisation status is tracked per resource link.  
**Schema flag:** `gov_repo.agent_resource_links.cg_ag_004_compliant` (per-link boolean)  
**Note:** No agent-level boolean flag; compliance is assessed at the resource link granularity.

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| High-risk AI systems must be designed to be overseen effectively by natural persons. Tools must not circumvent human control. | Art. 14(1) | `requires_approval = true` for tools that perform consequential actions; `access_type` is least-privilege. | `gov_repo.agent_resource_links.requires_approval`; `gov_repo.agent_resource_links.access_type`. | Tool authorisation review workflow; privileged access (`write`, `execute`, `admin`) requires explicit approval before activation. |
| Technical documentation must describe the measures taken to ensure the AI system is not used beyond intended purpose. | Annex IV §6 | `cg_ag_004_compliant = true` only after review; `access_type` matches intended use. | `gov_repo.agent_resource_links.cg_ag_004_compliant`; `gov_repo.agent_resource_links.access_type`. | Periodic access review; tool authorisation expiry (M006 — `next_review_date`). |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| ICT security policies must include access control, privileged access management, and least-privilege principles. | Art. 9(2)(b) | All tool links have `access_type` set; admin/write access justified and approved. | `gov_repo.agent_resource_links.access_type` enum (`read | write | execute | admin | read_write`). | Least-privilege review at tool registration; privileged access requires secondary approval (four-eyes, M006). |
| Financial entities must control access to ICT systems and data based on need-to-know and least-privilege. | Art. 9(2)(c) | `cg_ag_004_compliant` status documented; overdue reviews surfaced. | `gov_repo.agent_resource_links.cg_ag_004_compliant`; `gov_repo.agent_resource_links.next_review_date`. | Periodic access certification; `next_review_date < current_date` triggers review workflow. |
| Third-party tools must be subject to the same access control standards as internal tools. | Art. 28(5) | All third-party tools registered and assessed independently of the providing vendor's own claims. | `gov_repo.agent_resource_links`; `gov_repo.agent_resource_links.resource_provider`. | Third-party tool authorisation requires independent assessment regardless of provider certification. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall control the tools and techniques used in AI system development and operation. | 8.4 | All tools registered with access type and compliance status. | `gov_repo.agent_resource_links` with `resource_type IN ('tool','mcp_server','api')`; `cg_ag_004_compliant`. | Tool authorisation policy; tools not yet assessed have `cg_ag_004_compliant = false` and appear in gap reports. |
| The organisation shall assess and manage risks from AI system components. | 6.1.2 | `requires_approval` and `data_classification` set per tool; PII-processing tools identified. | `gov_repo.agent_resource_links.requires_approval`; `gov_repo.agent_resource_links.data_classification`; `gov_repo.agent_resource_links.processes_pii`. | Tools processing PII/PHI trigger enhanced review; `cg_ag_009_compliant` must also be set. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Identify, assess, and manage risks from AI components and the broader AI ecosystem, including tools and integrations. | MAP 3.5 — Risk from Components | All tools assessed; privileged tools have reviewed and approved access type. | `gov_repo.agent_resource_links.cg_ag_004_compliant`; `gov_repo.agent_resource_links.access_type`. | Component risk assessment embedded in tool authorisation workflow. |
| Establish processes to authorise changes to AI systems and their components. | MANAGE 2.2 — Risk Response | Tool additions and changes require authorisation workflow; `reviewed_by` and `last_reviewed_at` set. | `gov_repo.agent_resource_links.reviewed_by`; `gov_repo.agent_resource_links.last_reviewed_at`. | Change management: new tool → authorisation review → `cg_ag_004_compliant = true` → periodic recertification. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Access to information and other associated assets shall be restricted in accordance with the established access control policy. | A.8.3 — Information Access Restriction | Least-privilege `access_type` for all tool links; no unnecessary `admin` or `write` access. | `gov_repo.agent_resource_links.access_type`; periodic review records in `gov_repo.agent_resource_links.reviewed_by`. | Annual access review; excess privileges flagged; four-eyes approval for privileged access. |
| Privileged access rights shall be managed separately and reviewed regularly. | A.8.2 — Privileged Access Rights | `access_type IN ('admin','execute','write')` links require additional justification and approval. | `gov_repo.agent_resource_links.access_type`; `gov_repo.agent_resource_links.requires_approval = true`. | Privileged access justification mandatory; approval workflow (M006); quarterly recertification. |
| Secure configuration shall be established, documented, implemented and monitored. | A.8.9 — Configuration Management | Authorised configuration of tools documented; deviations detected via periodic review. | `gov_repo.agent_resource_links` full record; `cg_ag_004_compliant` flag current. | Configuration baseline at authorisation; drift detected on review cycle; changes to ledger. |

---

---

## CG-AG-005 — Prompt Governance

**Control definition:** Prompts used by agents must be registered, versioned, and assessed for robustness. Prompt injection risk and adversarial robustness must be evaluated before an agent is approved for production.  
**Schema flag:** `gov_repo.agent_resource_links.cg_ag_005_compliant` (per resource link where `resource_type = 'prompt'`)

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| High-risk AI systems must achieve appropriate levels of accuracy, robustness and cybersecurity, and resist attempts to alter their use or performance. | Art. 15(1) | All prompts registered as resource links; robustness assessment (`cg_ag_005_compliant`) completed. | `gov_repo.agent_resource_links` where `resource_type = 'prompt'`; `cg_ag_005_compliant`. | Prompt registration → robustness review → `cg_ag_005_compliant = true`; ADTEAM assessment (M008). |
| Providers must consider technical redundancy and error handling in the design of AI systems. | Art. 15(3) | Fallback prompts documented; `FALLBACK_TO` edges registered in agent graph for prompt-dependent agents. | `gov_repo.agent_edges` with `relationship_type = 'FALLBACK_TO'`; `gov_repo.agent_resource_links`. | Fallback design review at agent approval; fallback edge required for critical/high-risk agents. |
| Technical documentation must describe techniques and measures for achieving security and adversarial robustness. | Annex IV §6 | Adversarial test results recorded as evidence; `cg_ag_005_compliant` reflects completed testing. | `gov_repo.evidence` with `control_refs` including `CG-AG-005`; `gov_repo.agent_resource_links.cg_ag_005_compliant`. | Evidence attachment to resource link at review completion; stored in `gov_repo.evidence`. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| ICT security policies must protect AI and ML components against manipulation and adversarial inputs. | Art. 9(2) | Prompt injection risk assessed and documented; `cg_ag_005_compliant` set after assessment. | `gov_repo.agent_resource_links.cg_ag_005_compliant`; `gov_repo.evidence` linked to resource. | Security assessment of all prompts before production; reviewed after material prompt change. |
| Digital operational resilience testing must cover ICT systems, including AI components. | Art. 24(1) | Prompts included in TLPT scope for significant institutions; test results documented. | `gov_repo.agent_resource_links` with `resource_type = 'prompt'`; evidence artifacts (M007). | Annual resilience testing includes prompt robustness; results stored as evidence artifacts. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall control the methods and processes used to interact with AI systems, including input specifications. | 8.4 | All prompts registered and versioned; changes tracked. | `gov_repo.agent_resource_links` where `resource_type = 'prompt'`; `resource_version`. | Prompt version control; changes require re-assessment before activation. |
| The organisation shall implement controls to address AI-specific risks including input manipulation. | 6.1.2 (AI-specific risks) | Prompt injection risk documented in risk register; mitigating control `cg_ag_005_compliant` set. | `gov_repo.risk_entries` with `related_control_ids` including `CG-AG-005`; `gov_repo.agent_resource_links.cg_ag_005_compliant`. | Prompt risk entry in risk register; mitigation tracked to completion before production. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Evaluate AI system robustness, including adversarial testing of inputs. | MEASURE 2.5 — Robustness | Adversarial prompt tests documented; results stored as evidence. | `gov_repo.agent_resource_links.cg_ag_005_compliant`; `gov_repo.evidence.control_refs` includes `CG-AG-005`. | Red-team/adversarial test workflow → results to evidence table → `cg_ag_005_compliant = true`. |
| Identify, document and evaluate risks from AI system inputs and outputs. | MAP 3.5 — Risk from Inputs | Prompt-related risks in risk register; linked to agent and resource. | `gov_repo.risk_entries`; `gov_repo.agent_resource_links`. | Risk identification during agent design; prompt risk linked to agent risk entry. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Applications shall be protected against technical vulnerabilities, including injection attacks. | A.8.29 — Security Testing in Development and Acceptance | Prompt injection tests executed; results documented. | `gov_repo.evidence` with `control_refs = ['CG-AG-005']`; `gov_repo.agent_resource_links.cg_ag_005_compliant`. | Security testing checklist includes prompt injection; sign-off required before production. |
| Protection against malicious code and malicious inputs shall be implemented. | A.8.7 — Protection Against Malware | Prompts reviewed for adversarial content; version control prevents unauthorised changes. | `gov_repo.agent_resource_links.resource_version`; review records `reviewed_by`, `last_reviewed_at`. | Prompt change management; pre-production validation; code review equivalent for prompt content. |

---

---

## CG-AG-006 — MCP Server Governance

**Control definition:** All Model Context Protocol (MCP) server connections used by agents must be registered, classified, assessed for data governance compliance, and subject to periodic review.  
**Schema flag:** `gov_repo.agent_resource_links.cg_ag_006_compliant` (per MCP resource link)  
**Lens view:** `gov_repo.v_mcp_governance_lens`

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Technical documentation must describe all external components and interfaces of the AI system, including APIs and data sources. | Annex IV §2(b) | All MCP servers registered with `resource_ref`, `resource_name`, `resource_provider`, `resource_endpoint`. | `gov_repo.agent_resource_links` where `resource_type = 'mcp_server'`; `v_mcp_governance_lens`. | MCP registration before any agent connection is activated; unregistered connections are blocked. |
| Data governance measures must cover the data flows between the AI system and external components. | Art. 10(2)(e) | `data_classification`, `processes_pii`, `data_residency` all populated per MCP link. | `gov_repo.agent_resource_links.data_classification`; `processes_pii`; `processes_phi`; `data_residency`. | Data classification review at MCP registration; PII-carrying links require `cg_ag_009_compliant` also set. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Financial entities must contractually ensure that ICT third-party providers comply with security and performance standards. | Art. 30(1) | MCP provider registered in `third_party_providers` (M006); contract reference documented. | `gov_repo.agent_resource_links.resource_provider` → M006 `gov_repo.third_party_providers`; `cg_ag_006_compliant`. | Third-party MCP onboarding: contractual review → security assessment → `cg_ag_006_compliant = true`. |
| All material ICT third-party arrangements must be included in the register of information. | Art. 28(3) + Annex | MCP providers with critical function coverage listed in DORA register. | `gov_repo.v_mcp_governance_lens`; M006 third-party register matching DORA Annex format. | DORA register updated on MCP onboarding/offboarding; submitted to competent authority on request. |
| Financial entities must manage exit strategies for critical ICT providers. | Art. 28(8) | Exit plan documented for critical MCP providers; `deactivated_reason` available if link removed. | `gov_repo.agent_resource_links.deactivated_reason` (if link deactivated). | Exit strategy review as part of MCP governance cycle; fallback MCP registered for critical connections. |
| Concentration risk in ICT third-party providers must be assessed and monitored. | Art. 29 | Multiple agents using same MCP provider surfaced via `v_mcp_governance_lens`; count of dependent agents per provider. | `gov_repo.v_mcp_governance_lens.resource_provider`; aggregation across agents shows concentration. | Concentration risk report (M008); threshold triggers review if >30% of active agents use one provider. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall identify and evaluate the risks from external AI components and data sources. | 6.1.3 | MCP servers assessed; risk tier from provider register; `cg_ag_006_compliant` documents completion. | `gov_repo.agent_resource_links.cg_ag_006_compliant`; M006 `gov_repo.third_party_providers.risk_tier`. | External component risk assessment; MCP providers rated by risk tier; reassessed annually. |
| The organisation shall control changes to AI systems and their components to prevent adverse impacts. | 8.4 | MCP version changes require re-assessment; `next_review_date` enforced. | `gov_repo.agent_resource_links.resource_version`; `next_review_date`; `last_reviewed_at`. | MCP version change → re-assessment → updated `cg_ag_006_compliant` and review date. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Identify risks from AI system integrations, APIs, and external data sources throughout the AI lifecycle. | MAP 3.5 — Risk from Components | All MCP servers in `agent_resource_links`; risk links to `risk_entries`. | `gov_repo.agent_resource_links` (`resource_type = 'mcp_server'`); `gov_repo.risk_entries`. | MCP risk identification at integration; risk entry created; mitigation tracked to `cg_ag_006_compliant`. |
| Establish processes for monitoring AI system behaviour in context, including third-party components. | MEASURE 2.8 — Monitoring | Overdue MCP reviews detected: `v_mcp_governance_lens.review_overdue = true`. | `gov_repo.v_mcp_governance_lens.review_overdue`; `next_review_date < current_date`. | Automated alert on review overdue; owner escalation; `cg_ag_006_compliant` set to false until reviewed. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Supplier relationships shall be managed to ensure secure access to organisational systems. | A.5.20 — Addressing Security Within Supplier Agreements | MCP provider agreement documented; security requirements contractually binding (M006). | `gov_repo.agent_resource_links.resource_provider` → M006 provider register; `cg_ag_006_compliant`. | Supplier security agreement review at MCP onboarding; annual reconfirmation. |
| Information security requirements for cloud and externally hosted services shall be defined and implemented. | A.5.23 — Information Security for Use of Cloud Services | MCP endpoints classified; data residency documented; PII/PHI flags set. | `gov_repo.agent_resource_links.data_residency`; `processes_pii`; `data_classification`. | Cloud/external service classification policy; data residency check enforced at registration. |
| Access to networks and network services shall be controlled. | A.8.20 — Networks Security | MCP connections registered; unregistered connections are a policy violation. | `gov_repo.v_mcp_governance_lens` — complete registered MCP inventory. | Network security policy requires all MCP connections to be pre-registered; audit detects unregistered connections. |

---

---

## CG-AG-007 — Human Oversight

**Control definition:** Every agent must have an appropriate human oversight level assigned, calibrated to its risk level. High-risk and critical agents require at minimum `l2_human_review`. Autonomous agents (`agent_type = 'autonomous'`) require `l3_human_approval` or `l4_human_in_loop`.  
**Schema flag:** `gov_repo.agents.cg_ag_007_oversight` (auto-set by trigger; logic: `oversight_level IS NOT NULL AND (risk_level = 'low' OR oversight_level IN ('l2_human_review','l3_human_approval','l4_human_in_loop'))`)  
**Compliance function:** `gov_repo.agent_compliance_gaps()` → `gap_cg_ag_007`

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| High-risk AI systems shall be designed and developed to be effectively overseen by natural persons during the period of use. Oversight measures must be built in by design. | Art. 14(1) | `oversight_level` populated and appropriate for risk level; `cg_ag_007_oversight = true`. | `gov_repo.agents.oversight_level` enum; `gov_repo.agents.cg_ag_007_oversight`; `v_ciso_agent_risk_lens.gap_oversight`. | Oversight level assigned at registration; validated by trigger; gap view alerts CISO on misalignment. |
| Persons responsible for human oversight must have the necessary authority, competence, and resources to fulfil their role. | Art. 14(4) | Oversight person identified (via `owner_user_id` or dedicated oversight FK in M006); competency attested. | `gov_repo.agents.owner_user_id`; M006 oversight assignment table. | Oversight role assignment; competency attestation record (M007). |
| High-risk AI systems must allow oversight persons to understand the capabilities and limitations of the system. | Art. 14(4)(a) | Agent `description`, `capabilities` (JSONB), risk classification documented and accessible. | `gov_repo.agents.description`; `gov_repo.agents.capabilities`; `gov_repo.agents.ai_act_risk_class`. | Agent profile page (Talk-to-Governance UI, M008) surfaces capabilities and limitations to oversight person. |
| High-risk AI systems must allow oversight persons to disregard, override, or intervene in the system's operation. | Art. 14(4)(d) | Intervention log exists (M007 gap: `gov_repo.oversight_interventions`); suspension workflow available. | `gov_repo.agents.status` can be set to `suspended` with `suspended_reason`; M007 intervention log. | Suspension workflow: oversight person → `status = 'suspended'` → `suspended_reason` recorded → ledger event. |
| Fully automated AI systems processing personal data and producing legal or similarly significant effects require specific safeguards. | Art. 14(5) | Autonomous agents (`agent_type = 'autonomous'`) require `l3_human_approval` or `l4_human_in_loop`. | `gov_repo.agents.agent_type = 'autonomous'`; `gov_repo.agents.oversight_level`; `cg_ag_012_autonomous_governed`. | Autonomous agent registration enforces elevated oversight; trigger validates alignment. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| The management body shall be actively involved in ICT risk management and bear ultimate responsibility. | Art. 5(4) | Management body oversight of critical/high-risk agents documented; `l3_human_approval` or above required. | `gov_repo.agents.oversight_level` for `risk_level IN ('critical','high')`; `v_ciso_agent_risk_lens`. | Escalation policy: critical agents require board-level accountability; CISO lens surfaces gaps. |
| Financial entities shall put in place human oversight mechanisms for ICT operations. | Art. 9(3) | `oversight_level` set and appropriate; no active production agents with `l1_automated` at critical/high risk. | `gov_repo.agents.oversight_level`; `gov_repo.agents.risk_level`; `cg_ag_007_oversight`. | Compliance dashboard alert when `oversight_level = 'l1_automated'` and `risk_level IN ('critical','high')`. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall implement appropriate controls to ensure humans can understand, monitor and intervene in AI system operation. | 8.4 (Human Oversight) | `oversight_level` appropriate for agent risk; suspension mechanism available. | `gov_repo.agents.oversight_level`; `gov_repo.agents.status` suspension mechanism. | Human oversight design review at agent approval; oversight level reviewed at risk reclassification. |
| The organisation shall define and document roles with responsibility for oversight of AI systems. | 5.3 | Oversight responsibility documented per agent; owner is default oversight responsible party. | `gov_repo.agents.owner_user_id`; oversight responsibility in `governance_users` role definition. | Role definition in AIMS; oversight responsibility explicitly assigned at agent creation. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Establish meaningful human oversight mechanisms for AI systems with potential for significant impacts. | GOVERN 1.2 — Accountability | `oversight_level` calibrated to impact potential: autonomous → `l3`/`l4`; critical risk → `l3`/`l4`. | `gov_repo.agents.oversight_level`; `gov_repo.agents.agent_type`; `gov_repo.agents.risk_level`. | Impact-based oversight calibration policy; `cg_ag_007_oversight` auto-validates calibration. |
| Implement processes that allow for human review of consequential AI decisions before or after they are made. | MANAGE 2.4 — Human Review | Oversight level determines whether human reviews output (`l2`), approves actions (`l3`), or participates in decisions (`l4`). | `gov_repo.agents.oversight_level` enum with 4 levels. | Oversight level drives application behaviour; compliance flag confirms oversight is designed in. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Information security controls shall ensure that automated systems can be overridden by authorised personnel. | A.8.15 — Logging (override events) | Suspension and override events logged; `status` change to `suspended` is a traceable event. | `gov_repo.agents.suspended_at`; `gov_repo.agents.suspended_reason`; `gov_repo.governance_ledger`. | Override/suspension is a ledger event; two-person confirmation for critical agent suspension (M006 four-eyes). |
| Information systems shall have defined roles for their operation, monitoring and control. | A.5.2 — Information Security Roles | Oversight role assignment documented; gap (`gap_oversight`) is a reportable metric. | `gov_repo.agents.oversight_level`; `v_ciso_agent_risk_lens.gap_oversight`. | Annual oversight role review; gaps reported to CISO within defined SLA. |

---

---

## CG-AG-008 — Audit Trail

**Control definition:** Agent activities and all governance state changes must be captured in an immutable, append-only audit ledger for the duration of the agent's operational life and for the mandatory retention period thereafter.  
**Schema flag:** `gov_repo.agents.cg_ag_008_audit_trail` (declared; **not auto-set by current trigger** — requires application-layer or separate migration)  
**Note:** `gov_repo.governance_ledger` is the implementing table (not yet fully defined in delivered migrations — Gap G-03).

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| High-risk AI systems must have automatic logging capabilities that allow for reconstruction of the chronology of events. | Art. 12(1) | Every governance state change written to `governance_ledger` with `event_type`, `actor_id`, `timestamp`, and prior/new state. | `gov_repo.governance_ledger` (to be fully defined in M006); `gov_repo.agents.ledger_entry_seq`. | Every agent mutation triggers ledger write (application layer + M006 ledger table definition). |
| Logs must be retained for minimum 6 months after the system ceases operation for non-GPAI high-risk systems. | Art. 12(2) | Retention policy enforced; `decommissioned` agents' ledger entries preserved; purge policy ≥ 6 months. | `gov_repo.governance_ledger` — retention policy (M006); soft-delete status on agents. | Decommission workflow: agent → `decommissioned` status → ledger retention policy starts; no purge before 6 months. |
| Providers must keep logs for high-risk AI systems for a period of at least 10 years. | Art. 12(3) (GPAI with systemic risk) | GPAI-flagged agents: ledger entries held for 10 years. | `gov_repo.governance_ledger` — per-tenant retention override (M006); GPAI classification (M007). | GPAI classification (M007) triggers 10-year retention policy override in ledger configuration. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Financial entities shall implement ICT logging and monitoring capabilities to detect anomalous activities and generate alerts. | Art. 10(1) | All agent lifecycle events logged; anomaly detection integration point (M008). | `gov_repo.governance_ledger`; `gov_repo.agents.ledger_entry_seq`. | Event → ledger → anomaly detection engine (M008); SIEM export (M009 on-prem). |
| Logs must be protected from unauthorised access and modification. | Art. 10(2) | `governance_ledger` is append-only; no UPDATE or DELETE permitted; access controlled via RLS. | `gov_repo.governance_ledger` — append-only design (M006); RLS policies. | DB policy prevents modification; application layer has no UPDATE/DELETE permission on ledger. |
| Financial entities must retain logs for a minimum of 5 years. | Art. 10(3) | Retention policy ≥ 5 years; purge audit trail confirms retention compliance. | `gov_repo.governance_ledger` — retention configuration (M006). | Scheduled retention audit; purge process requires compliance sign-off before executing. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall retain documented information as evidence of the conformance of the AIMS. | 9.1 | All governance decisions recorded with actor, timestamp, rationale. | `gov_repo.governance_ledger`; `gov_repo.evidence` table. | Evidence capture workflow: governance decision → evidence record → linked to control assessment. |
| The organisation shall monitor, measure, analyse and evaluate the performance of the AIMS. | 9.1 | Performance metrics and governance event history available for analysis. | `gov_repo.governance_ledger` — event history; M008 performance metrics table. | Periodic AIMS performance review uses ledger-based analytics. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Maintain records of AI risk management decisions, actions, and outcomes throughout the AI lifecycle. | MANAGE 4.1 — Record Keeping | Complete ledger of governance events: registrations, approvals, risk changes, exceptions, incidents. | `gov_repo.governance_ledger`; `gov_repo.agents.ledger_entry_seq`. | All governance workflows write to ledger as final step; no governance action is complete without a ledger entry. |
| Establish audit and accountability mechanisms for AI system operations. | GOVERN 6.1 — Accountability | Ledger is immutable; every entry has `actor_id`; non-repudiation guaranteed. | `gov_repo.governance_ledger` — append-only, actor-attributed (M006). | Audit workflow queries ledger for any governance event within a time window; no manual log editing possible. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Event logs recording user activities, exceptions, faults and information security events shall be produced, kept and regularly reviewed. | A.8.15 — Logging | All agent governance events logged; logs reviewed periodically. | `gov_repo.governance_ledger`; SIEM integration (M009). | Log review workflow; automated anomaly detection (M008); SIEM forwarding for on-prem deployments. |
| Logging facilities and log information shall be protected against tampering and unauthorised access. | A.8.15 — Log Protection | Ledger is append-only at DB level; RLS restricts read access by organisation. | `gov_repo.governance_ledger` — append-only design; RLS on table. | Integrity monitoring: hash-chain on ledger entries (M006); alert on any detected modification attempt. |
| Logs shall be retained for a defined period and protected from modification. | A.8.15 — Retention | Retention policy documented and technically enforced. | `gov_repo.governance_ledger` — retention configuration (M006). | Retention policy set at tenant provisioning; compliance evidence generated annually. |

---

---

## CG-AG-009 — Data Governance

**Control definition:** Every agent edge or resource link that carries or processes PII, PHI, or financial data must undergo a mandatory data governance review. Flags `carries_pii`, `carries_phi`, `carries_financial` on edges and `processes_pii`, `processes_phi`, `processes_financial` on resource links trigger this review.  
**Schema flags:** `gov_repo.agent_resource_links.cg_ag_009_compliant`; `gov_repo.agent_edges.carries_pii/phi/financial`  
**Lens view:** `gov_repo.v_mcp_governance_lens.cg_ag_009_compliant`

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Training, validation and testing data sets shall be subject to appropriate data governance and management practices. | Art. 10(2) | Data classification set on all resource links; PII/PHI/financial flags populated. | `gov_repo.agent_resource_links.data_classification`; `processes_pii`; `processes_phi`; `processes_financial`. | Data classification review at resource link creation; PII flag triggers DPIA workflow (M007). |
| Data sets must be relevant, representative and free of errors. Governance measures must cover data collection, processing and use. | Art. 10(3) | `cg_ag_009_compliant = true` evidences completed data governance review; data residency documented. | `gov_repo.agent_resource_links.cg_ag_009_compliant`; `gov_repo.agent_resource_links.data_residency`. | Data governance review: classification → residency check → PII/PHI assessment → `cg_ag_009_compliant = true`. |
| Providers must implement data governance measures that cover the examination of biases that might affect health, safety or fundamental rights. | Art. 10(5) | Bias assessment documented as evidence artifact linked to `cg_ag_009_compliant` resource links. | `gov_repo.evidence` with `control_refs = ['CG-AG-009']`; `gov_repo.agent_resource_links.cg_ag_009_compliant`. | Bias review workflow (M007); evidence attached to resource link governance record. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| ICT security policies must cover data security, including classification, handling, and processing policies. | Art. 9(2)(d) | All agent edges and resource links have `data_classification` set; PII-carrying edges indexed. | `gov_repo.agent_edges.data_classification`; `gov_repo.agent_resource_links.data_classification`; `idx_agent_edges_pii`. | Data classification policy enforced at edge/link creation; override requires justification. |
| Financial entities must ensure data integrity and confidentiality in ICT operations. | Art. 9(2)(e) | `carries_pii/phi/financial` on edges triggers mandatory review; `cg_ag_009_compliant` documents completion. | `gov_repo.agent_edges.carries_pii`; `gov_repo.agent_resource_links.cg_ag_009_compliant`. | Data flow risk review: edge creation with PII flag → review workflow → `cg_ag_009_compliant` on linked resource. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall identify and manage the risks to personal data and privacy arising from AI systems. | 8.3 (Data Governance) | DPIA completed for high-risk PII-processing agents; `cg_ag_009_compliant` evidences review. | `gov_repo.agent_resource_links.processes_pii`; `cg_ag_009_compliant`; M007 `gov_repo.dpias`. | DPIA trigger: `processes_pii = true` + `risk_level IN ('high','critical')` → DPIA workflow launched. |
| The organisation shall establish controls to ensure data quality, relevance and representativeness for AI systems. | 8.4 | Data quality criteria documented; `data_residency` enforced for regulated data. | `gov_repo.agent_resource_links.data_residency`; `gov_repo.agent_resource_links.data_classification`. | Data quality assessment at resource link review; residency validation automated against agent's `deployment_region`. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Identify and document data used by the AI system, including provenance, quality, and governance status. | MAP 2.1 — Data | Data classification and PII/PHI/financial flags documented per resource link and edge. | `gov_repo.agent_edges.carries_pii`; `gov_repo.agent_resource_links.processes_pii`; `data_classification`. | Data inventory maintained via resource links; periodic data governance review cycle. |
| Evaluate and address privacy risks associated with AI systems and their data practices. | MAP 3.5 — Privacy | Privacy impact assessment (`cg_ag_009_compliant`) completed for PII-processing agents. | `gov_repo.agent_resource_links.cg_ag_009_compliant`; `gov_repo.v_mcp_governance_lens.processes_pii`. | Privacy risk assessment embedded in data governance workflow; DPIA result linked as evidence. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Privacy and protection of personally identifiable information shall be ensured as required by relevant legislation. | A.5.34 — Privacy and Protection of PII | `processes_pii` and `carries_pii` flags populated; DPIA completed for high-risk PII flows. | `gov_repo.agent_resource_links.processes_pii`; `gov_repo.agent_edges.carries_pii`; M007 DPIA records. | PII detection triggers DPIA workflow (M007); DPIA completion required before `cg_ag_009_compliant = true`. |
| Information shall be classified and handled in accordance with the organisation's classification scheme. | A.5.12 — Classification | `data_classification` enum used consistently across edges and resource links. | `gov_repo.agent_edges.data_classification`; `gov_repo.agent_resource_links.data_classification`. | Classification scheme enforced at data entry; overrides require justification and approval. |
| Regulations applicable to cryptography and data transfers shall be identified and complied with. | A.5.31 — Legal, Statutory Requirements | `data_residency` field enforces geographic data processing constraints. | `gov_repo.agent_resource_links.data_residency`; `gov_repo.agents.model_is_local`. | Residency validation: data_residency checked against applicable regulatory requirements; non-compliant links blocked. |

---

---

## CG-AG-010 — Risk Classification

**Control definition:** Every agent must be assigned both a `risk_level` (operational risk: critical/high/medium/low) and an `ai_act_risk_class` (regulatory classification: unacceptable/high/limited/minimal). Classification drives conformity assessment requirements, oversight level calibration, and risk propagation calculations.  
**Schema flag:** `gov_repo.agents.cg_ag_010_classified`  
**Supporting tables:** `gov_repo.agent_risk_propagation`; `gov_repo.conformity_assessments`  
**Compliance function:** `gov_repo.agent_compliance_gaps()` → `gap_cg_ag_010`

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Providers must implement a risk management system for high-risk AI systems that is iterative and covers all phases of the lifecycle. | Art. 9(1) | Risk management lifecycle: `risk_level` assigned → risk entry created → mitigation documented → residual risk assessed. | `gov_repo.agents.risk_level`; `gov_repo.risk_entries`; `gov_repo.agent_risk_propagation`. | Risk assessment workflow: classification → `risk_entries` creation → mitigation tracking → residual risk acceptance. |
| AI systems in Annex III use cases shall be classified as high-risk by default. | Art. 6 + Annex III | `ai_act_risk_class = 'high'` for any agent operating in Annex III domains (credit, employment, education, law enforcement, etc.). | `gov_repo.agents.ai_act_risk_class`; `gov_repo.agents.business_domain`. | AI Act classification checklist at registration; Annex III domain mapping forces `ai_act_risk_class = 'high'`. |
| Providers of high-risk AI systems must carry out a conformity assessment before placing them on the market. | Art. 43 | Conformity assessment completed and referenced; `conformity_assessment_id` populated. | `gov_repo.agents.conformity_assessment_id` → `gov_repo.conformity_assessments`; `eu_ai_db_registered`. | Conformity assessment workflow: triggered automatically when `ai_act_risk_class = 'high'` is set at classification. |
| Prohibited AI systems must not be deployed. | Art. 5 | `ai_act_risk_class = 'unacceptable'` agents cannot have `status = 'active'`. | `gov_repo.agents.ai_act_risk_class`; `gov_repo.agents.status`. | Hard constraint (application layer): `unacceptable` classification blocks activation; requires regulatory review and exception (M006). |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Financial entities shall define risk appetite for ICT risks and maintain a risk assessment framework. | Art. 5(9) | `risk_level` classification aligned with ICT risk appetite; critical agents require board awareness. | `gov_repo.agents.risk_level`; `gov_repo.agents.ai_act_risk_class`; M006 risk appetite framework. | Risk appetite framework (M006) sets thresholds; classification validated against thresholds at registration and review. |
| ICT assets supporting critical or important functions shall be identified and their risk managed. | Art. 8(2) | Agents supporting critical functions classified at minimum `risk_level = 'high'`; propagation paths documented. | `gov_repo.agents.risk_level`; `gov_repo.agent_risk_propagation`; `v_risk_propagation_chains`. | Critical function mapping at registration; risk propagation recomputed on graph changes. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall assess the risks and opportunities associated with the context of the AIMS. | 6.1.1 | Risk classification documented per agent; AI Act class and operational risk both set. | `gov_repo.agents.risk_level`; `gov_repo.agents.ai_act_risk_class`; `cg_ag_010_classified`. | Initial risk assessment at registration; mandatory review at: version change, deployment change, incident. |
| The organisation shall conduct an impact assessment for high-impact AI systems. | 8.4 | Conformity assessment linked for high-risk agents; impact documented in `risk_entries`. | `gov_repo.agents.conformity_assessment_id`; `gov_repo.risk_entries`; `gov_repo.agent_risk_propagation`. | Impact assessment workflow: classification → impact scoring → `agent_risk_propagation` recomputation. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Categorise AI risks based on potential impact, probability, and the context of use. | MAP 1.5 — Risk Categorisation | `risk_level`, `ai_act_risk_class`, `agent_type` all populated; `cg_ag_010_classified = true`. | `gov_repo.agents.risk_level`; `gov_repo.agents.ai_act_risk_class`; `gov_repo.agents.agent_type`. | Risk categorisation matrix applied at registration; reviewed annually and after material change. |
| Assess AI risks in terms of likelihood and impact, including cascading effects across systems. | MEASURE 2.2 — Risk Assessment | `agent_risk_propagation` computes cascading risk; `impact_score` and `criticality` documented. | `gov_repo.agent_risk_propagation.impact_score`; `gov_repo.agent_risk_propagation.criticality`; `v_risk_propagation_chains`. | Risk propagation recomputed on every graph change; `financial_impact_eur` enables quantitative risk reporting. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Information security risks shall be identified, assessed and treated according to defined criteria. | 6.1.2 — Information Security Risk Assessment | AI agents classified as information assets; risk assessment documented in `risk_entries`. | `gov_repo.agents.risk_level`; `gov_repo.risk_entries`; `gov_repo.agent_risk_propagation`. | IS risk assessment integrated with AI risk classification; unified risk register. |
| Information shall be classified in terms of legal requirements, value, criticality and sensitivity. | A.5.12 — Classification | `risk_level` and `ai_act_risk_class` both applied; classification criteria documented. | `gov_repo.agents.risk_level`; `gov_repo.agents.ai_act_risk_class`. | Classification criteria published; consistent application enforced; periodic reclassification review. |

---

---

## CG-AG-011 — Agent-to-Agent Governance

**Control definition:** All agent-to-agent relationships must be explicitly registered in `gov_repo.agent_edges` before any agent enters production. No undocumented agent-to-agent communication is permitted. Edges carry data classification, PII/PHI flags, and approval status.  
**Schema:** `gov_repo.agent_edges` (the entire table implements this control)  
**Note:** No boolean flag on `gov_repo.agents`; compliance assessed at edge level and via graph traversal.

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Technical documentation must describe the architecture of the AI system and the interactions between components. | Annex IV §2(b) | All inter-agent edges registered with `relationship_type`, `direction`, `weight`. Graph fully documented. | `gov_repo.agent_edges`; `gov_repo.agent_graph_traverse()` — full graph queryable. | Graph registration at system design; all edges approved before production deployment. |
| The risk management system must address risks from interactions between the AI system and its operational environment, including other AI systems. | Art. 9(2)(b) | Risk propagation computed across agent graph; high-impact edges identified. | `gov_repo.agent_risk_propagation`; `gov_repo.agent_edges.weight`; `v_risk_propagation_chains`. | Risk propagation recomputed when edges are added/modified; high-impact edges trigger risk review. |
| Providers must document how their AI system interacts with other AI systems and tools. | Art. 11 + Annex IV §2(c) | All `CALLS_AGENT`, `DELEGATES_TO`, `ORCHESTRATES` edges documented with approval status. | `gov_repo.agent_edges.relationship_type`; `gov_repo.agent_edges.approved_by`; `gov_repo.agent_edges.approved_at`. | Edge registration workflow: design → review → approval (four-eyes, M006) → activation. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Financial entities must identify and document all dependencies between ICT systems and services, including internal dependencies. | Art. 8(6) | All agent-to-agent dependencies registered; cycle detection via `agent_graph_traverse`. | `gov_repo.agent_edges`; `gov_repo.agent_graph_traverse()` — dependency graph. | Dependency discovery process; all new agent connections require edge registration before activation. |
| Single points of failure and systemic risk concentrations must be identified and managed. | Art. 8(6) + Art. 29 | Agents with high `inbound_edges` count identified as concentration points; risk propagation from them computed. | `v_ciso_agent_risk_lens.inbound_edges`; `gov_repo.agent_risk_propagation.agents_in_chain`. | Concentration risk analysis using graph traversal; agents with >N inbound edges flagged for resilience review. |
| Operational resilience must account for interdependencies between ICT components. | Art. 11(5) | Complete dependency graph enables RTO/RPO analysis; cascading failure paths documented. | `gov_repo.agent_risk_propagation.propagation_path`; `gov_repo.agent_risk_propagation.propagation_type = 'cascading'`. | Resilience analysis using propagation paths; cascading risk paths reviewed in business continuity planning. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall identify and manage the interactions between AI systems and the broader system of which they are a part. | 6.1.2 | All inter-agent interactions registered; no undocumented connections. | `gov_repo.agent_edges` — complete registered edge inventory; `is_active` flag lifecycle. | System integration policy: new connection requires edge registration; production gate blocks unregistered connections. |
| The organisation shall assess how AI system components affect each other's performance and safety. | 8.4 | Edge weights document dependency criticality; risk propagation quantifies cascading effects. | `gov_repo.agent_edges.weight`; `gov_repo.agent_risk_propagation.impact_score`. | Interaction impact assessment at edge registration; propagation recomputed to validate risk change. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Identify and assess risks from AI system interactions with other systems, services, and entities. | MAP 3.5 — Systemic Risk | All agent interactions registered; systemic risk quantified via propagation engine. | `gov_repo.agent_edges`; `gov_repo.agent_risk_propagation`; `v_risk_propagation_chains`. | Systemic risk review: graph traversal from any high-risk agent; cascading paths reviewed by risk officer. |
| Establish processes for monitoring AI system behaviour in context, including multi-agent interactions. | MEASURE 2.8 | Edge `sla_ms` and `max_calls_per_minute` enable SLA monitoring; active edge count tracked. | `gov_repo.agent_edges.sla_ms`; `gov_repo.agent_edges.max_calls_per_minute`; `gov_repo.agent_edges.is_active`. | SLA monitoring integration (M008); SLA breach → `is_active = false` with `deactivated_reason`. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| All connections between information processing systems shall be managed and controlled. | A.8.20 — Networks Security | No unregistered inter-agent connections; all edges explicitly approved. | `gov_repo.agent_edges.approved_by`; `gov_repo.agent_edges.approved_at`; `constraint agent_edges_unique`. | Connection approval workflow: new edge → review → four-eyes approval (M006) → `approved_by` populated. |
| Transfers of information shall be subject to agreements covering security requirements and data classification. | A.5.14 — Information Transfer | `data_classification`, `carries_pii/phi/financial` set on every edge; data governance reviewed. | `gov_repo.agent_edges.data_classification`; `gov_repo.agent_edges.carries_pii`; `cg_ag_009_compliant` on linked resource. | Information transfer assessment at edge creation; PII-carrying edges require CG-AG-009 data governance review. |

---

---

## CG-AG-012 — Autonomous Agent Governance

**Control definition:** Agents operating without human intervention (`agent_type = 'autonomous'`) are subject to mandatory enhanced governance. They require elevated oversight (`l3_human_approval` or `l4_human_in_loop`), must pass autonomous agent governance review (`cg_ag_012_autonomous_governed = true`), and are subject to enhanced risk propagation tracking.  
**Schema flag:** `gov_repo.agents.cg_ag_012_autonomous_governed`  
**Compliance function:** `gov_repo.agent_compliance_gaps()` → `gap_cg_ag_012`  
**Supporting table:** `gov_repo.agent_risk_propagation` (co-cited with CG-AG-010)

---

### EU AI Act

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| High-risk AI systems that take decisions or actions without human intervention must have built-in oversight measures. | Art. 14(4)(d) | `agent_type = 'autonomous'` requires `oversight_level IN ('l3_human_approval','l4_human_in_loop')`; `cg_ag_012_autonomous_governed = true`. | `gov_repo.agents.agent_type`; `gov_repo.agents.oversight_level`; `gov_repo.agents.cg_ag_012_autonomous_governed`. | Autonomous agent registration gate: oversight level validation before `approved_for_production = true`. |
| The risk management system must specifically address risks from AI systems that operate autonomously. | Art. 9(2) | Risk entries specifically addressing autonomous operation risks; risk propagation paths computed. | `gov_repo.risk_entries` with autonomous-specific risk entries; `gov_repo.agent_risk_propagation`; `impact_score`. | Risk assessment for autonomous agents includes autonomous-specific risk taxonomy; mitigation documented. |
| AI systems making decisions with significant effects on persons must provide meaningful explanations. | Art. 13(3)(b) | Explainability capability documented in `capabilities` (JSONB); transparency level documented. | `gov_repo.agents.capabilities` — explainability entry; `gov_repo.agents.description`. | Explainability review at autonomous agent approval; explainability gap → `gap_cg_ag_012 = true`. |
| Systems producing decisions without human involvement must be subject to post-market surveillance. | Art. 72(2) | Post-market surveillance plan documented; surveillance events recorded (M008). | `gov_repo.agents.cg_ag_012_autonomous_governed`; M008 `gov_repo.surveillance_events`. | Surveillance plan created at approval of autonomous agent; M008 surveillance events link to this agent. |

---

### DORA

| Requirement | Article / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Financial entities must ensure that ICT systems, including autonomous AI systems, can be controlled and can be intervened in or shut down. | Art. 9(3) | Kill-switch mechanism: `status = 'suspended'` immediately disables agent; suspension logged. | `gov_repo.agents.status` (`suspended` value); `gov_repo.agents.suspended_reason`; `gov_repo.agents.suspended_at`. | Emergency suspension workflow: any authorised person can suspend; four-eyes required for reactivation (M006). |
| Operational resilience of critical functions must account for the failure modes of automated decision-making systems. | Art. 11 | Autonomous agent failure modes documented in risk entries; fallback edges registered in graph. | `gov_repo.risk_entries`; `gov_repo.agent_edges` with `relationship_type = 'FALLBACK_TO'`; `gov_repo.agent_risk_propagation`. | Resilience review: autonomous agents must have registered fallback; missing fallback → `gap_cg_ag_012 = true`. |

---

### ISO/IEC 42001:2023

| Requirement | Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------|-------------------|--------------------|--------------------|
| The organisation shall implement controls commensurate with the risk and autonomy level of AI systems. | 8.4 | Enhanced controls documented for autonomous agents: elevated oversight, fallback, monitoring. | `gov_repo.agents.agent_type`; `gov_repo.agents.oversight_level`; `gov_repo.agents.cg_ag_012_autonomous_governed`. | Autonomous agent control checklist: minimum 6 controls required before `cg_ag_012_autonomous_governed = true`. |
| The organisation shall implement human oversight controls appropriate to the potential impact of AI system decisions. | 8.4 (Human Oversight sub-clause) | `oversight_level` at `l3` or `l4` for autonomous agents; documented rationale if `l4` not used. | `gov_repo.agents.oversight_level`; rationale in `gov_repo.exceptions` if reduced oversight granted. | Exception process for oversight level below `l4` on autonomous agents; CISO sign-off required. |

---

### NIST AI RMF 1.0

| Requirement | Function / Category | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|--------------------|--------------------|--------------------|--------------------|
| Establish meaningful human controls for AI systems that act autonomously or make consequential decisions without direct human involvement. | GOVERN 1.2 — Accountability | `cg_ag_012_autonomous_governed = true`; oversight level `l3` or `l4`; intervention mechanism documented. | `gov_repo.agents.cg_ag_012_autonomous_governed`; `gov_repo.agents.oversight_level`; suspension workflow. | Autonomous agent governance review: ownership → oversight → fallback → monitoring → evidence → approval. |
| Evaluate the appropriateness of AI system autonomy given the potential impacts and context of deployment. | MAP 1.6 — Autonomy Assessment | Autonomy level (`agent_type = 'autonomous'`) justified against business need; risk level commensurate. | `gov_repo.agents.agent_type`; `gov_repo.agents.risk_level`; `gov_repo.agents.ai_act_risk_class`. | Autonomy justification review at registration: autonomous classification requires documented business case and risk sign-off. |
| Establish monitoring and response processes for AI systems acting autonomously. | MANAGE 2.4 — Oversight | Monitoring configuration documented; surveillance events captured (M008); escalation path defined. | `gov_repo.agents.cg_ag_012_autonomous_governed`; M008 `gov_repo.surveillance_events`. | Autonomous agent monitoring: threshold-based alerts (M008); escalation to oversight person on anomaly. |

---

### ISO/IEC 27001:2022

| Requirement | Control / Clause | Evidence Required | Repository Artifact | Governance Workflow |
|-------------|-----------------|-------------------|--------------------|--------------------|
| Information systems performing automated functions must have defined failure modes and manual override capabilities. | A.8.16 — Monitoring Activities | Autonomous agent failure modes documented; suspension workflow verified; suspension test recorded. | `gov_repo.agents.status`; `suspended_reason`; `suspended_at`; ledger event for suspension test. | Annual suspension test: autonomous agent suspended and reactivated under test conditions; evidence recorded. |
| Access controls for systems performing automated functions must prevent unauthorised changes to their operation. | A.8.3 — Information Access Restriction | `approved_for_production` flag requires explicit approval; status changes are ledger events with actor attribution. | `gov_repo.agents.approved_for_production`; `gov_repo.governance_ledger`; RLS policies. | Change control: production approval requires four-eyes (M006); all changes are actor-attributed ledger events. |

---

---

## Consolidated Cross-Reference Summary

| Control | EU AI Act | DORA | ISO 42001:2023 | NIST AI RMF 1.0 | ISO 27001:2022 |
|---------|-----------|------|----------------|-----------------|----------------|
| **CG-AG-001** Agent Inventory | Art. 11+Annex IV §1, Art. 49, Art. 26(1), Art. 17(1)(b) | Art. 8(1)(b), Art. 8(4), Art. 5(2), Art. 8(6) | 4.3, 6.1.2, 9.1, 5.1 | MAP 1.1, GOVERN 1.1, MAP 1.5, MANAGE 1.4 | A.5.9, A.5.10, A.5.12, A.5.2 |
| **CG-AG-002** Agent Owner | Art. 17(1)(c), Art. 26(5), Art. 22 | Art. 5(4), Art. 6(4), Art. 5(2) | 5.3, 7.1 | GOVERN 1.2, GOVERN 1.1, MANAGE 1.3 | A.5.9, A.6.3 |
| **CG-AG-003** Model Registration | Art. 11+Annex IV §2, Art. 15, Art. 10(2), Annex IV §2(g) | Art. 8(1)(b), Art. 28(1), Art. 8(4) | 8.4, 6.1.3, 6.2 | MAP 2.1, MAP 2.3, MEASURE 2.1 | A.8.8, A.5.19, A.8.9 |
| **CG-AG-004** Tool Authorisation | Art. 14(1), Annex IV §6 | Art. 9(2)(b)(c), Art. 28(5) | 8.4, 6.1.2 | MAP 3.5, MANAGE 2.2 | A.8.3, A.8.2, A.8.9 |
| **CG-AG-005** Prompt Governance | Art. 15(1)(3), Annex IV §6 | Art. 9(2), Art. 24(1) | 8.4, 6.1.2 | MEASURE 2.5, MAP 3.5 | A.8.29, A.8.7 |
| **CG-AG-006** MCP Governance | Annex IV §2(b), Art. 10(2)(e) | Art. 30(1), Art. 28(3)+Annex, Art. 28(8), Art. 29 | 6.1.3, 8.4 | MAP 3.5, MEASURE 2.8 | A.5.20, A.5.23, A.8.20 |
| **CG-AG-007** Human Oversight | Art. 14(1)(4)(4a)(4d)(5) | Art. 5(4), Art. 9(3) | 8.4, 5.3 | GOVERN 1.2, MANAGE 2.4 | A.8.15, A.5.2 |
| **CG-AG-008** Audit Trail | Art. 12(1)(2)(3) | Art. 10(1)(2)(3) | 9.1 | MANAGE 4.1, GOVERN 6.1 | A.8.15 (3×) |
| **CG-AG-009** Data Governance | Art. 10(2)(3)(5) | Art. 9(2)(d)(e) | 8.3, 8.4 | MAP 2.1, MAP 3.5 | A.5.34, A.5.12, A.5.31 |
| **CG-AG-010** Risk Classification | Art. 9(1), Art. 6+Annex III, Art. 43, Art. 5 | Art. 5(9), Art. 8(2) | 6.1.1, 8.4 | MAP 1.5, MEASURE 2.2 | 6.1.2, A.5.12 |
| **CG-AG-011** A2A Governance | Annex IV §2(b)(c), Art. 9(2)(b), Art. 11 | Art. 8(6) ×2, Art. 11(5) | 6.1.2, 8.4 | MAP 3.5, MEASURE 2.8 | A.8.20, A.5.14 |
| **CG-AG-012** Autonomous Governance | Art. 14(4)(d), Art. 9(2), Art. 13(3)(b), Art. 72(2) | Art. 9(3), Art. 11 | 8.4 ×2 | GOVERN 1.2, MAP 1.6, MANAGE 2.4 | A.8.16, A.8.3 |

---

## Coverage Heatmap

| Framework | CG-AG-001 | CG-AG-002 | CG-AG-003 | CG-AG-004 | CG-AG-005 | CG-AG-006 | CG-AG-007 | CG-AG-008 | CG-AG-009 | CG-AG-010 | CG-AG-011 | CG-AG-012 |
|-----------|:---------:|:---------:|:---------:|:---------:|:---------:|:---------:|:---------:|:---------:|:---------:|:---------:|:---------:|:---------:|
| EU AI Act | ●●●● | ●●● | ●●●● | ●● | ●●● | ●● | ●●●●● | ●●● | ●●● | ●●●● | ●●● | ●●●● |
| DORA | ●●●● | ●●● | ●●● | ●●● | ●● | ●●●● | ●● | ●●● | ●● | ●● | ●●● | ●● |
| ISO 42001 | ●●●● | ●● | ●●● | ●● | ●● | ●● | ●● | ●● | ●● | ●● | ●● | ●● |
| NIST AI RMF | ●●●● | ●●● | ●●● | ●● | ●● | ●● | ●● | ●● | ●● | ●● | ●● | ●●● |
| ISO 27001 | ●●●● | ●● | ●●● | ●●● | ●● | ●●● | ●● | ●●● | ●●● | ●● | ●● | ●● |

● = one mapped requirement. Max per cell = 5.

---

## Critical Gaps Affecting Matrix Completeness

The following gaps identified in the architectural review directly reduce the evidentiability of controls in this matrix:

| Gap | Affects Controls | Evidence Impact |
|-----|-----------------|-----------------|
| `gov_repo.governance_ledger` not yet defined (G-03) | CG-AG-001, 002, 007, 008, 011, 012 | AU AI Act Art. 12 and DORA Art. 10 logging evidence cannot be produced |
| `gov_repo.conformity_assessments` not yet defined (G-04) | CG-AG-010 | AI Act Art. 43 conformity evidence chain is broken |
| `gov_repo.risk_entries` not yet defined (G-05) | CG-AG-009, 010, 011, 012 | Risk management lifecycle evidence (AI Act Art. 9) cannot be demonstrated |
| `gov_repo.exceptions` not yet defined (G-06) | CG-AG-004, 007, 012 | Exception and waiver evidence missing; exception view queries non-existent table |
| No DPIA workflow (G-08) | CG-AG-009 | GDPR Art. 35 and AI Act Art. 10 DPIA evidence cannot be produced |
| No four-eyes enforcement (G-16) | CG-AG-002, 004, 007, 011 | DORA Art. 5 and ISO 27001 A.8.2 segregation-of-duties evidence absent |
| `cg_ag_008_audit_trail` flag not auto-computed (noted in schema) | CG-AG-008 | The compliance flag for audit trail control is not programmatically enforced |

---

*Matrix produced by: CodeGuard AI Governance OS — Principal Enterprise Architect Review*  
*Regulatory basis: EU AI Act (2024/1689) in force; DORA (2022/2554) applicable January 2025; ISO/IEC 42001:2023; NIST AI RMF 1.0 (January 2023); ISO/IEC 27001:2022*  
*Schema basis: gov_repo migrations 003–005, v1.1*
