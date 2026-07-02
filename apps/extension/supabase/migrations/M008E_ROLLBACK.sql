-- =============================================================================
-- M008E ROLLBACK
-- Restores trigger, functions, and views to pre-M008E state.
-- Run this ONLY if M008E causes issues.
-- =============================================================================

-- Restore trigger function to original (SECURITY INVOKER, no ledger writes)
create or replace function gov_repo.update_agent_compliance_flags()
returns trigger
language plpgsql
-- NOTE: security invoker is the default — not explicitly declared in original
as $$
begin
  new.cg_ag_001_registered := (
    new.agent_code is not null and
    new.name is not null and
    new.agent_type is not null and
    new.organisation_id is not null
  );
  new.cg_ag_002_owner   := (new.owner_user_id is not null);
  new.cg_ag_003_model_reg := (new.model_name is not null and new.model_provider is not null);
  new.cg_ag_007_oversight := (
    new.oversight_level is not null and (
      new.risk_level = 'low' or
      new.oversight_level in ('l2_human_review','l3_human_approval','l4_human_in_loop')
    )
  );
  return new;
end;
$$;

-- Drop M008E additions
drop function if exists gov_repo.log_agent_event(uuid, varchar, text, uuid, uuid, jsonb);
drop function if exists gov_repo.compute_cg_ag_008(uuid);

-- Restore agent_compliance_gaps() to original (without gap_cg_ag_008)
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
    not a.cg_ag_010_classified                                            as gap_cg_ag_010,
    (a.agent_type = 'autonomous' and not a.cg_ag_012_autonomous_governed) as gap_cg_ag_012,
    (a.ai_system_id is null)                                              as gap_no_ai_system,
    (
      case when not a.cg_ag_001_registered                                            then 1 else 0 end +
      case when not a.cg_ag_002_owner                                                 then 1 else 0 end +
      case when not a.cg_ag_003_model_reg                                             then 1 else 0 end +
      case when not a.cg_ag_007_oversight                                             then 1 else 0 end +
      case when not a.cg_ag_010_classified                                            then 1 else 0 end +
      case when a.agent_type = 'autonomous' and not a.cg_ag_012_autonomous_governed   then 1 else 0 end +
      case when a.ai_system_id is null                                                then 1 else 0 end
    )                                                                     as total_gaps,
    u.full_name,
    u.email
  from gov_repo.agents a
  join gov_repo.governance_users u on u.user_id = a.owner_user_id
  where a.organisation_id = p_organisation_id
    and a.status not in ('decommissioned')
    and (
      not a.cg_ag_001_registered or
      not a.cg_ag_002_owner      or
      not a.cg_ag_003_model_reg  or
      not a.cg_ag_007_oversight  or
      not a.cg_ag_010_classified or
      (a.agent_type = 'autonomous' and not a.cg_ag_012_autonomous_governed) or
      a.ai_system_id is null
    )
  order by
    case a.risk_level when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
    total_gaps desc;
$$;

-- Restore CISO lens to original (without gap_audit_trail)
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
join gov_repo.governance_users u on u.user_id = a.owner_user_id
where a.status not in ('decommissioned')
  and a.risk_level in ('critical','high');

-- NOTE: Ledger entries created by backfill are NOT deleted.
-- They are valid audit records and deletion would violate immutability.
-- They simply won't be read by the restored functions.