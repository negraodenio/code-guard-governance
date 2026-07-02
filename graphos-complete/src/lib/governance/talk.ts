/**
 * Talk to Governance — NL Interface
 *
 * 12 deterministic intents (EN/PT/ES) that answer governance questions
 * by querying the GraphEngine directly. No LLM dependency — fast, auditable.
 *
 * Intent recognition uses weighted keyword matching.
 * Answer generation produces structured evidence + node references.
 */

import type { GraphEngine } from '@council/graphos';

// ── Types ────────────────────────────────────────────────────────────────────

export type GovernanceIntent =
  | 'who_decided'
  | 'which_agents_pii'
  | 'compliance_status'
  | 'risk_exposure'
  | 'who_owns_agent'
  | 'certification_status'
  | 'model_cost'
  | 'audit_trail'
  | 'regulation_gaps'
  | 'high_risk_agents'
  | 'data_flows'
  | 'controls_active'
  | 'unknown';

export interface GovernanceAnswer {
  intent: GovernanceIntent;
  confidence: number;          // 0-100 intent detection confidence
  question: string;            // echoed user query
  answer: string;              // primary textual answer (EN)
  answerPt: string;            // Portuguese answer
  evidence: string[];          // cited entity IDs / relationship kinds
  nodeIds: string[];           // IDs to highlight in graph
  score?: number;              // numeric answer when applicable (e.g. compliance %)
  data?: Record<string, unknown>;
}

// ── Intent Patterns ───────────────────────────────────────────────────────────

interface IntentDef {
  intent: GovernanceIntent;
  keywords: Array<{ word: string; weight: number }>;
}

const INTENT_DEFS: IntentDef[] = [
  {
    intent: 'who_decided',
    keywords: [
      { word: 'who decided', weight: 10 }, { word: 'quem decidiu', weight: 10 },
      { word: 'quien decidio', weight: 10 }, { word: 'decision maker', weight: 8 },
      { word: 'decided', weight: 5 }, { word: 'decision', weight: 3 },
      { word: 'decidiu', weight: 5 }, { word: 'decisão', weight: 3 },
    ],
  },
  {
    intent: 'which_agents_pii',
    keywords: [
      { word: 'pii', weight: 10 }, { word: 'dados pessoais', weight: 10 },
      { word: 'personal data', weight: 10 }, { word: 'datos personales', weight: 10 },
      { word: 'privacy', weight: 6 }, { word: 'privacidade', weight: 6 },
      { word: 'process personal', weight: 8 }, { word: 'process pii', weight: 9 },
      { word: 'which agents pii', weight: 12 }, { word: 'quais agentes pii', weight: 12 },
    ],
  },
  {
    intent: 'compliance_status',
    keywords: [
      { word: 'compliance', weight: 6 }, { word: 'compliant', weight: 7 },
      { word: 'are we compliant', weight: 12 }, { word: 'somos conformes', weight: 12 },
      { word: 'conformidade', weight: 7 }, { word: 'gdpr status', weight: 10 },
      { word: 'lgpd status', weight: 10 }, { word: 'ai act status', weight: 10 },
      { word: 'regulation status', weight: 8 }, { word: 'dora status', weight: 10 },
    ],
  },
  {
    intent: 'risk_exposure',
    keywords: [
      { word: 'risk exposure', weight: 10 }, { word: 'exposição de risco', weight: 10 },
      { word: 'exposicion de riesgo', weight: 10 }, { word: 'total risk', weight: 8 },
      { word: 'risco total', weight: 8 }, { word: 'how risky', weight: 9 },
      { word: 'quão arriscado', weight: 9 }, { word: 'material risk', weight: 9 },
    ],
  },
  {
    intent: 'who_owns_agent',
    keywords: [
      { word: 'who owns', weight: 10 }, { word: 'quem é dono', weight: 10 },
      { word: 'quien es el propietario', weight: 10 }, { word: 'owner', weight: 6 },
      { word: 'ownership', weight: 7 }, { word: 'responsible', weight: 5 },
      { word: 'responsável', weight: 6 }, { word: 'accountable', weight: 5 },
    ],
  },
  {
    intent: 'certification_status',
    keywords: [
      { word: 'certification', weight: 9 }, { word: 'certificação', weight: 9 },
      { word: 'certified', weight: 8 }, { word: 'can we certify', weight: 12 },
      { word: 'podemos certificar', weight: 12 }, { word: 'certificate', weight: 8 },
      { word: 'iso 42001', weight: 10 }, { word: 'soc2', weight: 10 },
    ],
  },
  {
    intent: 'model_cost',
    keywords: [
      { word: 'cost', weight: 6 }, { word: 'custo', weight: 6 },
      { word: 'costo', weight: 6 }, { word: 'how much', weight: 7 },
      { word: 'quanto custa', weight: 10 }, { word: 'token', weight: 7 },
      { word: 'model cost', weight: 10 }, { word: 'llm cost', weight: 10 },
      { word: 'spending', weight: 7 }, { word: 'gasto', weight: 7 },
    ],
  },
  {
    intent: 'audit_trail',
    keywords: [
      { word: 'audit', weight: 8 }, { word: 'auditoria', weight: 8 },
      { word: 'trail', weight: 7 }, { word: 'trace', weight: 7 },
      { word: 'immutable', weight: 9 }, { word: 'imutável', weight: 9 },
      { word: 'prove it', weight: 10 }, { word: 'provar', weight: 10 },
      { word: 'evidence', weight: 6 }, { word: 'evidência', weight: 6 },
    ],
  },
  {
    intent: 'regulation_gaps',
    keywords: [
      { word: 'gap', weight: 8 }, { word: 'lacuna', weight: 8 },
      { word: 'non-compliant', weight: 10 }, { word: 'não conforme', weight: 10 },
      { word: 'regulation gap', weight: 12 }, { word: 'missing requirement', weight: 10 },
      { word: 'requisito faltando', weight: 10 }, { word: 'what is missing', weight: 9 },
    ],
  },
  {
    intent: 'high_risk_agents',
    keywords: [
      { word: 'high risk agent', weight: 12 }, { word: 'agente de alto risco', weight: 12 },
      { word: 'critical agent', weight: 10 }, { word: 'agente crítico', weight: 10 },
      { word: 'dangerous agent', weight: 9 }, { word: 'autonomous', weight: 7 },
      { word: 'autônomo', weight: 7 }, { word: 'uncontrolled', weight: 9 },
    ],
  },
  {
    intent: 'data_flows',
    keywords: [
      { word: 'data flow', weight: 10 }, { word: 'fluxo de dados', weight: 10 },
      { word: 'flujo de datos', weight: 10 }, { word: 'where does data go', weight: 12 },
      { word: 'onde vão os dados', weight: 12 }, { word: 'lineage', weight: 9 },
      { word: 'linhagem', weight: 9 }, { word: 'data pipeline', weight: 8 },
    ],
  },
  {
    intent: 'controls_active',
    keywords: [
      { word: 'control', weight: 6 }, { word: 'controle', weight: 6 },
      { word: 'active control', weight: 10 }, { word: 'controle ativo', weight: 10 },
      { word: 'cg-ag', weight: 12 }, { word: 'which controls', weight: 10 },
      { word: 'quais controles', weight: 10 }, { word: 'governing', weight: 7 },
    ],
  },
];

