import { createAdminClient } from '@/lib/supabase/admin';
import { GraphRepository } from './db/repository';
import type { GraphEntity } from '@council/graphos/types/entities';
import type { Relationship } from '@council/graphos/types/relationships';

export interface BootstrapResult {
  entitiesCreated: number;
  relationshipsCreated: number;
  errors: string[];
  byKind: Record<string, number>;
  byRelKind: Record<string, number>;
}

export async function bootstrapGraphFromGovernanceRepo(
  organisationId: string,
  tenantId: string,
): Promise<BootstrapResult> {
  const supabase = createAdminClient();
  const repo = new GraphRepository();
  const errors: string[] = [];
  const byKind: Record<string, number> = {};
  const byRelKind: Record<string, number> = {};

  let entitiesCreated = 0;
  let relationshipsCreated = 0;

  function trackEntity(kind: string) {
    entitiesCreated++;
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }
  function trackRel(kind: string) {
    relationshipsCreated++;
    byRelKind[kind] = (byRelKind[kind] ?? 0) + 1;
  }

  // ─── 1. OWNERS from governance_users ─────────────────────────────────────────
  const { data: users, error: usersErr } = await supabase
    .from('governance_users')
    .select('user_id, email, full_name, display_name, organisation_id, status, role_ids, department, job_title')
    .eq('organisation_id', organisationId);

  if (usersErr) errors.push(`governance_users: ${usersErr.message}`);
  const userMap = new Map<string, string>();

  for (const u of users ?? []) {
    const entityId = `owner-${u.user_id}`;
    const entity: GraphEntity = {
      id: entityId,
      kind: 'owner',
      label: u.full_name ?? u.email,
      description: u.job_title ?? undefined,
    } as GraphEntity;
    (entity as any).email = u.email;
    (entity as any).role = u.role_ids;
    (entity as any).department = u.department;
    (entity as any).status = u.status;

    try {
      await repo.addEntityWithTenant(entity, tenantId, 'governance_users', u.user_id);
      trackEntity('owner');
      userMap.set(u.user_id, entityId);
    } catch (e: any) {
      errors.push(`owner ${u.user_id}: ${e.message}`);
    }
  }

  // ─── 2. AGENTS from gov_repo.agents ──────────────────────────────────────────
  const { data: agents, error: agentsErr } = await supabase
    .from('agents')
    .select('*')
    .eq('organisation_id', organisationId)
    .neq('status', 'decommissioned');

  if (agentsErr) errors.push(`agents: ${agentsErr.message}`);
  const agentMap = new Map<string, string>();

  for (const a of agents ?? []) {
    const entityId = `agent-${a.agent_id}`;
    const entity: GraphEntity = {
      id: entityId,
      kind: 'agent',
      label: a.name,
      description: a.description ?? undefined,
    } as GraphEntity;
    (entity as any).agentCode = a.agent_code;
    (entity as any).agentType = a.agent_type;
    (entity as any).riskLevel = a.risk_level;
    (entity as any).aiActRiskClass = a.ai_act_risk_class;
    (entity as any).oversightLevel = a.oversight_level;
    (entity as any).status = a.status;
    (entity as any).businessDomain = a.business_domain;
    (entity as any).deploymentEnv = a.deployment_env;
    (entity as any).complianceScore = a.compliance_score;
    (entity as any).cgAgFlags = {
      cg_ag_001_registered: a.cg_ag_001_registered,
      cg_ag_002_owner: a.cg_ag_002_owner,
      cg_ag_003_model_reg: a.cg_ag_003_model_reg,
      cg_ag_007_oversight: a.cg_ag_007_oversight,
      cg_ag_008_audit_trail: a.cg_ag_008_audit_trail,
      cg_ag_009_data_gov: a.cg_ag_009_data_gov,
      cg_ag_010_classified: a.cg_ag_010_classified,
      cg_ag_012_autonomous_governed: a.cg_ag_012_autonomous_governed,
    };

    try {
      await repo.addEntityWithTenant(entity, tenantId, 'agents', a.agent_id);
      trackEntity('agent');
      agentMap.set(a.agent_id, entityId);

      if (a.owner_user_id && userMap.has(a.owner_user_id)) {
        await repo.addRelationship({
          id: `rel-owned-${entityId}`,
          kind: 'OWNED_BY',
          sourceId: entityId,
          targetId: userMap.get(a.owner_user_id)!,
          weight: 1,
          tenantId,
        });
        trackRel('OWNED_BY');
      }
    } catch (e: any) {
      errors.push(`agent ${a.agent_id}: ${e.message}`);
    }
  }

  // ─── 3. DECISIONS from governance_ledger ─────────────────────────────────────
  const { data: ledgerEntries, error: ledgerErr } = await supabase
    .from('governance_ledger')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('subject_type', 'agent')
    .order('entry_sequence', { ascending: true })
    .limit(500);

  if (ledgerErr) errors.push(`governance_ledger: ${ledgerErr.message}`);

  for (const entry of ledgerEntries ?? []) {
    const entityId = `decision-${entry.entry_id}`;
    const entity: GraphEntity = {
      id: entityId,
      kind: 'decision',
      label: entry.event_description?.slice(0, 80) ?? entry.event_type,
      description: entry.event_description ?? undefined,
    } as GraphEntity;
    (entity as any).eventType = entry.event_type;
    (entity as any).timestamp = entry.event_timestamp;
    (entity as any).entrySequence = entry.entry_sequence;
    (entity as any).entryHash = entry.entry_hash;

    try {
      await repo.addEntityWithTenant(entity, tenantId, 'governance_ledger', entry.subject_id);
      trackEntity('decision');

      if (agentMap.has(entry.subject_id)) {
        await repo.addRelationship({
          id: `rel-decision-${entry.entry_id}`,
          kind: 'MAKES_DECISION',
          sourceId: agentMap.get(entry.subject_id)!,
          targetId: entityId,
          weight: 1,
          tenantId,
        });
        trackRel('MAKES_DECISION');
      }
    } catch (e: any) {
      errors.push(`decision ${entry.entry_id}: ${e.message}`);
    }
  }

  // ─── 4. RISKS from risk_entries ──────────────────────────────────────────────
  const { data: risks, error: risksErr } = await supabase
    .from('risk_entries')
    .select('*')
    .eq('organisation_id', organisationId);

  if (risksErr) errors.push(`risk_entries: ${risksErr.message}`);
  const riskMap = new Map<string, string>();

  for (const r of risks ?? []) {
    const entityId = `risk-${r.risk_id}`;
    const entity: GraphEntity = {
      id: entityId,
      kind: 'risk',
      label: r.title,
      description: r.description ?? undefined,
    } as GraphEntity;
    (entity as any).riskCode = r.risk_code;
    (entity as any).riskCategory = r.risk_category;
    (entity as any).riskDomain = r.risk_domain;
    (entity as any).likelihood = r.likelihood;
    (entity as any).impact = r.impact;
    (entity as any).inherentRiskScore = r.inherent_risk_score;
    (entity as any).residualRiskScore = r.residual_risk_score;
    (entity as any).status = r.status;
    (entity as any).severity = r.inherent_risk_score >= 20 ? 'critical'
      : r.inherent_risk_score >= 12 ? 'high'
      : r.inherent_risk_score >= 6 ? 'medium' : 'low';

    try {
      await repo.addEntityWithTenant(entity, tenantId, 'risk_entries', r.risk_id);
      trackEntity('risk');
      riskMap.set(r.risk_id, entityId);

      for (const agentId of r.related_agent_ids ?? []) {
        if (agentMap.has(agentId)) {
          await repo.addRelationship({
            id: `rel-risk-agent-${r.risk_id}-${agentId}`,
            kind: 'IMPACTS_RISK',
            sourceId: agentMap.get(agentId)!,
            targetId: entityId,
            weight: r.inherent_risk_score >= 15 ? 3 : 1,
          });
          trackRel('IMPACTS_RISK');
        }
      }

      if (r.owner_user_id && userMap.has(r.owner_user_id)) {
        await repo.addRelationship({
          id: `rel-risk-owner-${r.risk_id}`,
          kind: 'OWNED_BY',
          sourceId: entityId,
          targetId: userMap.get(r.owner_user_id)!,
          weight: 1,
          tenantId,
        });
        trackRel('OWNED_BY');
      }
    } catch (e: any) {
      errors.push(`risk ${r.risk_id}: ${e.message}`);
    }
  }

  // ─── 5. EVIDENCE ─────────────────────────────────────────────────────────────
  const { data: evidence, error: evidenceErr } = await supabase
    .from('evidence')
    .select('*')
    .eq('organisation_id', organisationId);

  if (evidenceErr) errors.push(`evidence: ${evidenceErr.message}`);
  const evidenceMap = new Map<string, string>();

  for (const ev of evidence ?? []) {
    const entityId = `evidence-${ev.evidence_id}`;
    const entity: GraphEntity = {
      id: entityId,
      kind: 'evidence',
      label: ev.title,
      description: ev.description ?? undefined,
    } as GraphEntity;
    (entity as any).evidenceCode = ev.evidence_code;
    (entity as any).evidenceType = ev.evidence_type;
    (entity as any).status = ev.status;
    (entity as any).collectedAt = ev.collected_at;
    (entity as any).verifiedBy = ev.verified_by;
    (entity as any).contentHash = ev.content_hash;
    (entity as any).retentionClass = ev.retention_class;
    (entity as any).retentionUntil = ev.retention_until;

    try {
      await repo.addEntityWithTenant(entity, tenantId, 'evidence', ev.evidence_id);
      trackEntity('evidence');
      evidenceMap.set(ev.evidence_id, entityId);

      for (const agentId of ev.agent_refs ?? []) {
        if (agentMap.has(agentId)) {
          await repo.addRelationship({
            id: `rel-ev-agent-${ev.evidence_id}-${agentId}`,
            kind: 'EVIDENCED_BY',
            sourceId: agentMap.get(agentId)!,
            targetId: entityId,
            weight: 2,
          });
          trackRel('EVIDENCED_BY');
        }
      }

      for (const riskId of ev.risk_refs ?? []) {
        if (riskMap.has(riskId)) {
          await repo.addRelationship({
            id: `rel-ev-risk-${ev.evidence_id}-${riskId}`,
            kind: 'EVIDENCED_BY',
            sourceId: riskMap.get(riskId)!,
            targetId: entityId,
            weight: 2,
          });
          trackRel('EVIDENCED_BY');
        }
      }

      if (ev.verified_by && userMap.has(ev.verified_by)) {
        await repo.addRelationship({
          id: `rel-ev-verifier-${ev.evidence_id}`,
          kind: 'REVIEWS',
          sourceId: userMap.get(ev.verified_by)!,
          targetId: entityId,
          weight: 1,
          tenantId,
        });
        trackRel('REVIEWS');
      }
    } catch (e: any) {
      errors.push(`evidence ${ev.evidence_id}: ${e.message}`);
    }
  }

  // ─── 6. POLICIES → CONTROLS ──────────────────────────────────────────────────
  const { data: policies, error: policiesErr } = await supabase
    .from('governance_policies')
    .select('*')
    .eq('organisation_id', organisationId);

  if (policiesErr) errors.push(`governance_policies: ${policiesErr.message}`);

  for (const p of policies ?? []) {
    const entityId = `control-${p.policy_id}`;
    const entity: GraphEntity = {
      id: entityId,
      kind: 'control',
      label: p.title,
      description: p.description ?? undefined,
    } as GraphEntity;
    (entity as any).policyCode = p.policy_code;
    (entity as any).policyType = p.policy_type;
    (entity as any).status = p.status;
    (entity as any).effectiveDate = p.effective_date;

    try {
      await repo.addEntityWithTenant(entity, tenantId, 'governance_policies', p.policy_id);
      trackEntity('control');

      for (const [agentUuid, agentEntityId] of Array.from(agentMap)) {
        await repo.addRelationship({
          id: `rel-policy-agent-${p.policy_id}-${agentUuid}`,
          kind: 'GOVERNS',
          sourceId: entityId,
          targetId: agentEntityId,
          weight: 1,
          tenantId,
        });
        trackRel('GOVERNS');
      }

      if (p.owner_user_id && userMap.has(p.owner_user_id)) {
        await repo.addRelationship({
          id: `rel-policy-owner-${p.policy_id}`,
          kind: 'OWNED_BY',
          sourceId: entityId,
          targetId: userMap.get(p.owner_user_id)!,
          weight: 1,
          tenantId,
        });
        trackRel('OWNED_BY');
      }
    } catch (e: any) {
      errors.push(`policy ${p.policy_id}: ${e.message}`);
    }
  }

  // ─── 7. CERTIFICATES from conformity_assessments ─────────────────────────────
  const { data: assessments, error: assessmentsErr } = await supabase
    .from('conformity_assessments')
    .select('*')
    .eq('organisation_id', organisationId);

  if (assessmentsErr) errors.push(`conformity_assessments: ${assessmentsErr.message}`);

  for (const ca of assessments ?? []) {
    const entityId = `certificate-${ca.assessment_id}`;
    const entity: GraphEntity = {
      id: entityId,
      kind: 'certificate',
      label: `Conformity Assessment ${ca.assessment_code}`,
      description: ca.scope_description ?? undefined,
    } as GraphEntity;
    (entity as any).assessmentCode = ca.assessment_code;
    (entity as any).assessmentType = ca.assessment_type;
    (entity as any).status = ca.status;
    (entity as any).outcome = ca.outcome;
    (entity as any).validUntil = ca.valid_until;
    (entity as any).aiActAnnexRef = ca.ai_act_annex_ref;
    (entity as any).euAiDbRef = ca.eu_ai_db_ref;

    try {
      await repo.addEntityWithTenant(entity, tenantId, 'conformity_assessments', ca.assessment_id);
      trackEntity('certificate');

      if (agentMap.has(ca.agent_id)) {
        await repo.addRelationship({
          id: `rel-cert-agent-${ca.assessment_id}`,
          kind: 'REQUIRES_CERT',
          sourceId: agentMap.get(ca.agent_id)!,
          targetId: entityId,
          weight: 2,
          tenantId,
        });
        trackRel('REQUIRES_CERT');
      }
    } catch (e: any) {
      errors.push(`certificate ${ca.assessment_id}: ${e.message}`);
    }
  }

  // ─── 8. AGENT EDGES → relationships (A2A governance) ─────────────────────────
  const { data: edges, error: edgesErr } = await supabase
    .from('agent_edges')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('is_active', true);

  if (edgesErr) errors.push(`agent_edges: ${edgesErr.message}`);

  const EDGE_KIND_MAP: Record<string, string> = {
    CALLS_AGENT: 'DEPENDS_ON',
    DELEGATES_TO: 'DEPENDS_ON',
    SUPERVISES: 'MONITORS',
    DEPENDS_ON: 'DEPENDS_ON',
    ESCALATES_TO: 'DEPENDS_ON',
    ORCHESTRATES: 'DEPENDS_ON',
    FALLBACK_TO: 'DEPENDS_ON',
    PEER_COORDINATES: 'DEPENDS_ON',
  };

  for (const edge of edges ?? []) {
    const sourceEntityId = agentMap.get(edge.source_agent_id);
    const targetEntityId = agentMap.get(edge.target_agent_id);
    if (!sourceEntityId || !targetEntityId) continue;

    const relKind = EDGE_KIND_MAP[edge.relationship_type] ?? 'DEPENDS_ON';
    try {
      await repo.addRelationship({
        id: `rel-edge-${edge.edge_id}`,
        kind: relKind as any,
        sourceId: sourceEntityId,
        targetId: targetEntityId,
        weight: Math.ceil(edge.weight * 3),
        metadata: {
          relationshipType: edge.relationship_type,
          carriesPii: edge.carries_pii,
          carriesPhi: edge.carries_phi,
          carriesFinancial: edge.carries_financial,
          dataClassification: edge.data_classification,
        },
        tenantId,
      });
      trackRel(relKind);
    } catch (e: any) {
      errors.push(`edge ${edge.edge_id}: ${e.message}`);
    }
  }

  return {
    entitiesCreated,
    relationshipsCreated,
    errors,
    byKind,
    byRelKind,
  };
}
