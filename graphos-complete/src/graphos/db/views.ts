import { GraphRepository } from './repository';
import type { ViewResult } from '@council/graphos';

/** CEO View — DB-backed */
export async function buildCEOView(repo: GraphRepository): Promise<ViewResult> {
  const agents = await repo.getEntitiesByKind('agent') as any[];
  const decisions = await repo.getEntitiesByKind('decision') as any[];
  const risks = await repo.getEntitiesByKind('risk') as any[];
  const controls = await repo.getEntitiesByKind('control') as any[];
  const incidents = await repo.getEntitiesByKind('incident') as any[];
  const regulations = await repo.getEntitiesByKind('regulation') as any[];

  const critical = agents.filter(a => a.critical);
  const highRisks = risks.filter(r => r.severity === 'high' || r.severity === 'critical');
  const openIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed');
  const compliantRegs = regulations.filter(r => r.status === 'compliant');
  const complianceScore = regulations.length > 0
    ? Math.round((compliantRegs.length / regulations.length) * 100)
    : 91;

  const allEntities = agents.slice(0, 20);
  const allRels = (await repo.getRelationships()).filter(r =>
    allEntities.some(e => e.id === r.sourceId) || allEntities.some(e => e.id === r.targetId)
  ).slice(0, 40);
  const { nodes, edges } = repo.convertToVisualization(allEntities, allRels);

  return {
    nodes, edges,
    summary: {
      agents: agents.length,
      criticalAgents: critical.length,
      highRiskItems: highRisks.length,
      openIncidents: openIncidents.length,
      complianceScore: `${complianceScore}%`,
      decisions: decisions.length,
      controls: controls.length,
    },
    title: 'CEO — Executive Overview',
    description: 'Estamos expostos? Visão geral do ecossistema de agentes, riscos e conformidade.',
  };
}

/** CFO View — DB-backed */
export async function buildCFOView(repo: GraphRepository): Promise<ViewResult> {
  const agents = await repo.getEntitiesByKind('agent') as any[];
  const decisions = await repo.getEntitiesByKind('decision') as any[];
  const models = await repo.getEntitiesByKind('model') as any[];
  const risks = await repo.getEntitiesByKind('risk') as any[];
  const financialRisks = risks.filter(r => r.riskType === 'financial');

  const totalDecisions = decisions.length;
  const avgCostPerDecision = decisions.reduce((s: number, d: any) => s + (d.costUsd ?? 0), 0) / (totalDecisions || 1);
  const totalTokens = models.reduce((s: number, m: any) => s + (m.tokensUsed ?? 0), 0);
  const totalModelCost = models.reduce((s: number, m: any) => s + (m.costPerToken ?? 0) * (m.tokensUsed ?? 0), 0);
  const avgFinancialRisk = financialRisks.length > 0
    ? financialRisks.reduce((s: number, r: any) => s + (r.impact ?? 0), 0) / financialRisks.length
    : 0;

  const { nodes, edges } = repo.convertToVisualization(
    [...agents.slice(0, 10), ...decisions.slice(0, 10), ...models.slice(0, 5), ...financialRisks.slice(0, 5)],
    (await repo.getRelationships()).filter(r => r.kind === 'COSTS' || r.kind === 'MAKES_DECISION' || r.kind === 'IMPACTS_RISK'),
  );

  return {
    nodes, edges,
    summary: {
      totalDecisions,
      avgCostPerDecision: `$${avgCostPerDecision.toFixed(2)}`,
      totalModelCost: `$${totalModelCost.toFixed(2)}`,
      totalTokens: totalTokens.toLocaleString(),
      financialRisks: financialRisks.length,
      avgRiskImpact: avgFinancialRisk.toFixed(1),
    },
    title: 'CFO — Financial Risk & Cost Attribution',
    description: 'Quanto custa cada decisão? Qual o risco financeiro acumulado?',
  };
}

