import type { ScannerResult } from './types';
import type { GraphEntity, AgentNode, ToolNode, ExternalSystemNode, DataAssetNode, ModelNode, RiskNode, RegulationNode, EvidenceNode, OwnerNode, PromptNode } from '@council/graphos/types/entities';
import type { Relationship } from '@council/graphos/types/relationships';
import { estimateModelCost } from './model-parser';

const COST_PER_TOKEN: Record<string, number> = {
  openai: 0.01, anthropic: 0.008, mistral: 0.001, deepseek: 0.0005, google: 0.0005, meta: 0.0005, cohere: 0.002,
};

export function mapToGraphOS(result: ScannerResult): { entities: GraphEntity[]; relationships: Relationship[] } {
  const entities: GraphEntity[] = [];
  const relationships: Relationship[] = [];
  const relId = (() => { let i = 0; return () => `sc-rel-${++i}`; })();
  const { packages, source, risks, compliance, owner, violations, enrichment, agentClassifications } = result;

  // Build index maps for entity lookup
  const entityIndex = new Map<string, GraphEntity>();

  // ── Owner ────────────────────────────────────────────
  const ownerEntity: OwnerNode = {
    id: owner.id, kind: 'owner', label: owner.label,
    description: `Role: ${owner.role}`,
    email: owner.email, role: owner.role as OwnerNode['role'], teams: owner.teams,
  };
  entities.push(ownerEntity);
  entityIndex.set(ownerEntity.id, ownerEntity);

  // ── External Systems ─────────────────────────────────
  const extSystemMap = new Map<string, string>();
  for (const svc of source.externalServices) {
    const eid = `sc-ext-${svc.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const ext: ExternalSystemNode = {
      id: eid, kind: 'external_system', label: svc.name,
      description: `Type: ${svc.type}${svc.url ? ` | ${svc.url}` : ''}`,
      systemType: svc.type === 'database' ? 'cloud' : svc.type === 'ai' ? 'saas' : 'cloud',
      dataResidency: [], hasSLA: false, securityLevel: 'medium',
    };
    entities.push(ext);
    entityIndex.set(eid, ext);
    extSystemMap.set(svc.name.toLowerCase(), eid);
  }

  // ── Tools ────────────────────────────────────────────
  const toolIdByLabel = new Map<string, string>();

  function addTool(id: string, label: string, description: string, toolType: ToolNode['toolType'], exposed = false, hasSecrets = false) {
    if (toolIdByLabel.has(label.toLowerCase())) return;
    const tool: ToolNode = {
      id, kind: 'tool', label, description,
      toolType, accessLevel: 'read', dataAssets: [], exposed, hasSecrets,
    };
    entities.push(tool);
    entityIndex.set(id, tool);
    toolIdByLabel.set(label.toLowerCase(), id);
  }

  for (const model of source.aiModels) {
    addTool(`sc-tool-${model.provider.toLowerCase()}`, `${model.provider} API`, `AI provider: ${model.provider}`, 'api');
  }
  for (const dep of packages.dbDependencies) {
    addTool(`sc-tool-${dep.replace('@', '').replace('/', '-')}`, dep, 'Database dependency', 'database');
  }
  for (const dep of packages.authDependencies) {
    addTool(`sc-tool-auth-${dep.replace('@', '').replace('/', '-')}`, dep, 'Auth dependency', 'api');
  }
  for (const dep of packages.paymentDependencies) {
    addTool(`sc-tool-pmt-${dep.replace('@', '').replace('/', '-')}`, dep, 'Payment dependency', 'api');
  }

  // ── Data Assets ──────────────────────────────────────
  const dataAssetMap = new Map<string, string>();
  for (const da of source.dataAssets) {
    const did = `sc-data-${da.name}`;
    if (dataAssetMap.has(da.name)) continue;
    const asset: DataAssetNode = {
      id: did, kind: 'data_asset', label: da.name,
      description: `Type: ${da.type}${da.hasPII ? ' | Contains PII' : ''}`,
      classification: da.hasPII ? 'confidential' : 'internal',
      hasPII: da.hasPII, piiCategories: da.hasPII ? ['UNKNOWN'] : undefined,
      legalBasis: da.legalBasis, retentionDays: 365, regulationIds: [], ownerId: owner.id,
    };
    entities.push(asset);
    entityIndex.set(did, asset);
    dataAssetMap.set(da.name, did);
  }

  // ── Models ───────────────────────────────────────────
  const modelIdsByProvider = new Map<string, string[]>();
  const modelIdSet = new Set<string>();
  for (const model of source.aiModels) {
    const modelName = (model.modelId ?? model.provider).toLowerCase();
    const mid = `sc-model-${model.provider.toLowerCase()}-${modelName.replace(/[^a-z0-9]/g, '-')}`;
    const dedupKey = `${model.provider.toLowerCase()}:${modelName}`;
    if (modelIdSet.has(dedupKey)) continue;
    modelIdSet.add(dedupKey);
    const costPerToken = estimateModelCost(model.provider, model.modelId);
    const modelNode: ModelNode = {
      id: mid, kind: 'model',
      label: model.modelId ?? `${model.provider} Model`,
      description: `Provider: ${model.provider} | Usage: ${model.usage} | Cost: $${costPerToken}/token`,
      provider: model.provider.toLowerCase() as ModelNode['provider'],
      modelId: model.modelId ?? 'default', version: 'unknown',
      costPerToken, latencyMs: 500, tokensUsed: 1000000,
    };
    entities.push(modelNode);
    entityIndex.set(mid, modelNode);
    const prov = model.provider.toLowerCase();
    if (!modelIdsByProvider.has(prov)) modelIdsByProvider.set(prov, []);
    modelIdsByProvider.get(prov)!.push(mid);
  }

  // ── Agents ───────────────────────────────────────────
  const agentIdMap = new Map<string, string>();
  const agentFileMap = new Map<string, string>();
  for (const agent of source.agents) {
    const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const agentNode: AgentNode = {
      id: aid, kind: 'agent', label: agent.name,
      description: [
        `Type: ${agent.type}`,
        `Risk: ${agent.riskLevel}`,
        agent.framework ? `Framework: ${agent.framework}` : '',
        agent.oversightLevel ? `Oversight: ${agent.oversightLevel}` : '',
        agent.isAutonomous ? 'Autonomous' : '',
      ].filter(Boolean).join(' | '),
      agentType: agent.type, riskLevel: agent.riskLevel as AgentNode['riskLevel'],
      status: 'active', tools: agent.tools, models: agent.models,
      critical: agent.critical || agent.isAutonomous || false,
    };
    entities.push(agentNode);
    entityIndex.set(aid, agentNode);
    agentIdMap.set(agent.name.toLowerCase(), aid);
    if (agent.filePath) agentFileMap.set(agent.filePath, aid);
  }

  // ── Agent Classifications ────────────────────────────
  const classIds: string[] = [];
  if (agentClassifications) {
    for (const ac of agentClassifications) {
      const cid = `sc-class-${ac.agentId}`;
      entities.push({ id: cid, kind: 'classification' as any, label: `AI Act: ${ac.aiActCategory} | Domain: ${ac.domain}`, description: `Oversight: ${ac.oversightLevel} | Confidence: ${ac.confidence}%` });
      entityIndex.set(cid, entities[entities.length - 1]);
      classIds.push(cid);
      const aid = `sc-agent-${ac.agentId}`;
      if (entityIndex.has(aid)) {
        relationships.push({ id: relId(), kind: 'BASED_ON', sourceId: cid, targetId: aid, weight: 1 });
      }
    }
  }

  // ── Risks ────────────────────────────────────────────
  const riskIdMap = new Map<string, string>();
  const riskSeverityMap = new Map<string, string>();
  for (const risk of risks) {
    const rid = `sc-risk-${risk.id.toLowerCase()}`;
    const severity = risk.severity === 'critical' ? 'critical' : risk.severity === 'high' ? 'high' : risk.severity === 'medium' ? 'medium' : 'low';
    const riskNode: RiskNode = {
      id: rid, kind: 'risk', label: risk.title,
      description: `${risk.severity.toUpperCase()}: ${risk.description.slice(0, 200)}`,
      riskType: risk.category === 'security' ? 'security' : risk.category === 'compliance' ? 'regulatory' : risk.category === 'financial' ? 'financial' : 'operational',
      severity, likelihood: 'possible',
      impact: risk.severity === 'critical' ? 100000 : risk.severity === 'high' ? 50000 : risk.severity === 'medium' ? 10000 : 1000,
      controlIds: [], incidentIds: [],
    };
    entities.push(riskNode);
    entityIndex.set(rid, riskNode);
    riskIdMap.set(risk.id.toLowerCase(), rid);
    riskSeverityMap.set(risk.id.toLowerCase(), risk.severity);
  }

  // ── Regulations ──────────────────────────────────────
  const regulationIdMap = new Map<string, string>();
  for (const reg of compliance.applicableRegulations) {
    const rid = `sc-reg-${reg.id}`;
    const regNode: RegulationNode = {
      id: rid, kind: 'regulation', label: reg.name,
      description: `Status: ${reg.status} | Authority: ${reg.authority}`,
      regulationId: reg.id,
      authority: reg.authority as RegulationNode['authority'],
      status: reg.status as RegulationNode['status'],
      requirements: reg.requirements, certificateIds: [], agentsInScope: [],
    };
    entities.push(regNode);
    entityIndex.set(rid, regNode);
    regulationIdMap.set(reg.id, rid);
  }

  // ── Evidence (source files) ──────────────────────────
  const evidenceFileMap = new Map<string, string>();
  for (const file of source.fileTree.slice(0, 100)) {
    const eid = `sc-ev-${file.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
    if (!evidenceFileMap.has(file) && file.split('/').pop()) {
      const ev: EvidenceNode = {
        id: eid, kind: 'evidence', label: file.split('/').pop()!,
        description: `Source: ${file}`,
        evidenceType: file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.py') ? 'audit_log' : file.endsWith('.md') ? 'document' : 'screenshot',
        source: file,
      };
      entities.push(ev);
      entityIndex.set(eid, ev);
      evidenceFileMap.set(file, eid);
    }
  }

  // ── Prompts ──────────────────────────────────────────
  const promptSourceMap = new Map<string, string>();
  for (const prompt of source.extractedPrompts.slice(0, 50)) {
    const pid = `sc-prompt-${prompt.hash}`;
    if (!promptSourceMap.has(prompt.hash)) {
      const pn: PromptNode = {
        id: pid, kind: 'prompt', label: `${prompt.type} prompt`,
        description: `Type: ${prompt.type} | Source: ${prompt.source}`,
        promptId: prompt.hash, version: '1.0', hash: prompt.hash,
        ownerId: owner.id, approvedBy: owner.label, effectiveDate: new Date().toISOString(),
        riskLevel: 'low', evidenceIds: [],
      };
      entities.push(pn);
      entityIndex.set(pid, pn);
      promptSourceMap.set(prompt.hash, prompt.source);
    }
  }

  // ── Memory Systems ───────────────────────────────────
  const memoryEntityIds: string[] = [];
  for (const mem of source.memorySystems) {
    const mid = `sc-memory-${mem.technology.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (!entityIndex.has(mid)) {
      entities.push({ id: mid, kind: 'memory', label: mem.technology, description: `Type: ${mem.type} | Governed: ${mem.governed}` });
      entityIndex.set(mid, entities[entities.length - 1]);
    }
    memoryEntityIds.push(mid);
  }

  // ── Controls (from compliance regulations) ────────────
  const controlEntityIds: string[] = [];
  for (const reg of compliance.applicableRegulations) {
    const cid = `sc-ctrl-${reg.id}`;
    const hasGaps = reg.gaps.length > 0;
    const control: any = {
      id: cid, kind: 'control', label: `Control: ${reg.name.split('(')[0].trim()}`,
      description: `Status: ${reg.status} | Gaps: ${reg.gaps.length} | Requirements: ${reg.requirements.length}`,
      controlId: cid, framework: reg.authority === 'EU' ? 'CG-AG' : reg.authority === 'ANPD' ? 'LGPD' : reg.authority === 'ANVISA' ? 'ANVISA' : reg.authority === 'BACEN' ? 'BCB' : 'CG-AG',
      riskLevel: hasGaps ? (reg.gaps.length > 2 ? 'high' : 'medium') : 'low',
      critical: reg.status === 'non_compliant',
      status: reg.status,
    };
    entities.push(control);
    entityIndex.set(cid, control);
    controlEntityIds.push(cid);
  }

  // ── Decision (from compliance summary) ────────────────
  const compliantCount = compliance.applicableRegulations.filter(r => r.status === 'compliant').length;
  const totalRegCount = compliance.applicableRegulations.length;
  const decScore = totalRegCount > 0 ? Math.round((compliantCount / totalRegCount) * 100) : 50;
  const decId = 'sc-decision-governance';
  const decision: any = {
    id: decId, kind: 'decision', label: 'Governance Assessment',
    description: compliance.summary,
    verdict: decScore >= 70 ? 'GO' : decScore >= 40 ? 'CONDITIONAL' : 'NO-GO',
    score: decScore,
    confidence: decScore >= 70 ? 'HIGH' : decScore >= 40 ? 'MEDIUM' : 'LOW',
    riskLevel: decScore >= 70 ? 'low' : decScore >= 40 ? 'medium' : 'high',
    critical: decScore < 40,
    costUsd: 0,
  };
  entities.push(decision);
  entityIndex.set(decId, decision);

  // Decision → Evidence (direct link for audit chain)
  const evidenceIds = Array.from(evidenceFileMap.values()).slice(0, 5);
  for (const evId of evidenceIds) {
    relationships.push({ id: relId(), kind: 'EVIDENCED_BY', sourceId: decId, targetId: evId, weight: 2 });
  }

  // ── Frameworks ───────────────────────────────────────
  const frameworkEntityIds: string[] = [];
  for (const fw of source.frameworks) {
    const fid = `sc-framework-${fw.framework.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (!entityIndex.has(fid)) {
      entities.push({ id: fid, kind: 'tool' as any, label: fw.framework, description: `Confidence: ${fw.confidence} | ${fw.evidence.slice(0, 2).join('; ')}` });
      entityIndex.set(fid, entities[entities.length - 1]);
    }
    frameworkEntityIds.push(fid);
  }

  // ═══════════════════════════════════════════════════════
  // RELATIONSHIPS — one-to-one and one-to-few only
  // ═══════════════════════════════════════════════════════

  // 1. Tools → ExternalSystems (match by name)
  for (const [toolId, toolLabel] of Array.from(toolIdByLabel)) {
    relationships.push({ id: relId(), kind: 'OWNED_BY', sourceId: toolId, targetId: owner.id, weight: 1 });
    for (const [svcName, extId] of Array.from(extSystemMap)) {
      if (toolLabel.toLowerCase().includes(svcName) || svcName.includes(toolLabel.toLowerCase().replace(' api', '').replace('@', ''))) {
        relationships.push({ id: relId(), kind: 'ACCESSES_SYSTEM', sourceId: toolId, targetId: extId, weight: 2 });
      }
    }
  }

  // 2. DataAssets → Owner
  for (const [name, did] of Array.from(dataAssetMap)) {
    relationships.push({ id: relId(), kind: 'OWNED_BY', sourceId: did, targetId: owner.id, weight: 1 });
  }

  // 3. Agents → Tools (one-to-few per agent.tools)
  for (const agent of source.agents) {
    const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const linkedTools = new Set<string>();
    for (const tool of agent.tools) {
      const tid = `sc-tool-${tool.toLowerCase()}`;
      if (entityIndex.has(tid) && !linkedTools.has(tid)) {
        relationships.push({ id: relId(), kind: 'USES_TOOL', sourceId: aid, targetId: tid, weight: 2 });
        linkedTools.add(tid);
      }
    }
    if (agent.framework) {
      const fid = `sc-framework-${agent.framework.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (entityIndex.has(fid) && !linkedTools.has(fid)) {
        relationships.push({ id: relId(), kind: 'USES_TOOL', sourceId: aid, targetId: fid, weight: 3 });
        linkedTools.add(fid);
      }
    }
  }

  // 4. Agents → Models (one-to-few by provider match)
  function getModelIds(provider: string): string[] {
    return modelIdsByProvider.get(provider.toLowerCase()) || [];
  }
  for (const agent of source.agents) {
    const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const linkedModels = new Set<string>();
    for (const modelRef of agent.models) {
      for (const mId of getModelIds(modelRef)) {
        if (!linkedModels.has(mId)) {
          relationships.push({ id: relId(), kind: 'USES_MODEL', sourceId: aid, targetId: mId, weight: 2 });
          linkedModels.add(mId);
        }
      }
    }
    if (linkedModels.size === 0) {
      for (const tool of agent.tools) {
        for (const mId of getModelIds(tool)) {
          if (!linkedModels.has(mId)) {
            relationships.push({ id: relId(), kind: 'USES_MODEL', sourceId: aid, targetId: mId, weight: 1 });
            linkedModels.add(mId);
          }
        }
      }
    }
  }

  // 5. Tools → DataAssets (only linked tools vs PII data)
  for (const agent of source.agents) {
    const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    for (const tool of agent.tools) {
      const tid = `sc-tool-${tool.toLowerCase()}`;
      if (entityIndex.has(tid)) {
        for (const [name, did] of Array.from(dataAssetMap)) {
          if (name.toLowerCase().includes(tool.toLowerCase())) {
            relationships.push({ id: relId(), kind: 'PROCESSES_DATA', sourceId: aid, targetId: did, weight: 2 });
          }
        }
      }
    }
  }

  // 6. Risks → DataAssets (risk description mentions data asset)
  for (const risk of risks) {
    const rid = riskIdMap.get(risk.id.toLowerCase());
    if (!rid) continue;
    const desc = risk.description.toLowerCase();
    for (const [name, did] of Array.from(dataAssetMap)) {
      if (desc.includes(name.toLowerCase().replace('_', ' '))) {
        relationships.push({ id: relId(), kind: 'IMPACTS_RISK', sourceId: did, targetId: rid, weight: 2 });
      }
    }
  }

  // 7. Regulations → Agents (by domain/industry match)
  for (const reg of compliance.applicableRegulations) {
    const regId = regulationIdMap.get(reg.id);
    if (!regId) continue;
    const regLower = reg.name.toLowerCase();
    for (const agent of source.agents) {
      const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (regLower.includes('health') && (agent.type === 'ai_persona' || agent.name.toLowerCase().includes('health'))) {
        relationships.push({ id: relId(), kind: 'REGULATES', sourceId: regId, targetId: aid, weight: 2 });
      } else if (regLower.includes('finance') && (agent.tools.some(t => /payment|stripe|coin|financial/i.test(t)))) {
        relationships.push({ id: relId(), kind: 'REGULATES', sourceId: regId, targetId: aid, weight: 2 });
      } else if (regLower.includes('lgpd') || regLower.includes('gdpr') || regLower.includes('ccpa')) {
        if (agent.tools.some(t => /user|profile|databas/i.test(t))) {
          relationships.push({ id: relId(), kind: 'REGULATES', sourceId: regId, targetId: aid, weight: 1 });
        }
      }
    }
  }

  // 8. Prompts → Agents (by source file path match)
  for (const [hash, sourceFile] of Array.from(promptSourceMap)) {
    const pid = `sc-prompt-${hash}`;
    if (!entityIndex.has(pid)) continue;
    for (const agent of source.agents) {
      if (agent.filePath && sourceFile && agent.filePath === sourceFile) {
        const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        relationships.push({ id: relId(), kind: 'USES_PROMPT', sourceId: aid, targetId: pid, weight: 2 });
        break;
      }
    }
  }

  // 8b. Agents → Risks (by agent name/tools matching risk description)
  for (const risk of risks) {
    const rid = riskIdMap.get(risk.id.toLowerCase());
    if (!rid) continue;
    const desc = (risk.title + ' ' + risk.description).toLowerCase();
    for (const agent of source.agents.slice(0, 20)) {
      const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (!entityIndex.has(aid)) continue;
      if (desc.includes(agent.name.toLowerCase().split(/[\s_]/)[0]) ||
          agent.tools.some(t => desc.includes(t.toLowerCase()))) {
        relationships.push({ id: relId(), kind: 'IMPACTS_RISK', sourceId: aid, targetId: rid, weight: 2 });
      }
    }
  }

  // 9. Memory → Agents (all agents use memory)
  for (const mid of memoryEntityIds) {
    for (const agent of source.agents.slice(0, 3)) {
      const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      relationships.push({ id: relId(), kind: 'USES_MEMORY', sourceId: aid, targetId: mid, weight: 1 });
    }
  }

  // 10. Frameworks → Tools
  for (const fid of frameworkEntityIds) {
    for (const [, provider] of Array.from(toolIdByLabel)) {
      const eid = toolIdByLabel.get(provider.toLowerCase());
      if (eid && entityIndex.has(eid)) {
        relationships.push({ id: relId(), kind: 'INTEGRATES_WITH', sourceId: fid, targetId: eid, weight: 2 });
      }
    }
  }

  // 11. Repo Classification → Evidence
  if (source.classification && source.classification.evidence.length > 0) {
    const classId = 'sc-classification-repo';
    entities.push({ id: classId, kind: 'classification', label: source.classification.category, description: `Confidence: ${source.classification.confidence}% | Evidence: ${source.classification.evidence.join('; ')}` });
    entityIndex.set(classId, entities[entities.length - 1]);
    const evIds = Array.from(evidenceFileMap.values()).slice(0, 3);
    for (const evId of evIds) {
      relationships.push({ id: relId(), kind: 'BASED_ON', sourceId: classId, targetId: evId, weight: 1 });
    }
  }

  // 12. Trust Zone → Agents
  if (enrichment.trustZone) {
    const tzId = 'sc-trust-zone';
    entities.push({ id: tzId, kind: 'external_system', label: `Trust Zone: ${enrichment.trustZone.trustZone}`, description: `Confidence: ${enrichment.trustZone.confidence}%` });
    entityIndex.set(tzId, entities[entities.length - 1]);
    for (const agent of source.agents.slice(0, 5)) {
      const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      relationships.push({ id: relId(), kind: 'DEPLOYS_IN', sourceId: aid, targetId: tzId, weight: 1 });
    }
  }

  // 12b. Control → Evidence (GOVERNS)
  for (const cid of controlEntityIds) {
    const evIds = Array.from(evidenceFileMap.values()).slice(0, 5);
    for (const evId of evIds) {
      relationships.push({ id: relId(), kind: 'GOVERNS', sourceId: cid, targetId: evId, weight: 2 });
    }
  }

  // 12c. Decision → Regulation (REQUIRES_CERT)
  for (const [regId] of Array.from(regulationIdMap)) {
    relationships.push({ id: relId(), kind: 'REQUIRES_CERT', sourceId: decId, targetId: regId, weight: 2 });
  }

  // 12d. Decision → Owner
  relationships.push({ id: relId(), kind: 'OWNED_BY', sourceId: decId, targetId: owner.id, weight: 1 });

  // 12e. Decision → Agent (make decision available to all agents)
  for (const agent of source.agents.slice(0, 5)) {
    const aid = `sc-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (entityIndex.has(aid)) {
      relationships.push({ id: relId(), kind: 'MAKES_DECISION', sourceId: aid, targetId: decId, weight: 2 });
    }
  }

  // 13. Violations → Evidence (source files)
  for (const v of violations) {
    const vid = `sc-violation-${v.rule.toLowerCase()}-${v.file.replace(/[^a-z0-9]/g, '-').slice(-20)}-${v.line}`;
    entities.push({ id: vid, kind: 'risk', label: v.rule, description: `[${v.severity.toUpperCase()}] ${v.message.slice(0, 120)} | ${v.file}:${v.line}` });
    entityIndex.set(vid, entities[entities.length - 1]);
    const eid = evidenceFileMap.get(v.file);
    if (eid) {
      relationships.push({ id: relId(), kind: 'EVIDENCED_BY', sourceId: vid, targetId: eid, weight: v.severity === 'critical' ? 3 : 2 });
    }
  }

  // 13b. Critical risks → Incidents
  for (const risk of risks.filter(r => r.severity === 'critical').slice(0, 10)) {
    const incId = `sc-incident-${risk.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    entities.push({
      id: incId, kind: 'incident', label: risk.title.slice(0, 60),
      description: risk.description.slice(0, 200),
    });
    entityIndex.set(incId, entities[entities.length - 1]);
    const riskId = `sc-risk-${risk.id.toLowerCase()}`;
    if (entityIndex.has(riskId)) {
      relationships.push({ id: relId(), kind: 'TRIGGERS_INCIDENT', sourceId: riskId, targetId: incId, weight: 3 });
    }
    // Incident → Evidence (link to evidence files via risk file match)
    if (risk.file) {
      const eid = evidenceFileMap.get(risk.file);
      if (eid) {
        relationships.push({ id: relId(), kind: 'EVIDENCED_BY', sourceId: incId, targetId: eid, weight: 2 });
      }
    }
  }

  // 14. PII findings as risk entities
  if (enrichment.pii) {
    for (const f of enrichment.pii.findings.slice(0, 30)) {
      const fid = `sc-pii-${f.rule.toLowerCase()}-${f.file.replace(/[^a-z0-9]/g, '-').slice(-15)}-${f.line}`;
      entities.push({ id: fid, kind: 'risk', label: f.rule, description: `[${f.severity.toUpperCase()}] ${f.message.slice(0, 100)} | ${f.file}:${f.line}` });
      entityIndex.set(fid, entities[entities.length - 1]);
      const eid = evidenceFileMap.get(f.file);
      if (eid) relationships.push({ id: relId(), kind: 'EVIDENCED_BY', sourceId: fid, targetId: eid, weight: 2 });
    }
  }

  // 15. Data flows as data_asset entities
  if (enrichment.lineage) {
    for (const flow of enrichment.lineage.flows.slice(0, 20)) {
      const fid = `sc-flow-${flow.id}`;
      entities.push({ id: fid, kind: 'data_asset', label: `Flow: ${flow.source.category} → ${flow.sink.category}`, description: `Risk: ${flow.riskLevel} | ${flow.source.file}:${flow.source.line} → ${flow.sink.file}:${flow.sink.line}` });
      entityIndex.set(fid, entities[entities.length - 1]);
    }
  }

  return { entities, relationships };
}
