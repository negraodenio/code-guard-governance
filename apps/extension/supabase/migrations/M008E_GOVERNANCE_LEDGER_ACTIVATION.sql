-- =============================================================================
-- CODEGUARD AI GOVERNANCE OS
-- Migration: M008E_GOVERNANCE_LEDGER_ACTIVATION
-- Domain:    Governance Ledger Integration — Agent Lifecycle
-- Depends:   M001–M008D (all gov_repo schema)
-- Version:   1.0
-- =============================================================================
-- Activates the governance_ledger for agent lifecycle events.
-- Fixes CG-AG-008 (Audit Trail) which was declared but never computed.
--
-- Background:
--   ledger_append()          defined in M002 — NEVER called by any trigger
--   governance_ledger        table exists — 0 rows
--   cg_ag_008_audit_trail    column exists on agents — default false, never set
--   update_agent_compliance_flags()  runs as SECURITY INVOKER — cannot call ledger_append()
--
-- Changes in this migration:
--   [1] NEW:    gov_repo.log_agent_event()         — central agent event logging
--   [2] REWRITE: gov_repo.update_agent_compliance_flags()
--               → SECURITY DEFINER (required for ledger write access)
--               → Calls log_agent_event() on agent INSERT
--               → Links agent.ledger_entry_seq to ledger entry
--               → Computes cg_ag_008_audit_trail
--   [3] NEW:    gov_repo.compute_cg_ag_008(agent_id) — audit trail verification
--   [4] MODIFY: gov_repo.agent_compliance_gaps()     — includes gap_cg_ag_008
--   [5] MODIFY: gov_repo.v_ciso_agent_risk_lens      — includes gap_audit_trail
--   [6] NEW:    Backfill DO block — all existing agents receive ledger entries
--
-- Rollback: see M008E_ROLLBACK.sql
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- [1] GOVERNANCE LEDGER — AGENT EVENT LOGGING
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function gov_repo.log_agent_event(
  p_agent_id        uuid,
  p_event_type      varchar,
  p_event_desc      text,
  p_actor_user_id   uuid,
  p_organisation_id uuid,
  p_payload         jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_sequence bigint;
begin
  v_sequence := gov_repo.ledger_append(
    p_event_type      := p_event_type,
    p_event_desc      := p_event_desc,
    p_subject_type    := 'agent',
    p_subject_id      := p_agent_id,
    p_actor_user_id   := p_actor_user_id,
    p_actor_ip        := null,
    p_organisation_id := p_organisation_id,
    p_payload         := p_payload
  );

  return v_sequence;
end;
$$;

comment on function gov_repo.log_agent_event is
  'Centralised agent event logging. Encapsulates ledger_append() for agent lifecycle events.
   Supported event types: agent.registered (more to be added in future sprints).
   Returns entry_sequence for linking agents.ledger_entry_seq.
   SECURITY DEFINER — required to call ledger_append() from trigger context.';

grant execute on function gov_repo.log_agent_event to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- [2] REWRITE: COMPLIANCE FLAGS TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════
-- Rationale:
--   - SECURITY DEFINER: required because ledger_append() is granted to service_role
--     only. The trigger must run with owner privileges to write to the ledger.
--   - log_agent_event() call on INSERT: creates the first audit trail entry.
--   - ledger_entry_seq: links agent directly to its registration event.
--   - compute_cg_ag_008(): verifies ledger entry exists before returning.
--   - No ledger write on UPDATE: status_changed, owner_changed, etc. are future
--     event types (Sprint 2).

create or replace function gov_repo.update_agent_compliance_flags()
returns trigger
language plpgsql
security definer
as $$
declare
  v_ledger_seq bigint;
begin
  -- CG-AG-001: Complete inventory record
  new.cg_ag_001_registered := (
    new.agent_code is not null and
    new.name is not null and
    new.agent_type is not null and
    new.organisation_id is not null
  );

  -- CG-AG-002: Owner assigned
  new.cg_ag_002_owner := (new.owner_user_id is not null);

  -- CG-AG-003: Model documented
  new.cg_ag_003_model_reg := (
    new.model_name is not null and new.model_provider is not null
  );

  -- CG-AG-007: Appropriate human oversight
  new.cg_ag_007_oversight := (
    new.oversight_level is not null and (
      new.risk_level = 'low' or
      new.oversight_level in ('l2_human_review','l3_human_approval','l4_human_in_loop')
    )
  );

  -- CG-AG-008: Audit trail — write to ledger on INSERT
  if (TG_OP = 'INSERT') then
    v_ledger_seq := gov_repo.log_agent_event(
      p_agent_id        := new.agent_id,
      p_event_type      := 'agent.registered',
      p_event_desc      := 'Agent ' || coalesce(new.agent_code, new.name) || ' registered in CodeGuard Governance OS',
      p_actor_user_id   := coalesce(new.created_by, new.owner_user_id),
      p_organisation_id := new.organisation_id,
      p_payload         := jsonb_build_object(
        'agent_code', new.agent_code,
        'agent_type', new.agent_type::text,
        'risk_level', new.risk_level::text,
        'deployment_env', new.deployment_env,
        'version', new.version
      )
    );
    new.ledger_entry_seq := v_ledger_seq;
  end if;

  -- Verify audit trail exists (works for both INSERT and UPDATE)
  new.cg_ag_008_audit_trail := gov_repo.compute_cg_ag_008(new.agent_id);

  -- CG-AG-010: Risk classification
  new.cg_ag_010_classified := (
    new.risk_level is not null and
    new.ai_act_risk_class is not null
  );

  -- CG-AG-012: Autonomous agent governance
  if new.agent_type = 'autonomous' then
    new.cg_ag_012_autonomous_governed := (
      new.oversight_level in ('l3_human_approval', 'l4_human_in_loop')
    );
  else
    new.cg_ag_012_autonomous_governed := true;
  end if;

  return new;
end;
$$;

comment on function gov_repo.update_agent_compliance_flags is
  'Auto-computes CG-AGF compliance flags on agent INSERT and UPDATE.
   SECURITY DEFINER: required to call log_agent_event() → ledger_append() from trigger.
   On INSERT: creates agent.registered event in governance_ledger and links ledger_entry_seq.
   On UPDATE: recomputes flags but does NOT write to ledger (status change events are Sprint 2).';

-- ═══════════════════════════════════════════════════════════════════════════════
-- [3] CG-AG-008: AUDIT TRAIL VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function gov_repo.compute_cg_ag_008(p_agent_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from gov_repo.governance_ledger
    where subject_type = 'agent'
      and subject_id = p_agent_id
  );
$$;

comment on function gov_repo.compute_cg_ag_008 is
  'Verifies that an agent has at least one entry in the governance_ledger.
   Returns true if the agent has been registered in the ledger.
   Used by: update_agent_compliance_flags() → cg_ag_008_audit_trail.
   Satisfies: EU AI Act Art. 12(1) | DORA Art. 10(1) | ISO 42001 9.1.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- [4] UPDATE: COMPLIANCE GAPS FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function gov_repo.agent_compliance_gaps(p_organisation_id uuid)
returns table (
  agent_id          uuid,
  agent_code        varchar,
  agent_name        varchar,
  risk_level        gov_repo.agent_risk_level,
  status            gov_repo.agent_status,
  ai_system_id      uuid,
  gap_cg_ag_001     boolean,
  gap_cg_ag_002     boolean,
  gap_cg_ag_003     boolean,
  gap_cg_ag_007     boolean,
  gap_cg_ag_008     boolean,
  gap_cg_ag_010     boolean,
  gap_cg_ag_012     boolean,
  gap_no_ai_system  boolean,
  total_gaps        integer,
  owner_name        varchar,
  owner_email       varchar
)
language sql security definer as $$
  select
    a.agent_id,
    a.agent_code,
    a.name,
    a.risk_level,
    a.status,
    a.ai_system_id,
    not a.cg_ag_001_registered                                            as gap_cg_ag_001,
    not a.cg_ag_002_owner                                                 as gap_cg_ag_002,
    not a.cg_ag_003_model_reg                                             as gap_cg_ag_003,
    not a.cg_ag_007_oversight                                             as gap_cg_ag_007,
    not a.cg_ag_008_audit_trail                                           as gap_cg_ag_008,
    not a.cg_ag_010_classified                                            as gap_cg_ag_010,
    (a.agent_type = 'autonomous' and not a.cg_ag_012_autonomous_governed) as gap_cg_ag_012,
    (a.ai_system_id is null)                                              as gap_no_ai_system,
    (
      case when not a.cg_ag_001_registered                                            then 1 else 0 end +
      case when not a.cg_ag_002_owner                                                 then 1 else 0 end +
      case when not a.cg_ag_003_model_reg                                             then 1 else 0 end +
      case when not a.cg_ag_007_oversight                                             then 1 else 0 end +
      case when not a.cg_ag_008_audit_trail                                           then 1 else 0 end +
      case when not a.cg_ag_010_classified                                            then 1 else 0 end +
      case when a.agent_type = 'autonomous' and not a.cg_ag_012_autonomous_governed   then 1 else 0 end +
      case when a.ai_system_id is null                                                then 1 else 0 end
    )                                                                     as total_gaps,
    u.full_name,
    u.email
  from gov_repo.agents a
  left join gov_repo.governance_users u on u.user_id = a.owner_user_id
  where a.organisation_id = p_organisation_id
    and a.status not in ('decommissioned')
    and (
      not a.cg_ag_001_registered or
      not a.cg_ag_002_owner      or
      not a.cg_ag_003_model_reg  or
      not a.cg_ag_007_oversight  or
      not a.cg_ag_008_audit_trail or
      not a.cg_ag_010_classified or
      (a.agent_type = 'autonomous' and not a.cg_ag_012_autonomous_governed) or
      a.ai_system_id is null
    )
  order by
    case a.risk_level when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
    total_gaps desc;
$$;

comment on function gov_repo.agent_compliance_gaps is
  'CG-AGF compliance gap detector. Returns one row per non-compliant agent.
   [M008E] Added: gap_cg_ag_008 (audit trail). Changed owner join to LEFT JOIN.
   Sorted by risk level then total gaps. Answer: "Which agents need governance attention?"';

-- ═══════════════════════════════════════════════════════════════════════════════
-- [5] UPDATE: CISO LENS VIEW
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace view gov_repo.v_ciso_agent_risk_lens as
select
  a.organisation_id,
  a.agent_id,
  a.agent_code,
  a.name                                as agent_name,
  a.agent_type,
  a.risk_level,
  a.ai_act_risk_class,
  a.oversight_level,
  a.status,
  a.deployment_env,
  a.model_is_local,
  a.ai_system_id,
  u.full_name                           as owner_name,
  u.email                               as owner_email,
  not a.cg_ag_001_registered            as gap_inventory,
  not a.cg_ag_002_owner                 as gap_owner,
  not a.cg_ag_007_oversight             as gap_oversight,
  not a.cg_ag_008_audit_trail           as gap_audit_trail,
  not a.cg_ag_010_classified            as gap_risk_class,
  (a.ai_system_id is null)              as gap_no_ai_system,
  (select count(*) from gov_repo.agent_edges e
   where e.source_agent_id = a.agent_id and e.is_active = true)  as outbound_edges,
  (select count(*) from gov_repo.agent_edges e
   where e.target_agent_id = a.agent_id and e.is_active = true)  as inbound_edges,
  (select count(*) from gov_repo.agent_resource_links rl
   where rl.agent_id = a.agent_id and rl.processes_pii = true and rl.is_active = true)
                                        as pii_resource_count,
  (select count(*) from gov_repo.agent_risk_propagation rp
   where rp.risk_source_agent_id = a.agent_id and rp.is_active = true)
                                        as agents_it_can_impact,
  (select coalesce(sum(rp.financial_impact_eur), 0)
   from gov_repo.agent_risk_propagation rp
   where rp.risk_source_agent_id = a.agent_id and rp.is_active = true)
                                        as total_financial_exposure_eur,
  (select count(*) from gov_repo.exceptions ex
   where ex.agent_id = a.agent_id and ex.status = 'active')
                                        as active_exceptions
from gov_repo.agents a
left join gov_repo.governance_users u on u.user_id = a.owner_user_id
where a.status not in ('decommissioned')
  and a.risk_level in ('critical','high');

comment on view gov_repo.v_ciso_agent_risk_lens is
  'CISO lens: critical/high risk agents with compliance gaps, PII exposure, financial risk.
   [M008E] Added: gap_audit_trail. Changed owner join to LEFT JOIN.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- [6] BACKFILL: EXISTING AGENTS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Strategy:
--   1. Identify agents without a ledger entry (subject_type='agent', subject_id=agent_id)
--   2. For each, call log_agent_event() to create agent.registered event
--   3. Update agents.ledger_entry_seq with the returned sequence
--   4. Update agents.cg_ag_008_audit_trail = true
--   5. The UPDATE fires the trigger, which recomputes all flags (idempotent)
--   6. If run again, no duplicates — the NOT EXISTS clause prevents re-insertion
--
-- Performance: uses a single UPDATE with correlated subquery.
-- For large agent counts (>1000), consider batching.

do $$
declare
  rec record;
  v_seq bigint;
  v_count integer := 0;
begin
  for rec in
    select
      a.agent_id,
      a.agent_code,
      a.name,
      a.agent_type,
      a.risk_level,
      a.deployment_env,
      a.version,
      a.organisation_id,
      coalesce(a.created_by, a.owner_user_id) as actor_user_id
    from gov_repo.agents a
    where a.status != 'decommissioned'
      and not exists (
        select 1 from gov_repo.governance_ledger gl
        where gl.subject_type = 'agent'
          and gl.subject_id = a.agent_id
      )
    order by a.created_at asc
  loop
    v_seq := gov_repo.log_agent_event(
      p_agent_id        := rec.agent_id,
      p_event_type      := 'agent.registered',
      p_event_desc      := 'Agent ' || coalesce(rec.agent_code, rec.name) || ' registered (backfill — M008E)',
      p_actor_user_id   := rec.actor_user_id,
      p_organisation_id := rec.organisation_id,
      p_payload         := jsonb_build_object(
        'agent_code', rec.agent_code,
        'agent_type', rec.agent_type::text,
        'risk_level', rec.risk_level::text,
        'deployment_env', rec.deployment_env,
        'version', rec.version,
        'backfill', true
      )
    );

    update gov_repo.agents
    set ledger_entry_seq = v_seq
    where agent_id = rec.agent_id;

    v_count := v_count + 1;
  end loop;

  raise notice 'M008E backfill complete: % agents received ledger entries.', v_count;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FINAL: VERIFY LEDGER INTEGRITY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Confirm all non-decommissioned agents have ledger entries
do $$
declare
  v_total integer;
  v_missing integer;
begin
  select count(*) into v_total
  from gov_repo.agents
  where status != 'decommissioned';

  select count(*) into v_missing
  from gov_repo.agents a
  where a.status != 'decommissioned'
    and not exists (
      select 1 from gov_repo.governance_ledger gl
      where gl.subject_type = 'agent'
        and gl.subject_id = a.agent_id
    );

  if v_missing = 0 then
    raise notice 'M008E verification PASSED: %/% agents have ledger entries.', v_total, v_total;
  else
    raise warning 'M008E verification FAILED: % agents missing ledger entries out of % total.', v_missing, v_total;
  end if;
end;
$$;