/** CISO View — DB-backed */
export async function buildCISOView(repo: GraphRepository): Promise<ViewResult> {
  const agents = await repo.getEntitiesByKind('agent') as any[];
  const tools = await repo.getEntitiesByKind('tool') as any[];
  const extSystems = await repo.getEntitiesByKind('external_system') as any[];
  const risks = await repo.getEntitiesByKind('risk') as any[];

  const agentsWithoutOwner = agents.filter((a: any) => !a.ownerId && a.critical);
  const exposedTools = tools.filter(t => t.exposed);
  const toolsWithSecrets = tools.filter(t => t.hasSecrets);
  const securityRisks = risks.filter(r => r.riskType === 'security' && (r.severity === 'high' || r.severity === 'critical'));

  const focusEntities = [
    ...agentsWithoutOwner, ...exposedTools, ...toolsWithSecrets,
    ...extSystems.filter((s: any) => s.securityLevel === 'low'),
    ...securityRisks,
  ];
  const focusIds = new Set(focusEntities.map(e => e.id));
  const rels = (await repo.getRelationships()).filter(r =>
    focusIds.has(r.sourceId) || focusIds.has(r.targetId) ||
    r.kind === 'USES_TOOL' || r.kind === 'ACCESSES_SYSTEM' || r.kind === 'IMPACTS_RISK'
  );

  const { nodes, edges } = repo.convertToVisualization(focusEntities, rels);

  return {
    nodes, edges,
    summary: {
      agentsNoOwner: agentsWithoutOwner.length,
      exposedTools: exposedTools.length,
      toolsWithSecrets: toolsWithSecrets.length,
      lowSecuritySystems: extSystems.filter((s: any) => s.securityLevel === 'low').length,
      criticalSecurityRisks: securityRisks.length,
      totalAgents: agents.length,
    },
    title: 'CISO — Security & Vulnerability View',
    description: 'Onde posso ser atacado? Agentes sem dono, ferramentas expostas, sistemas vulneráveis.',
  };
}

/** DPO View — DB-backed */
export async function buildDPOView(repo: GraphRepository): Promise<ViewResult> {
  const dataAssets = await repo.getEntitiesByKind('data_asset') as any[];
  const regulations = await repo.getEntitiesByKind('regulation') as any[];
  const piiAssets = dataAssets.filter(d => d.hasPII);
  const consentAssets = dataAssets.filter(d => d.legalBasis?.includes('CONSENT'));

  const piiIds = new Set(piiAssets.map(a => a.id));
  const rels = (await repo.getRelationships()).filter(r =>
    piiIds.has(r.targetId) || r.kind === 'REGULATES' || r.kind === 'PROCESSES_DATA'
  );
  const agentIds = new Set(rels.map(r => r.sourceId));
  const agents = (await Promise.all(
    Array.from(agentIds).map(id => repo.getEntity(id)),
  )).filter(Boolean) as any[];

  const { nodes, edges } = repo.convertToVisualization(
    [...agents, ...piiAssets, ...regulations],
    rels,
  );

  return {
    nodes, edges,
    summary: {
      totalDataAssets: dataAssets.length,
      assetsWithPII: piiAssets.length,
      requiresConsent: consentAssets.length,
      regulations: regulations.length,
      avgRetentionDays: dataAssets.length > 0
        ? Math.round(dataAssets.reduce((s: number, d: any) => s + (d.retentionDays ?? 0), 0) / dataAssets.length)
        : 0,
    },
    title: 'DPO — Privacy & Data Protection View',
    description: 'Onde existe PII? Quais dados pessoais são processados e sob qual base legal?',
  };
}