// ── Intent Parser ─────────────────────────────────────────────────────────────

export function parseGovernanceIntent(query: string): { intent: GovernanceIntent; confidence: number } {
  const q = query.toLowerCase().trim();
  let best: GovernanceIntent = 'unknown';
  let bestScore = 0;

  for (const def of INTENT_DEFS) {
    let score = 0;
    for (const kw of def.keywords) {
      if (q.includes(kw.word.toLowerCase())) {
        score += kw.weight;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = def.intent;
    }
  }

  // Confidence: clamp score to 0-100
  const confidence = Math.min(100, bestScore * 5);
  return { intent: confidence >= 15 ? best : 'unknown', confidence };
}

// ── Answer Engine ─────────────────────────────────────────────────────────────

export function answerGovernanceQuery(
  intent: GovernanceIntent,
  engine: GraphEngine,
  query: string,
): GovernanceAnswer {
  const base = { intent, confidence: 80, question: query, evidence: [], nodeIds: [], data: {} };

  switch (intent) {
    case 'who_decided': {
      const decisions = engine.getEntitiesByKind('decision') as any[];
      const rels = engine.getRelationships().filter(r => r.kind === 'MAKES_DECISION');
      const pairs = decisions.slice(0, 5).map(d => {
        const rel = rels.find(r => r.targetId === d.id);
        const agent = rel ? engine.getEntity(rel.sourceId) : null;
        return `"${d.label}" → ${agent?.label ?? 'Unknown'}`;
      });
      return {
        ...base,
        answer: `${decisions.length} decisions found. Decision makers: ${pairs.join('; ')}.`,
        answerPt: `${decisions.length} decisões encontradas. Tomadores de decisão: ${pairs.join('; ')}.`,
        evidence: rels.slice(0, 10).map(r => `MAKES_DECISION: ${r.sourceId} → ${r.targetId}`),
        nodeIds: [...decisions.map(d => d.id), ...rels.map(r => r.sourceId)],
        score: decisions.length,
      };
    }

    case 'which_agents_pii': {
      const allRels = engine.getRelationships();
      const processesDataRels = allRels.filter(r => r.kind === 'PROCESSES_DATA');
      const dataAssets = engine.getEntitiesByKind('data_asset') as any[];
      const piiAssets = dataAssets.filter(d => d.hasPII || d.attrs?.hasPII);
      const piiAssetIds = new Set(piiAssets.map(a => a.id));
      const agentWithPiiRels = processesDataRels.filter(r => piiAssetIds.has(r.targetId));
      const agentIds = [...new Set(agentWithPiiRels.map(r => r.sourceId))];
      const agentNames = agentIds.map(id => engine.getEntity(id)?.label ?? id);
      return {
        ...base,
        answer: `${agentIds.length} agent(s) process PII data: ${agentNames.join(', ')}. PII assets: ${piiAssets.map(a => a.label).join(', ')}.`,
        answerPt: `${agentIds.length} agente(s) processam dados pessoais: ${agentNames.join(', ')}. Activos com PII: ${piiAssets.map(a => a.label).join(', ')}.`,
        evidence: agentWithPiiRels.map(r => `PROCESSES_DATA: ${r.sourceId} → ${r.targetId}`),
        nodeIds: [...agentIds, ...piiAssets.map(a => a.id)],
        score: agentIds.length,
      };
    }

    case 'compliance_status': {
      const regs = engine.getEntitiesByKind('regulation') as any[];
      const compliant = regs.filter(r => (r.status ?? r.attrs?.status) === 'compliant');
      const partial = regs.filter(r => (r.status ?? r.attrs?.status) === 'partial');
      const nonCompliant = regs.filter(r => (r.status ?? r.attrs?.status) === 'non_compliant');
      const pct = regs.length > 0 ? Math.round((compliant.length / regs.length) * 100) : 0;
      return {
        ...base,
        answer: `Compliance: ${pct}% (${compliant.length}/${regs.length} regulations). Compliant: ${compliant.map((r: any) => r.label).join(', ')}. Partial: ${partial.map((r: any) => r.label).join(', ')}. Non-compliant: ${nonCompliant.map((r: any) => r.label).join(', ')}.`,
        answerPt: `Conformidade: ${pct}% (${compliant.length}/${regs.length} regulações). Conforme: ${compliant.map((r: any) => r.label).join(', ')}. Parcial: ${partial.map((r: any) => r.label).join(', ')}. Não conforme: ${nonCompliant.map((r: any) => r.label).join(', ')}.`,
        evidence: regs.map((r: any) => `${r.label}: ${r.status ?? r.attrs?.status}`),
        nodeIds: regs.map(r => r.id),
        score: pct,
      };
    }

    case 'risk_exposure': {
      const risks = engine.getEntitiesByKind('risk') as any[];
      const critical = risks.filter(r => (r.severity ?? r.attrs?.severity) === 'critical');
      const high = risks.filter(r => (r.severity ?? r.attrs?.severity) === 'high');
      const exposure = critical.length * 25 + high.length * 15 + (risks.length - critical.length - high.length) * 5;
      return {
        ...base,
        answer: `Total risk exposure score: ${exposure}. ${critical.length} critical risks, ${high.length} high risks, ${risks.length} total.`,
        answerPt: `Pontuação total de exposição ao risco: ${exposure}. ${critical.length} riscos críticos, ${high.length} riscos altos, ${risks.length} no total.`,
        evidence: risks.slice(0, 5).map((r: any) => `${r.label} [${r.severity ?? r.attrs?.severity}]`),
        nodeIds: risks.map(r => r.id),
        score: exposure,
      };
    }

    case 'who_owns_agent': {
      const ownedByRels = engine.getRelationships().filter(r => r.kind === 'OWNED_BY');
      const agents = engine.getEntitiesByKind('agent');
      const agentIds = new Set(agents.map(a => a.id));
      const ownedAgentIds = new Set(ownedByRels.filter(r => agentIds.has(r.sourceId)).map(r => r.sourceId));
      const unowned = agents.filter(a => !ownedAgentIds.has(a.id));
      const pairs = ownedByRels.slice(0, 8).map(r => {
        const agent = engine.getEntity(r.sourceId);
        const owner = engine.getEntity(r.targetId);
        return `${agent?.label ?? r.sourceId} → ${owner?.label ?? r.targetId}`;
      });
      return {
        ...base,
        answer: `${ownedAgentIds.size}/${agents.length} agents have owners. ${unowned.length > 0 ? `Unowned: ${unowned.map(a => a.label).join(', ')}.` : 'All agents have owners.'} Ownership: ${pairs.join('; ')}.`,
        answerPt: `${ownedAgentIds.size}/${agents.length} agentes têm dono. ${unowned.length > 0 ? `Sem dono: ${unowned.map(a => a.label).join(', ')}.` : 'Todos os agentes têm dono.'} Ownership: ${pairs.join('; ')}.`,
        evidence: ownedByRels.slice(0, 10).map(r => `OWNED_BY: ${r.sourceId} → ${r.targetId}`),
        nodeIds: [...agents.map(a => a.id), ...engine.getEntitiesByKind('owner').map(o => o.id)],
        score: Math.round((ownedAgentIds.size / Math.max(1, agents.length)) * 100),
      };
    }

    case 'certification_status': {
      const certs = engine.getEntitiesByKind('certificate') as any[];
      const controls = engine.getEntitiesByKind('control');
      const inReview = certs.filter(c => (c.status ?? c.attrs?.status) === 'in_review');
      const approved = certs.filter(c => (c.status ?? c.attrs?.status) === 'approved');
      return {
        ...base,
        answer: `${certs.length} certificates: ${approved.length} approved, ${inReview.length} in review. ${controls.length} controls active. Certificates: ${certs.map((c: any) => c.label).join(', ')}.`,
        answerPt: `${certs.length} certificados: ${approved.length} aprovados, ${inReview.length} em revisão. ${controls.length} controles ativos. Certificados: ${certs.map((c: any) => c.label).join(', ')}.`,
        evidence: certs.map((c: any) => `${c.label}: ${c.status ?? c.attrs?.status}`),
        nodeIds: [...certs.map(c => c.id), ...controls.map(c => c.id)],
        score: certs.length > 0 ? Math.round((approved.length / certs.length) * 100) : 0,
      };
    }

    case 'model_cost': {
      const models = engine.getEntitiesByKind('model') as any[];
      const costs = engine.getEntitiesByKind('cost_center') as any[];
      const totalCost = costs.reduce((s: number, c: any) => s + (c.costUsd ?? c.attrs?.costUsd ?? 0), 0);
      const modelSummary = models.slice(0, 5).map((m: any) => {
        const tokens = m.tokensUsed ?? m.attrs?.tokensUsed ?? 0;
        const costPer = m.costPerToken ?? m.attrs?.costPerToken ?? 0;
        return `${m.label}: $${(tokens * costPer).toFixed(2)}`;
      });
      return {
        ...base,
        answer: `Total LLM spend: $${totalCost.toLocaleString()}. ${models.length} models. Breakdown: ${modelSummary.join(', ')}.`,
        answerPt: `Custo total LLM: $${totalCost.toLocaleString()}. ${models.length} modelos. Detalhe: ${modelSummary.join(', ')}.`,
        evidence: modelSummary,
        nodeIds: [...models.map(m => m.id), ...costs.map(c => c.id)],
        score: totalCost,
      };
    }

    case 'audit_trail': {
      const evidence = engine.getEntitiesByKind('evidence');
      const decisions = engine.getEntitiesByKind('decision') as any[];
      const evidencedByRels = engine.getRelationships().filter(r => r.kind === 'EVIDENCED_BY');
      const coveredDecisions = new Set(evidencedByRels.map(r => r.sourceId)).size;
      return {
        ...base,
        answer: `${evidence.length} evidence records. ${coveredDecisions}/${decisions.length} decisions have audit evidence. Audit trail is HMAC-SHA256 signed (tamper-proof).`,
        answerPt: `${evidence.length} registros de evidência. ${coveredDecisions}/${decisions.length} decisões têm evidência de auditoria. Trilha imutável com HMAC-SHA256.`,
        evidence: evidence.slice(0, 5).map(e => `${e.label} [${(e as any).evidenceType ?? 'document'}]`),
        nodeIds: [...evidence.map(e => e.id), ...decisions.map(d => d.id)],
        score: decisions.length > 0 ? Math.round((coveredDecisions / decisions.length) * 100) : 0,
      };
    }

    case 'regulation_gaps': {
      const regs = engine.getEntitiesByKind('regulation') as any[];
      const nonCompliant = regs.filter(r => ['non_compliant', 'partial'].includes(r.status ?? r.attrs?.status ?? ''));
      return {
        ...base,
        answer: `${nonCompliant.length} regulation(s) with gaps: ${nonCompliant.map((r: any) => `${r.label} [${r.status ?? r.attrs?.status}]`).join(', ')}.`,
        answerPt: `${nonCompliant.length} regulação(ões) com lacunas: ${nonCompliant.map((r: any) => `${r.label} [${r.status ?? r.attrs?.status}]`).join(', ')}.`,
        evidence: nonCompliant.map((r: any) => r.label),
        nodeIds: nonCompliant.map(r => r.id),
        score: nonCompliant.length,
      };
    }

    case 'high_risk_agents': {
      const agents = engine.getEntitiesByKind('agent') as any[];
      const highRisk = agents.filter(a => ['critical', 'high'].includes(a.riskLevel ?? a.attrs?.riskLevel ?? ''));
      const autonomous = agents.filter(a => a.isAutonomous || a.attrs?.isAutonomous);
      return {
        ...base,
        answer: `${highRisk.length} high/critical risk agents: ${highRisk.map((a: any) => a.label).join(', ')}. ${autonomous.length} autonomous agents require oversight.`,
        answerPt: `${highRisk.length} agentes de risco alto/crítico: ${highRisk.map((a: any) => a.label).join(', ')}. ${autonomous.length} agentes autônomos precisam de supervisão.`,
        evidence: highRisk.map((a: any) => `${a.label}: ${a.riskLevel ?? a.attrs?.riskLevel}`),
        nodeIds: highRisk.map(a => a.id),
        score: highRisk.length,
      };
    }

    case 'data_flows': {
      const processRels = engine.getRelationships().filter(r => r.kind === 'PROCESSES_DATA');
      const accessRels = engine.getRelationships().filter(r => r.kind === 'ACCESSES_SYSTEM');
      const dataAssets = engine.getEntitiesByKind('data_asset');
      const externalSystems = engine.getEntitiesByKind('external_system');
      return {
        ...base,
        answer: `${processRels.length} data processing flows, ${accessRels.length} system access flows. ${dataAssets.length} data assets, ${externalSystems.length} external systems.`,
        answerPt: `${processRels.length} fluxos de processamento de dados, ${accessRels.length} fluxos de acesso a sistemas. ${dataAssets.length} activos de dados, ${externalSystems.length} sistemas externos.`,
        evidence: [...processRels.slice(0, 5).map(r => `PROCESSES_DATA: ${r.sourceId} → ${r.targetId}`), ...accessRels.slice(0, 5).map(r => `ACCESSES_SYSTEM: ${r.sourceId} → ${r.targetId}`)],
        nodeIds: [...dataAssets.map(a => a.id), ...externalSystems.map(s => s.id)],
        score: processRels.length + accessRels.length,
      };
    }

    case 'controls_active': {
      const controls = engine.getEntitiesByKind('control') as any[];
      const activeControls = controls.filter(c => (c.status ?? c.attrs?.status) === 'active');
      const governsRels = engine.getRelationships().filter(r => r.kind === 'GOVERNS');
      return {
        ...base,
        answer: `${activeControls.length}/${controls.length} controls active. ${governsRels.length} GOVERNS relationships. Active: ${activeControls.slice(0, 5).map((c: any) => c.label).join(', ')}.`,
        answerPt: `${activeControls.length}/${controls.length} controles ativos. ${governsRels.length} relações GOVERNS. Ativos: ${activeControls.slice(0, 5).map((c: any) => c.label).join(', ')}.`,
        evidence: governsRels.slice(0, 5).map(r => `GOVERNS: ${r.sourceId} → ${r.targetId}`),
        nodeIds: controls.map(c => c.id),
        score: activeControls.length,
      };
    }

    default: {
      return {
        ...base,
        intent: 'unknown',
        confidence: 0,
        answer: 'I could not understand this governance query. Try asking about: who decided, compliance status, risk exposure, PII agents, model cost, audit trail, regulation gaps, or high-risk agents.',
        answerPt: 'Não consegui entender esta consulta de governança. Tente perguntar sobre: quem decidiu, status de conformidade, exposição a risco, agentes com PII, custo de modelos, trilha de auditoria, lacunas regulatórias ou agentes de alto risco.',
        evidence: [],
        nodeIds: [],
      };
    }
  }
}
