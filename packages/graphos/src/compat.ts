import { GraphEngine } from './engine';
import type { GraphEntity, Relationship } from './types';

export type ViewName =
  | 'ceo' | 'cfo' | 'ciso' | 'dpo' | 'compliance' | 'auditor'
  | 'board' | 'constitutional' | 'ecosystem' | 'certification'
  | 'ai_act' | 'agent_governance' | 'data_lineage' | 'risk_propagation';

export interface ViewResult {
  nodes: any[];
  edges: any[];
  summary: Record<string, number | string>;
  title: string;
  description: string;
  cards?: any[];
  risks?: any[];
  score?: number;
  tripleConfidence?: {
    discovery: number;
    governance: number;
    compliance: number;
    overall: number;
    label: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

export type GraphNodeType = string;
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  subtitle?: string;
  emoji?: string;
  score?: number;
  alliance?: string;
  round?: number;
  color: string;
  radius: number;
  payload?: any;
}
export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  sentiment: string;
  label?: string;
  dash?: boolean;
}

type EntityInput = GraphEntity & Record<string, any>;

const entity = (e: EntityInput): GraphEntity => ({
  ...e,
  attrs: { ...(e.attrs ?? {}), ...Object.fromEntries(Object.entries(e).filter(([k]) => !['id', 'kind', 'label', 'description', 'attrs'].includes(k))) },
});

const rel = (id: string, kind: string, sourceId: string, targetId: string, weight = 1, metadata: Record<string, unknown> = {}): Relationship => ({
  id,
  kind,
  sourceId,
  targetId,
  weight,
  metadata,
});

const agentSeeds = [
  ['agent-judge', 'Executive Judge', 'orchestrator', 'critical'],
  ['agent-compliance', 'Compliance Officer', 'monitor', 'high'],
  ['agent-dpo', 'Data Protection Officer', 'monitor', 'high'],
  ['agent-risk', 'Risk Manager', 'classifier', 'high'],
  ['agent-security', 'Security Analyst', 'monitor', 'medium'],
  ['agent-finance', 'Finance Controller', 'assistive', 'medium'],
  ['agent-legal', 'Legal Counsel', 'assistive', 'medium'],
  ['agent-ops', 'Operations Planner', 'assistive', 'low'],
  ['agent-data', 'Data Steward', 'monitor', 'medium'],
  ['agent-model-monitor', 'Model Monitor', 'monitor', 'high'],
  ['agent-incident', 'Incident Responder', 'monitor', 'medium'],
  ['agent-auditor', 'Audit Trail Reviewer', 'monitor', 'medium'],
] as const;

const decisionSeeds = [
  ['dec-001', 'EU Market Expansion', 'CONDITIONAL', 68, 'medium', 'prompt-001', 'risk-001', 'cert-ai-act'],
  ['dec-002', 'Clinical Triage Assistant', 'ESCALATE', 42, 'critical', 'prompt-002', 'risk-002', 'cert-gdpr'],
  ['dec-003', 'VP Hiring Shortlist', 'APPROVE_WITH_CONTROLS', 88, 'high', 'prompt-003', 'risk-003', 'cert-iso42001'],
  ['dec-004', 'Payment Risk Routing', 'CONDITIONAL', 62, 'high', 'prompt-004', 'risk-004', 'cert-dora'],
  ['dec-005', 'M&A Due Diligence', 'REVIEW_REQUIRED', 35, 'critical', 'prompt-005', 'risk-005', 'cert-soc2'],
] as const;