/** Compliance View — DB-backed */
export async function buildComplianceView(repo: GraphRepository): Promise<ViewResult> {
  const regulations = await repo.getEntitiesByKind('regulation') as any[];
  const controls = await repo.getEntitiesByKind('control') as any[];
  const certificates = await repo.getEntitiesByKind('certificate') as any[];
  const agents = await repo.getEntitiesByKind('agent') as any[];

  const compliant = regulations.filter(r => r.status === 'compliant').length;
  const nonCompliant = regulations.filter(r => r.status === 'non_compliant').length;
  const validCerts = certificates.filter(c => c.status === 'valid' || c.status === 'expiring');
  const implementedControls = controls.filter(c => c.status === 'implemented' || c.status === 'partial');

  const regIds = new Set(regulations.map(r => r.id));
  const rels = (await repo.getRelationships()).filter(r =>
    regIds.has(r.sourceId) || regIds.has(r.targetId) ||
    r.kind === 'REQUIRES_CERT' || r.kind === 'REGULATES'
  );

  const { nodes, edges } = repo.convertToVisualization(
    [...regulations, ...controls, ...certificates, ...agents.slice(0, 5)],
    rels,
  );

  return {
    nodes, edges,
    summary: {
      totalRegulations: regulations.length,
      compliant,
      nonCompliant,
      complianceRate: regulations.length > 0 ? `${Math.round((compliant / regulations.length) * 100)}%` : 'N/A',
      validCertificates: validCerts.length,
      implementedControls: implementedControls.length,
    },
    title: 'Compliance — Regulatory Conformance View',
    description: 'Estamos conformes com AI Act, GDPR, LGPD, DORA, NIS2, ISO 42001?',
  };
}

/** Auditor View — DB-backed */
export async function buildAuditorView(repo: GraphRepository, decisionId?: string): Promise<ViewResult> {
  const decisions = await repo.getEntitiesByKind('decision') as any[];
  const target = decisionId
    ? decisions.find(d => d.id === decisionId)
    : decisions[0];

  if (!target) {
    return {
      nodes: [], edges: [], summary: { error: 'No decisions found' },
      title: 'Auditor — Decision Reconstruction',
      description: 'Nenhuma decisão encontrada para reconstruir.',
    };
  }

  const { entities, rels } = await repo.reconstructDecision(target.id);
  const { nodes, edges } = repo.convertToVisualization(entities, rels);

  const evidenceItems = entities.filter(e => e.kind === 'evidence');
  const agentsInvolved = entities.filter(e => e.kind === 'agent');
  const regsImpacted = entities.filter(e => e.kind === 'regulation');
  const promptsUsed = entities.filter(e => e.kind === 'prompt');
  const modelsUsed = entities.filter(e => e.kind === 'model');

  return {
    nodes, edges,
    summary: {
      decisionId: target.id,
      verdict: target.verdict,
      score: target.score,
      confidence: `${target.confidence}%`,
      agentsInvolved: agentsInvolved.length,
      evidenceCount: evidenceItems.length,
      regulationsImpacted: regsImpacted.length,
      promptsUsed: promptsUsed.length,
      modelsUsed: modelsUsed.length,
      costUsd: target.costUsd ? `$${target.costUsd}` : 'N/A',
    },
    title: `Auditor — Decision Reconstruction: ${target.label}`,
    description: 'Consigo reconstruir uma decisão? Cadeia completa: quem decidiu, qual modelo, qual evidência, quem aprovou.',
  };
}

/** Board View — DB-backed */
export async function buildBoardView(repo: GraphRepository): Promise<ViewResult> {
  const risks = await repo.getEntitiesByKind('risk') as any[];
  const agents = await repo.getEntitiesByKind('agent') as any[];
  const incidents = await repo.getEntitiesByKind('incident') as any[];
  const regulations = await repo.getEntitiesByKind('regulation') as any[];

  const topRisks = risks
    .filter(r => r.severity === 'critical' || r.severity === 'high')
    .sort((a: any, b: any) => (b.impact ?? 0) - (a.impact ?? 0))
    .slice(0, 10);

  const criticalAgents = agents
    .filter((a: any) => a.critical)
    .sort((a: any, b: any) => (b.riskLevel === 'critical' ? 1 : 0) - (a.riskLevel === 'critical' ? 1 : 0))
    .slice(0, 10);

  const openIncidents = incidents.filter(i => i.status !== 'closed');
  const nonCompliant = regulations.filter(r => r.status === 'non_compliant');

  const topIds = new Set([...topRisks, ...criticalAgents].map(e => e.id));
  const rels = (await repo.getRelationships()).filter(r =>
    topIds.has(r.sourceId) || topIds.has(r.targetId) ||
    r.kind === 'IMPACTS_RISK' || r.kind === 'MITIGATED_BY'
  );

  const { nodes, edges } = repo.convertToVisualization(
    [...topRisks, ...criticalAgents, ...openIncidents.slice(0, 5), ...nonCompliant],
    rels,
  );

  return {
    nodes, edges,
    summary: {
      topRisks: topRisks.length,
      criticalAgents: criticalAgents.length,
      openIncidents: openIncidents.length,
      nonCompliantRegulations: nonCompliant.length,
      totalRiskExposure: risks.reduce((s: number, r: any) => s + (r.impact ?? 0), 0).toFixed(0),
      regulatoryExposure: nonCompliant.map((r: any) => r.regulationId).join(', '),
    },
    title: 'Board — Material Risk Dashboard',
    description: 'Onde está o risco material? Top riscos, agentes críticos e exposição regulatória.',
  };
}

/** Constitutional View — DB-backed */
export async function buildConstitutionalView(repo: GraphRepository): Promise<ViewResult> {
  const controls = await repo.getEntitiesByKind('control') as any[];
  const agents = await repo.getEntitiesByKind('agent') as any[];
  const certificates = await repo.getEntitiesByKind('certificate') as any[];
  const evidence = await repo.getEntitiesByKind('evidence') as any[];

  const cgagControls = controls.filter((c: any) => c.framework === 'CG-AG');
  const implemented = cgagControls.filter((c: any) => c.status === 'implemented');
  const exempted = cgagControls.filter((c: any) => c.status === 'exempted');
  const notImplemented = cgagControls.filter((c: any) => c.status === 'not_implemented');

  const rels = (await repo.getRelationships()).filter(r =>
    r.kind === 'GOVERNS' || r.kind === 'APPEALS_CONTROL' ||
    r.kind === 'EVIDENCED_BY' || r.kind === 'REQUIRES_CERT'
  );

  const { nodes, edges } = repo.convertToVisualization(
    [...cgagControls, ...agents.slice(0, 10), ...certificates, ...evidence.slice(0, 10)],
    rels,
  );

  const score = cgagControls.length > 0
    ? Math.round((implemented.length / cgagControls.length) * 100)
    : 0;

  return {
    nodes, edges,
    summary: {
      totalControls: cgagControls.length,
      implemented: implemented.length,
      notImplemented: notImplemented.length,
      exempted: exempted.length,
      cgagScore: `${score}%`,
      evidenceCount: evidence.length,
      certifications: certificates.length,
    },
    title: 'Constitutional Council — CG-AG Compliance View',
    description: 'A constituição está sendo respeitada? Controles, evidências, certificações e apelações.',
  };
}

/** Agent Ecosystem View — DB-backed */
export async function buildAgentEcosystemView(repo: GraphRepository): Promise<ViewResult> {
  const agents = await repo.getEntitiesByKind('agent') as any[];
  const tools = await repo.getEntitiesByKind('tool') as any[];
  const models = await repo.getEntitiesByKind('model') as any[];
  const owners = await repo.getEntitiesByKind('owner') as any[];

  const rels = (await repo.getRelationships()).filter(r =>
    r.kind === 'USES_TOOL' || r.kind === 'OWNED_BY' ||
    r.kind === 'DEPENDS_ON' || r.kind === 'CONTAINS'
  );

  const { nodes, edges } = repo.convertToVisualization(
    [...agents, ...tools, ...models, ...owners],
    rels,
  );

  return {
    nodes, edges,
    summary: {
      totalAgents: agents.length,
      criticalAgents: agents.filter((a: any) => a.critical).length,
      tools: tools.length,
      models: models.length,
      owners: owners.length,
      dependencies: rels.filter(r => r.kind === 'DEPENDS_ON').length,
    },
    title: 'Agent Ecosystem — Full Topology',
    description: 'Quais agentes existem e como se relacionam? Mapa completo do ecossistema.',
  };
}