export function buildGovernanceSeed(): { entities: GraphEntity[]; relationships: Relationship[] } {
  const entities: GraphEntity[] = [];
  const relationships: Relationship[] = [];

  for (const [id, label, agentType, riskLevel] of agentSeeds) {
    entities.push(entity({ id, kind: 'agent', label, description: `${label} governance agent`, agentType, riskLevel, status: 'active', aiActRiskClass: riskLevel === 'critical' ? 'high_risk' : 'limited' }));
  }

  entities.push(
    entity({ id: 'owner-ceo', kind: 'owner', label: 'CEO', description: 'Executive accountable owner', role: 'ceo', email: 'ceo@councilia.local' }),
    entity({ id: 'owner-ciso', kind: 'owner', label: 'CISO', description: 'Security accountable owner', role: 'ciso', email: 'ciso@councilia.local' }),
    entity({ id: 'owner-dpo', kind: 'owner', label: 'DPO', description: 'Privacy accountable owner', role: 'dpo', email: 'dpo@councilia.local' }),
    entity({ id: 'model-gpt4', kind: 'model', label: 'GPT-4o', description: 'Primary reasoning model', provider: 'openai', modelId: 'gpt-4o', costPerToken: 0.000005, tokensUsed: 12500000 }),
    entity({ id: 'model-mistral', kind: 'model', label: 'Mistral Large', description: 'EU review model', provider: 'mistral', modelId: 'mistral-large', costPerToken: 0.000004, tokensUsed: 8500000 }),
    entity({ id: 'model-embedding', kind: 'model', label: 'Embedding Model', description: 'Evidence retrieval model', provider: 'openai', modelId: 'text-embedding-3-large', costPerToken: 0.00000013, tokensUsed: 22000000 }),
    entity({ id: 'tool-llm-openrouter', kind: 'tool', label: 'OpenRouter LLM', description: 'LLM routing gateway', toolType: 'api', accessLevel: 'write', exposed: true, hasSecrets: true }),
    entity({ id: 'tool-policy-engine', kind: 'tool', label: 'Policy Engine', description: 'Governance as code checks', toolType: 'function', accessLevel: 'read' }),
    entity({ id: 'tool-evidence-store', kind: 'tool', label: 'Evidence Store', description: 'Audit evidence repository', toolType: 'database', accessLevel: 'write' }),
    entity({ id: 'ext-openrouter', kind: 'external_system', label: 'OpenRouter', description: 'External model router', systemType: 'api', dataResidency: ['US', 'EU'] }),
    entity({ id: 'ext-github', kind: 'external_system', label: 'GitHub', description: 'Source repository', systemType: 'code_host', dataResidency: ['US'] }),
    entity({ id: 'ext-supabase', kind: 'external_system', label: 'Supabase', description: 'Governance database', systemType: 'database', dataResidency: ['EU'] }),
    entity({ id: 'data-prompts', kind: 'data_asset', label: 'Prompt Corpus', description: 'Prompts and reasoning inputs', classification: 'confidential', hasPII: true }),
    entity({ id: 'data-evidence', kind: 'data_asset', label: 'Evidence Vault', description: 'Decision evidence files', classification: 'restricted', hasPII: true }),
    entity({ id: 'cost-llm', kind: 'cost_center', label: 'LLM Spend', description: 'Model execution costs', costUsd: 12450 }),
  );

  const regulations = [
    ['reg-gdpr', 'GDPR (EU) 2016/679', 'EU', 'compliant'],
    ['reg-ai-act', 'EU AI Act', 'EU', 'partial'],
    ['reg-lgpd', 'LGPD', 'BR', 'compliant'],
    ['reg-dora', 'DORA', 'EU', 'partial'],
    ['reg-iso42001', 'ISO 42001', 'ISO', 'compliant'],
  ] as const;
  for (const [id, label, authority, status] of regulations) {
    entities.push(entity({ id, kind: 'regulation', label, description: `${label} obligations`, authority, status, regulationId: id.toUpperCase() }));
  }

  const certificates = [
    ['cert-ai-act', 'AI Act Technical File'], ['cert-gdpr', 'GDPR DPIA'], ['cert-iso42001', 'ISO 42001 Readiness'], ['cert-dora', 'DORA ICT Evidence'], ['cert-soc2', 'SOC2 Control Pack'],
  ] as const;
  for (const [id, label] of certificates) {
    entities.push(entity({ id, kind: 'certificate', label, description: `${label} certificate`, status: 'in_review', certType: 'governance' }));
  }

  for (let i = 1; i <= 12; i++) {
    const padded = String(i).padStart(3, '0');
    const domain = i === 1 ? 'Access Control' : i === 9 ? 'Data Governance' : `CG-AG Control ${i}`;
    entities.push(entity({ id: `ctrl-${padded}`, kind: 'control', label: domain, description: `${domain} control`, framework: 'CG-AG', status: 'active' }));
  }

  for (const [id, label, verdict, score, riskLevel, promptId, riskId] of decisionSeeds) {
    entities.push(entity({ id, kind: 'decision', label, description: `${label} decision`, verdict, score, confidence: 80, riskLevel, agentId: 'agent-judge' }));
    entities.push(entity({ id: promptId, kind: 'prompt', label: `${label} Prompt`, description: `Governed prompt for ${label}`, riskLevel, ownerId: 'owner-ceo', hash: `${promptId}-hash` }));
    entities.push(entity({ id: riskId, kind: 'risk', label: `${label} Risk`, description: `Material risk for ${label}`, severity: riskLevel, riskLevel, impact: score }));
    entities.push(entity({ id: `ev-${id}-a`, kind: 'evidence', label: `${label} Evidence A`, description: 'Primary evidence', evidenceType: 'document', source: 'scanner' }));
    entities.push(entity({ id: `ev-${id}-b`, kind: 'evidence', label: `${label} Evidence B`, description: 'Secondary evidence', evidenceType: 'ledger', source: 'governance_ledger' }));
  }

  agentSeeds.forEach(([agentId], idx) => {
    const ownerId = idx < 4 ? 'owner-ceo' : idx < 8 ? 'owner-ciso' : 'owner-dpo';
    const toolId = idx % 3 === 0 ? 'tool-llm-openrouter' : idx % 3 === 1 ? 'tool-policy-engine' : 'tool-evidence-store';
    const modelId = idx % 3 === 0 ? 'model-gpt4' : idx % 3 === 1 ? 'model-mistral' : 'model-embedding';
    relationships.push(rel(`rel-owner-${agentId}`, 'OWNED_BY', agentId, ownerId));
    relationships.push(rel(`rel-tool-${agentId}`, 'USES_TOOL', agentId, toolId, 3));
    relationships.push(rel(`rel-model-${agentId}`, 'USES_MODEL', agentId, modelId, 2));
  });

  relationships.push(
    rel('rel-tool-openrouter-ext', 'ACCESSES_SYSTEM', 'tool-llm-openrouter', 'ext-openrouter'),
    rel('rel-tool-policy-ext', 'ACCESSES_SYSTEM', 'tool-policy-engine', 'ext-github'),
    rel('rel-tool-evidence-ext', 'ACCESSES_SYSTEM', 'tool-evidence-store', 'ext-supabase'),
    rel('rel-tool-openrouter-data', 'PROCESSES_DATA', 'tool-llm-openrouter', 'data-prompts'),
    rel('rel-tool-evidence-data', 'PROCESSES_DATA', 'tool-evidence-store', 'data-evidence'),
  );

  const regCycle = ['reg-ai-act', 'reg-gdpr', 'reg-lgpd', 'reg-dora', 'reg-iso42001'];
  for (const [id, _label, verdict, score, _riskLevel, promptId, riskId, certId] of decisionSeeds) {
    const idx = Number(id.slice(-1)) - 1;
    relationships.push(rel(`rel-decision-${id}`, 'MAKES_DECISION', 'agent-judge', id, score, { verdict }));
    relationships.push(rel(`rel-prompt-agent-${promptId}`, 'USES_PROMPT', 'agent-judge', promptId));
    relationships.push(rel(`rel-prompt-decision-${id}`, 'GENERATED_BY_PROMPT', id, promptId));
    relationships.push(rel(`rel-model-decision-${id}`, 'USES_MODEL', id, 'model-gpt4'));
    relationships.push(rel(`rel-ev-${id}-a`, 'EVIDENCED_BY', id, `ev-${id}-a`, 2));
    relationships.push(rel(`rel-ev-${id}-b`, 'EVIDENCED_BY', id, `ev-${id}-b`, 2));
    relationships.push(rel(`rel-risk-${id}`, 'IMPACTS_RISK', id, riskId, 5));
    relationships.push(rel(`rel-reg-${id}`, 'REGULATES', regCycle[idx], id));
    relationships.push(rel(`rel-cert-${id}`, 'REQUIRES_CERT', id, certId));
    relationships.push(rel(`rel-cost-${id}`, 'COSTS', id, 'cost-llm', 1));
  }

  const governingControls = ['ctrl-002', 'ctrl-003', 'ctrl-004', 'ctrl-005', 'ctrl-006', 'ctrl-007', 'ctrl-008', 'ctrl-009'];
  for (const controlId of governingControls) {
    for (const [, , , , , promptId] of decisionSeeds) {
      relationships.push(rel(`rel-governs-${controlId}-${promptId}`, 'GOVERNS', controlId, promptId));
    }
  }

  for (let i = 1; i <= 12; i++) {
    const controlId = `ctrl-${String(i).padStart(3, '0')}`;
    const regId = regCycle[(i - 1) % regCycle.length];
    relationships.push(rel(`rel-control-reg-${controlId}`, 'GOVERNS', controlId, regId));
  }

  return { entities, relationships };
}