/** Certification View — DB-backed */
export async function buildCertificationView(repo: GraphRepository): Promise<ViewResult> {
  const certificates = await repo.getEntitiesByKind('certificate') as any[];
  const controls = await repo.getEntitiesByKind('control') as any[];
  const regulations = await repo.getEntitiesByKind('regulation') as any[];
  const evidence = await repo.getEntitiesByKind('evidence') as any[];

  const valid = certificates.filter(c => c.status === 'valid');
  const expiring = certificates.filter(c => c.status === 'expiring');
  const expired = certificates.filter(c => c.status === 'expired');

  const controlIdsWithCert = new Set(controls.flatMap((c: any) => c.certificationIds ?? []));
  const controlsWithoutCert = controls.filter((c: any) => !c.certificationIds?.length);

  const rels = (await repo.getRelationships()).filter(r =>
    r.kind === 'REQUIRES_CERT' || r.kind === 'EVIDENCED_BY' || r.kind === 'GOVERNS'
  );

  const { nodes, edges } = repo.convertToVisualization(
    [...certificates, ...controls, ...regulations, ...evidence.slice(0, 10)],
    rels,
  );

  return {
    nodes, edges,
    summary: {
      totalCertificates: certificates.length,
      validCertificates: valid.length,
      expiringCertificates: expiring.length,
      expired: expired.length,
      controlsWithCert: certificates.length > 0 ? controlIdsWithCert.size : 0,
      controlsWithoutCert: controlsWithoutCert.length,
      certificationCoverage: certificates.length > 0
        ? `${Math.round((controlIdsWithCert.size / controls.length) * 100)}%`
        : '0%',
    },
    title: 'Certification — Readiness Dashboard',
    description: 'Posso emitir o certificado? Quais controles têm certificação e quais estão pendentes?',
  };
}