export function buildFullGraph(engine = new GraphEngine()) {
  const seed = buildGovernanceSeed();
  engine.load(seed.entities, seed.relationships);
  return engine;
}

function all(engine: GraphEngine) {
  return { entities: Array.from(engine.graph.entities.values()), rels: engine.graph.relationships };
}

function view(engine: GraphEngine, title: string, description: string, entities: GraphEntity[], rels: Relationship[], summary: Record<string, number | string>): ViewResult {
  const graph = engine.convertToVisualization(entities, rels);
  const tc = engine.computeTripleConfidence();
  return {
    ...graph,
    summary: {
      ...summary,
      discoveryConfidence: tc.discovery,
      governanceConfidence: tc.governance,
      complianceConfidence: tc.compliance,
      overallConfidence: tc.overall,
      confidenceLabel: tc.label,
    },
    title,
    description,
    tripleConfidence: tc,
  };
}

export function buildCEOView(engine: GraphEngine): ViewResult {
  const { entities, rels } = all(engine);
  const agents = engine.getEntitiesByKind('agent');
  const criticalAgents = agents.filter((a: any) => a.riskLevel === 'critical').length;
  return view(engine, 'CEO Governance Overview', 'Executive readiness across governed agents.', entities, rels, {
    agents: agents.length,
    criticalAgents,
    risks: engine.getEntitiesByKind('risk').length,
    evidence: engine.getEntitiesByKind('evidence').length,
  });
}

export function buildCFOView(engine: GraphEngine): ViewResult {
  const decisions = engine.getEntitiesByKind('decision') as any[];
  const costs = engine.getEntitiesByKind('cost_center') as any[];
  const totalCost = costs.reduce((sum, c) => sum + (c.costUsd ?? 0), 0);
  return view(engine, 'CFO Cost View', 'Cost and model usage by governed decision.', [...decisions, ...costs], engine.getRelationships().filter(r => r.kind === 'COSTS' || r.kind === 'USES_MODEL'), {
    totalDecisions: decisions.length,
    totalCostUsd: totalCost,
    avgCostPerDecision: decisions.length ? Math.round(totalCost / decisions.length) : 0,
  });
}

export function buildAuditorView(engine: GraphEngine, decisionId?: string): ViewResult {
  const selected = decisionId ?? engine.getEntitiesByKind('decision')[0]?.id;
  const reconstructed = selected ? engine.reconstructDecision(selected) : { entities: [], rels: [] };
  const decision = reconstructed.entities.find(e => e.id === selected) as any;
  const agentsInvolved = reconstructed.entities.filter(e => e.kind === 'agent').length;
  const evidenceCount = reconstructed.entities.filter(e => e.kind === 'evidence').length;
  return view(engine, 'Auditor Decision Reconstruction', 'Trace who decided, with which prompt, model, evidence and regulation.', reconstructed.entities, reconstructed.rels, {
    decisionId: selected ?? '',
    verdict: decision?.verdict ?? decision?.attrs?.verdict ?? 'unknown',
    agentsInvolved,
    evidenceCount,
  });
}