/** AI Act View — DB-backed */
export async function buildAIActView(repo: GraphRepository): Promise<ViewResult> {
  const agents = await repo.getEntitiesByKind('agent') as any[];
  const classifications = await repo.getEntitiesByKind('classification') as any[];
  const regulations = await repo.getEntitiesByKind('regulation') as any[];

  const aiActReg = regulations.find(r => r.id?.includes('ai-act'));

  const hasMentalHealth = agents.some(a => /\b(mental|health|assessment|cops[oó]q|phq)\b/i.test((a.description ?? '') + (a.label ?? '')));
  const hasBehavioral = agents.some(a => /\b(behavior|profile|persona|coach)\b/i.test((a.description ?? '') + (a.label ?? '')));
  const hasWorkplace = agents.some(a => /\b(workplace|work|employee|rh|sst|occupational)\b/i.test((a.description ?? '') + (a.label ?? '')));
  const hasBiometric = agents.some(a => /\b(biometric|emotion|speech)\b/i.test((a.description ?? '') + (a.label ?? '')));
  const hasHealthData = agents.some(a => /\b(health|medical|clinical|therapy)\b/i.test((a.description ?? '') + (a.label ?? '')));

  const highRiskIndicators = [hasMentalHealth, hasBehavioral, hasWorkplace, hasBiometric, hasHealthData].filter(Boolean).length;
  const isLikelyHighRisk = highRiskIndicators >= 2;

  const requiredActions: string[] = [];
  if (isLikelyHighRisk) {
    requiredActions.push('Classificação como Alto Risco (Art. 6)');
    requiredActions.push('Sistema de Gestão de Risco (Art. 9)');
    requiredActions.push('Governança de Dados (Art. 10)');
    requiredActions.push('Documentação Técnica (Art. 11)');
    requiredActions.push('Registro Automático (Art. 12)');
    requiredActions.push('Transparência (Art. 13)');
    requiredActions.push('Supervisão Humana (Art. 14)');
    requiredActions.push('Precisão, Robustez, Cibersegurança (Art. 15)');
  }

  const rels = (await repo.getRelationships()).filter(r =>
    r.kind === 'BASED_ON' || r.kind === 'REGULATES' || r.kind === 'USES_MODEL'
  );

  const { nodes, edges } = repo.convertToVisualization(
    [...agents.slice(0, 20), ...classifications, ...regulations.slice(0, 5)],
    rels,
  );

  return {
    nodes, edges,
    cards: [
      { title: 'Classificação', value: isLikelyHighRisk ? 'ALTO RISCO' : 'RISCO LIMITADO', description: highRiskIndicators >= 2 ? `Baseado em ${highRiskIndicators} indicadores` : 'Sem indicadores suficientes' },
      { title: 'Supervisão Humana', value: isLikelyHighRisk ? 'Requerida' : 'Recomendada', description: isLikelyHighRisk ? 'Art. 14 — obrigatória' : 'Art. 14 — recomendada' },
      { title: 'Transparência', value: isLikelyHighRisk ? 'Obrigatória' : 'Recomendada', description: isLikelyHighRisk ? 'Art. 13' : 'Art. 52' },
      { title: 'Indicadores', value: `${highRiskIndicators}/5`, description: `Mental:${hasMentalHealth ? '✓' : '✗'} Behav:${hasBehavioral ? '✓' : '✗'} Work:${hasWorkplace ? '✓' : '✗'} Bio:${hasBiometric ? '✓' : '✗'} Health:${hasHealthData ? '✓' : '✗'}` },
    ],
    summary: {
      classification: isLikelyHighRisk ? 'high-risk' : 'limited-risk',
      highRiskIndicators: String(highRiskIndicators),
      humanOversightRequired: isLikelyHighRisk ? 'yes' : 'no',
      transparencyRequired: isLikelyHighRisk ? 'yes' : 'recommended',
      conformityAssessment: isLikelyHighRisk ? 'required' : 'not_required',
      requiredActions: requiredActions.length,
      aiActStatus: aiActReg?.status ?? 'partial',
    },
    title: 'AI Act — Regulatory Classification View',
    description: 'Este sistema entra no AI Act? Classificação de risco, requisitos e obrigações.',
  };
}