export function buildConstitutionalView(engine: GraphEngine): ViewResult {
  const controls = engine.getEntitiesByKind('control');
  const prompts = engine.getEntitiesByKind('prompt');
  const rels = engine.getRelationships().filter(r => r.kind === 'GOVERNS');
  return view(engine, 'Constitutional Controls', 'Controls that govern prompts, regulations and certification posture.', [...controls, ...prompts, ...engine.getEntitiesByKind('regulation')], rels, {
    totalControls: controls.length,
    governedPrompts: new Set(rels.filter(r => r.targetId.startsWith('prompt-')).map(r => r.targetId)).size,
  });
}

export function buildAgentEcosystemView(engine: GraphEngine): ViewResult {
  const kinds = new Set(['agent', 'tool', 'external_system', 'data_asset', 'model', 'owner']);
  const entities = Array.from(engine.graph.entities.values()).filter(e => kinds.has(e.kind));
  const rels = engine.getRelationships().filter(r => ['USES_TOOL', 'ACCESSES_SYSTEM', 'PROCESSES_DATA', 'USES_MODEL', 'OWNED_BY'].includes(r.kind));
  return view(engine, 'Agent Ecosystem', 'Agents, tools, models, data assets and external systems.', entities, rels, {
    agents: engine.getEntitiesByKind('agent').length,
    tools: engine.getEntitiesByKind('tool').length,
    externalSystems: engine.getEntitiesByKind('external_system').length,
  });
}

export function buildComplianceView(engine: GraphEngine): ViewResult {
  const kinds = new Set(['decision', 'regulation', 'certificate', 'agent']);
  const entities = Array.from(engine.graph.entities.values()).filter(e => kinds.has(e.kind));
  const rels = engine.getRelationships().filter(r => ['REGULATES', 'REQUIRES_CERT', 'MAKES_DECISION'].includes(r.kind));
  return view(engine, 'Compliance View', 'Regulatory coverage and certificate evidence by decision.', entities, rels, {
    regulations: engine.getEntitiesByKind('regulation').length,
    certificates: engine.getEntitiesByKind('certificate').length,
    nonCompliantRegulations: (engine.getEntitiesByKind('regulation') as any[]).filter(r => r.status === 'non_compliant').length,
  });
}

export function buildBoardView(engine: GraphEngine): ViewResult {
  const risks = engine.getEntitiesByKind('risk') as any[];
  const incidents = engine.getEntitiesByKind('incident') as any[];
  const criticalAgents = (engine.getEntitiesByKind('agent') as any[]).filter(a => a.riskLevel === 'critical').length;
  const exposure = risks.reduce((sum, risk) => sum + (risk.riskLevel === 'critical' ? 25 : risk.riskLevel === 'high' ? 15 : 8), 0);
  return view(engine, 'Board Risk View', 'Material risk exposure for board oversight.', [...risks, ...engine.getEntitiesByKind('agent')], engine.getRelationships().filter(r => r.kind === 'IMPACTS_RISK'), {
    criticalAgents,
    openIncidents: incidents.filter(i => i.status !== 'closed').length,
    nonCompliantRegulations: (engine.getEntitiesByKind('regulation') as any[]).filter(r => r.status === 'non_compliant').length,
    totalRiskExposure: String(exposure),
  });
}

export function buildCertificationView(engine: GraphEngine): ViewResult {
  const entities = [...engine.getEntitiesByKind('certificate'), ...engine.getEntitiesByKind('control'), ...engine.getEntitiesByKind('decision')];
  const rels = engine.getRelationships().filter(r => r.kind === 'REQUIRES_CERT' || r.kind === 'GOVERNS');
  return view(engine, 'Certification Readiness', 'Certification artifacts and required controls.', entities, rels, {
    totalCertificates: engine.getEntitiesByKind('certificate').length,
    controls: engine.getEntitiesByKind('control').length,
  });
}

export function buildDataLineageView(engine: GraphEngine, lineageFlows?: Array<{
  id: string;
  source: { type: string; category: string; file: string; line: number; content: string };
  transformation: { type: string; category: string; file: string; line: number; content: string } | null;
  sink: { type: string; category: string; file: string; line: number; content: string };
  riskLevel: string;
  confidence: number;
  evidence: string[];
}>): ViewResult {
  // Build lineage graph from engine entities when no raw flows are provided
  const dataAssets = engine.getEntitiesByKind('data_asset');
  const externalSystems = engine.getEntitiesByKind('external_system');
  const tools = engine.getEntitiesByKind('tool');
  const agents = engine.getEntitiesByKind('agent');
  const processRels = engine.getRelationships().filter(r => r.kind === 'PROCESSES_DATA' || r.kind === 'ACCESSES_SYSTEM' || r.kind === 'USES_TOOL');

  // If raw flows provided, synthesize nodes from them
  const flowEntities: GraphEntity[] = [];
  const flowRels: Relationship[] = [];

  if (lineageFlows && lineageFlows.length > 0) {
    const seen = new Set<string>();
    lineageFlows.forEach((flow, idx) => {
      const srcId = `flow-src-${flow.id}`;
      const sinkId = `flow-sink-${flow.id}`;
      if (!seen.has(srcId)) {
        seen.add(srcId);
        flowEntities.push({ id: srcId, kind: 'data_asset', label: `${flow.source.category} source`, description: `${flow.source.file}:${flow.source.line}` });
      }
      if (!seen.has(sinkId)) {
        seen.add(sinkId);
        flowEntities.push({ id: sinkId, kind: 'external_system', label: `${flow.sink.category} sink`, description: `${flow.sink.file}:${flow.sink.line}` });
      }
      if (flow.transformation) {
        const trId = `flow-tr-${flow.id}`;
        if (!seen.has(trId)) {
          seen.add(trId);
          flowEntities.push({ id: trId, kind: 'tool', label: `${flow.transformation.category} transform`, description: flow.transformation.content });
        }
        flowRels.push({ id: `rel-src-tr-${idx}`, kind: 'PROCESSES_DATA', sourceId: srcId, targetId: trId, weight: 1 });
        flowRels.push({ id: `rel-tr-sink-${idx}`, kind: 'ACCESSES_SYSTEM', sourceId: trId, targetId: sinkId, weight: 1 });
      } else {
        flowRels.push({ id: `rel-src-sink-${idx}`, kind: 'PROCESSES_DATA', sourceId: srcId, targetId: sinkId, weight: flow.riskLevel === 'critical' ? 5 : 2 });
      }
    });
  }

  const allEntities = flowEntities.length > 0
    ? flowEntities
    : [...dataAssets, ...tools, ...externalSystems, ...agents];
  const allRels = flowEntities.length > 0 ? flowRels : processRels;

  const criticalFlows = (lineageFlows ?? []).filter(f => f.riskLevel === 'critical').length;
  const highFlows = (lineageFlows ?? []).filter(f => f.riskLevel === 'high').length;

  return view(engine, 'Data Lineage', 'Source → Transform → Sink data flows with PII and risk classification.', allEntities, allRels, {
    totalFlows: lineageFlows?.length ?? processRels.length,
    criticalFlows,
    highFlows,
    dataAssets: dataAssets.length,
    externalSystems: externalSystems.length,
  });
}

export function buildRiskPropagationView(engine: GraphEngine, sourceId?: string): ViewResult {
  const sourceEntity = sourceId
    ? engine.getEntity(sourceId)
    : engine.getEntitiesByKind('agent').find((a: any) => a.riskLevel === 'critical' || a.attrs?.riskLevel === 'critical') ?? engine.getEntitiesByKind('agent')[0];

  if (!sourceEntity) {
    return view(engine, 'Risk Propagation', 'Cascading impact from a compromised agent.', [], [], { totalAffected: 0, maxExposure: 0 });
  }

  const { entities, rels, exposureMap } = engine.propagateRisk(sourceEntity.id);

  // Inject exposureScore into node payload for visualization coloring
  const enrichedEntities = entities.map(e => ({
    ...e,
    attrs: { ...(e.attrs ?? {}), exposureScore: exposureMap.get(e.id) ?? 0 },
    score: exposureMap.get(e.id) ?? 0,
  }));

  const critical = Array.from(exposureMap.values()).filter(s => s >= 70).length;
  const high = Array.from(exposureMap.values()).filter(s => s >= 40 && s < 70).length;
  const maxExposure = Math.max(0, ...exposureMap.values());

  return view(
    engine,
    'Risk Propagation',
    `Cascading impact if ${sourceEntity.label} is compromised. Exposure decays 40% per hop.`,
    enrichedEntities,
    rels,
    {
      source: sourceEntity.label,
      totalAffected: entities.length - 1,
      criticalExposure: critical,
      highExposure: high,
      maxExposure,
    },
  );
}