/** Agent Governance View — DB-backed */
export async function buildAgentGovernanceView(repo: GraphRepository): Promise<ViewResult> {
  const agents = await repo.getEntitiesByKind('agent') as any[];
  const tools = await repo.getEntitiesByKind('tool') as any[];
  const models = await repo.getEntitiesByKind('model') as any[];
  const owners = await repo.getEntitiesByKind('owner') as any[];
  const regulations = await repo.getEntitiesByKind('regulation') as any[];
  const risks = await repo.getEntitiesByKind('risk') as any[];

  const criticalAgents = agents.filter((a: any) => a.critical);

  const allRels = await repo.getRelationships();
  const ownedByIds = new Set(allRels.filter(r => r.kind === 'OWNED_BY').map(r => r.sourceId));
  const agentsWithOwner = agents.filter((a: any) => a.ownerId || ownedByIds.has(a.id));
  const agentsWithoutOwner = agents.filter(a => !agentsWithOwner.includes(a));
  const agentsWithLLM = agents.filter(a => {
    const ms = a.models;
    if (!ms) return false;
    if (Array.isArray(ms)) return ms.length > 0;
    return typeof ms === 'string' && ms.length > 0;
  });

  const highRiskCount = risks.filter(r => r.severity === 'critical' || r.severity === 'high').length;

  const MAX_NODES = 200;
  const allEntities = [...agents, ...tools, ...models, ...owners, ...regulations].slice(0, MAX_NODES);
  const entityIds = new Set(allEntities.map(e => e.id));
  const rels = allRels.filter(r =>
    (entityIds.has(r.sourceId) || entityIds.has(r.targetId)) &&
    (r.kind === 'USES_TOOL' || r.kind === 'OWNED_BY' || r.kind === 'USES_MODEL' || r.kind === 'REGULATES')
  );

  const { nodes, edges } = repo.convertToVisualization(allEntities, rels);

  return {
    nodes, edges,
    cards: [
      { title: 'Total Agentes', value: agents.length.toString(), description: `${criticalAgents.length} críticos` },
      { title: 'Com Dono', value: agentsWithOwner.length.toString(), description: `${agentsWithoutOwner.length} sem dono` },
      { title: 'Com LLM', value: agentsWithLLM.length.toString(), description: `${models.length} modelos` },
      { title: 'Riscos', value: risks.length.toString(), description: `${highRiskCount} altos/críticos` },
    ],
    summary: {
      totalAgents: agents.length,
      criticalAgents: criticalAgents.length,
      agentsWithOwner: agentsWithOwner.length,
      agentsWithoutOwner: agentsWithoutOwner.length,
      agentsWithLLM: agentsWithLLM.length,
      tools: tools.length,
      models: models.length,
      owners: owners.length,
      regulations: regulations.length,
    },
    title: 'Agent Governance — Registry & Oversight',
    description: 'Quais agentes existem, quem são seus donos, quais ferramentas e modelos usam.',
  };
}

export type DbViewName = 'ceo' | 'cfo' | 'ciso' | 'dpo' | 'compliance' | 'auditor' | 'board' | 'constitutional' | 'ecosystem' | 'certification' | 'ai_act' | 'agent_governance';

export const DB_VIEW_BUILDERS: Record<DbViewName, (repo: GraphRepository, param?: string) => Promise<ViewResult>> = {
  ceo: (r) => buildCEOView(r),
  cfo: (r) => buildCFOView(r),
  ciso: (r) => buildCISOView(r),
  dpo: (r) => buildDPOView(r),
  compliance: (r) => buildComplianceView(r),
  auditor: (r, p) => buildAuditorView(r, p),
  board: (r) => buildBoardView(r),
  constitutional: (r) => buildConstitutionalView(r),
  ecosystem: (r) => buildAgentEcosystemView(r),
  certification: (r) => buildCertificationView(r),
  ai_act: (r) => buildAIActView(r),
  agent_governance: (r) => buildAgentGovernanceView(r),
};

export const DB_VIEW_META: Record<DbViewName, { label: string; icon: string; question: string }> = {
  ceo: { label: 'CEO', icon: '👔', question: 'Estamos expostos?' },
  cfo: { label: 'CFO', icon: '💰', question: 'Quanto custa, qual risco financeiro?' },
  ciso: { label: 'CISO', icon: '🔒', question: 'Onde posso ser atacado?' },
  dpo: { label: 'DPO', icon: '🛡️', question: 'Onde existe PII?' },
  compliance: { label: 'Compliance', icon: '⚖️', question: 'Estamos conformes com AI Act, GDPR, DORA?' },
  auditor: { label: 'Auditor', icon: '🔍', question: 'Consigo reconstruir uma decisão?' },
  board: { label: 'Board', icon: '🏛️', question: 'Onde está o risco material?' },
  constitutional: { label: 'Constitutional', icon: '📜', question: 'A constituição está sendo respeitada?' },
  ecosystem: { label: 'Agent Ecosystem', icon: '🌐', question: 'Quais agentes existem?' },
  certification: { label: 'Certification', icon: '📜', question: 'Posso emitir o certificado?' },
  ai_act: { label: 'AI Act', icon: '🇪🇺', question: 'Este sistema entra no AI Act?' },
  agent_governance: { label: 'Agent Governance', icon: '🤖', question: 'Quem governa os agentes?' },
};