export const VIEW_META: Record<ViewName, { title: string; description: string; label: string; icon: string; question: string }> = {
  ceo: { title: 'CEO Governance Overview', description: 'Executive readiness across governed agents.', label: 'CEO', icon: 'S', question: 'Are we ready to scale?' },
  cfo: { title: 'CFO Cost View', description: 'Cost and model usage by governed decision.', label: 'CFO', icon: 'C', question: 'What does it cost?' },
  ciso: { title: 'CISO Risk View', description: 'Security exposure across agents and tools.', label: 'CISO', icon: 'R', question: 'Where is the risk?' },
  dpo: { title: 'DPO Privacy View', description: 'Privacy exposure and legal basis.', label: 'DPO', icon: 'P', question: 'Where is PII?' },
  compliance: { title: 'Compliance View', description: 'Regulatory coverage by decision.', label: 'Compliance', icon: 'K', question: 'Are we compliant?' },
  auditor: { title: 'Auditor Decision Reconstruction', description: 'Trace every governed decision.', label: 'Auditor', icon: 'A', question: 'Can we prove it?' },
  board: { title: 'Board Risk View', description: 'Material risk exposure.', label: 'Board', icon: 'B', question: 'What can hurt the company?' },
  constitutional: { title: 'Constitutional Controls', description: 'Controls that govern agents and prompts.', label: 'Constitutional', icon: 'L', question: 'What governs the system?' },
  ecosystem: { title: 'Agent Ecosystem', description: 'Agent, tool and model topology.', label: 'Ecosystem', icon: 'E', question: 'How does it connect?' },
  certification: { title: 'Certification Readiness', description: 'Certificates and controls.', label: 'Certification', icon: 'T', question: 'Can we certify?' },
  ai_act: { title: 'AI Act View', description: 'AI Act risk and evidence.', label: 'AI Act', icon: 'AI', question: 'What is in scope?' },
  agent_governance: { title: 'Agent Governance', description: 'Agent inventory and ownership.', label: 'Agent Governance', icon: 'AG', question: 'Who owns each agent?' },
  data_lineage: { title: 'Data Lineage', description: 'Source → Transform → Sink data flows.', label: 'Data Lineage', icon: 'DL', question: 'Where does data go?' },
  risk_propagation: { title: 'Risk Propagation', description: 'Cascading impact from a compromised agent.', label: 'Risk Propagation', icon: 'RP', question: 'What breaks if an agent fails?' },
};

const cisoLike = (engine: GraphEngine) => buildAgentEcosystemView(engine);
const dpoLike = (engine: GraphEngine) => buildComplianceView(engine);
const aiActLike = (engine: GraphEngine) => buildComplianceView(engine);
const agentGovernanceLike = (engine: GraphEngine) => buildCEOView(engine);

export const VIEW_BUILDERS: Record<ViewName, (e: GraphEngine, id?: string) => ViewResult> = {
  ceo: buildCEOView,
  cfo: buildCFOView,
  ciso: cisoLike,
  dpo: dpoLike,
  compliance: buildComplianceView,
  auditor: buildAuditorView,
  board: buildBoardView,
  constitutional: buildConstitutionalView,
  ecosystem: buildAgentEcosystemView,
  certification: buildCertificationView,
  ai_act: aiActLike,
  agent_governance: agentGovernanceLike,
  data_lineage: (e: GraphEngine, _id?: string) => buildDataLineageView(e),
  risk_propagation: (e: GraphEngine, id?: string) => buildRiskPropagationView(e, id),
};
