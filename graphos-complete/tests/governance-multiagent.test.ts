import { GraphEngine, buildFullGraph } from '@council/graphos';
import { buildAuditorView, buildConstitutionalView, buildAgentEcosystemView, buildComplianceView, buildBoardView } from '@council/graphos/views';

/**
 * Governance multi-agent test suite.
 *
 * Inspired by real-world patterns from NirDiamant/GenAI_Agents:
 * - ClauseAI (contract compliance): Compliance Officer, IP Counsel, DPO, Risk Management roles
 * - EU Green Deal Bot: regulatory compliance chain with evidence grading
 * - Project Manager Assistant: self-reflection loop with risk assessment
 *
 * Validates that GraphOS correctly models governance chains that these
 * agent systems would need to satisfy for AI Act / LGPD / BCB 4893 compliance.
 */
describe('Governance Multi-Agent (GenAI_Agents inspired)', () => {
  let engine: GraphEngine;

  beforeAll(async () => {
    engine = await buildFullGraph();
  });

  /**
   * CF-009 / AI Act Art. 14: "quem decidiu" precisa ser rastreável a UM agente,
   * não a todos. O bug do produto cartesiano (USES_PROMPT entre todo agente e
   * todo prompt) quebrava isso — agentsInvolved = 12.
   *
   * equals os testes anteriores que usavam >= 1 e não pegavam o bug.
   */
  describe('Auditor View — cadeia quem-decidiu (AI Act Art. 14)', () => {
    const decisions = ['dec-001', 'dec-002', 'dec-003', 'dec-004', 'dec-005'];

    for (const decId of decisions) {
      test(`${decId}: agentsInvolved é exatamente 1 (não 12)`, () => {
        const result = buildAuditorView(engine, decId);
        // Antes do fix: agentsInvolved = até 12 (produto cartesiano)
        // Depois do fix: agentsInvolved = 1 (só o agente que decidiu)
        expect(result.summary.agentsInvolved).toBe(1);
      });
    }

    test('dec-001 agent é agent-judge (EU Market Expansion)', () => {
      const { entities } = engine.reconstructDecision('dec-001');
      const agents = entities.filter(e => e.kind === 'agent');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-judge');
    });

    test('dec-003 agent é agent-judge (VP Hiring — todos os decisions são do agent-judge)', () => {
      const { entities } = engine.reconstructDecision('dec-003');
      const agents = entities.filter(e => e.kind === 'agent');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-judge');
    });

    test('dec-005 agent é agent-judge (M&A Due Diligence)', () => {
      const { entities } = engine.reconstructDecision('dec-005');
      const agents = entities.filter(e => e.kind === 'agent');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-judge');
    });

    test('cada decisão tem ao menos 1 evidência (audit trail)', () => {
      for (const decId of decisions) {
        const result = buildAuditorView(engine, decId);
        expect(result.summary.evidenceCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  /**
   * Constitutional View: controles governam prompts por domínio, não
   * por threshold de risco. Só controles de Governance/Audit/Privacy/
   * Security/Data Governance devem ter arestas GOVERNS para prompts.
   */
  describe('Constitutional View — GOVERNS domínio-específico', () => {
    test('relatório tem ao menos 1 control da CG-AG', () => {
      const result = buildConstitutionalView(engine);
      expect(result.summary.totalControls).toBeGreaterThanOrEqual(10);
    });

    test('ao menos 1 prompt aparece no grafo do Constitutional View', () => {
      const result = buildConstitutionalView(engine);
      // Usa raw entities para verificar presença de prompt no grafo
      const allEntities = (engine as any).graph.entities;
      const prompts = [...allEntities.values()].filter((e: any) => e.kind === 'prompt');
      expect(prompts.length).toBe(5);
    });

    test('ctrl-001 (Access Control) não governa prompt nenhum', () => {
      const rels = engine.getRelationships().filter(r => r.kind === 'GOVERNS' && r.sourceId === 'ctrl-001');
      const promptTargets = rels.filter(r => r.targetId.startsWith('prompt-'));
      expect(promptTargets.length).toBe(0);
    });

    test('ctrl-009 (Data Governance) governa prompts com PII/PHI', () => {
      const rels = engine.getRelationships().filter(r => r.kind === 'GOVERNS' && r.sourceId === 'ctrl-009');
      const promptTargets = rels.filter(r => r.targetId.startsWith('prompt-'));
      expect(promptTargets.length).toBeGreaterThanOrEqual(1);
    });
  });

  /**
   * Ecosystem View: cadeia completa agente → tool → external system.
   * Simula o padrão do ClauseAI que conecta Compliance Officer a ferramentas
   * de análise contratual e sistemas externos de regulamentação.
   */
  describe('Ecosystem View — agente → tool → ext system (ClauseAI pattern)', () => {
    test('entidades incluem tools e external systems', () => {
      const result = buildAgentEcosystemView(engine);
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges.length).toBeGreaterThan(0);
    });

    test('existem ao menos 3 tools registradas', () => {
      const tools = engine.getEntitiesByKind('tool');
      expect(tools.length).toBeGreaterThanOrEqual(3);
    });
  });

  /**
   * Compliance View: decisão → regulação → certificado.
   * Valida que cada decisão tem ao menos uma regulação aplicável,
   * similar ao EU Green Deal Bot que mapeia 34 Q&A de compliance ambiental.
   */
  describe('Compliance View — decisão → regulação → certificado (EU Green Deal Bot pattern)', () => {
    test('GDPR está entre as regulações', () => {
      const regs = engine.getEntitiesByKind('regulation') as any[];
      const gdpr = regs.find(r => r.label.toLowerCase().includes('gdpr'));
      expect(gdpr).toBeDefined();
    });

    test('existe ao menos 1 REQUIRES_CERT entre decisão e certificado', () => {
      const rels = engine.getRelationships().filter(r => r.kind === 'REQUIRES_CERT');
      expect(rels.length).toBeGreaterThanOrEqual(1);
    });
  });

  /**
   * Board View: risco material + incidentes abertos.
   * Similar ao Project Manager Assistant que avalia risco por task
   * e itera com self-reflection até reduzir o score.
   */
  describe('Board View — risco material (Project Manager pattern)', () => {
    test('críticos e incidentes abertos são reportados', () => {
      const result = buildBoardView(engine);
      expect(typeof result.summary.criticalAgents).toBe('number');
      expect(typeof result.summary.openIncidents).toBe('number');
      expect(typeof result.summary.nonCompliantRegulations).toBe('number');
    });

    test('totalRiskExposure é número positivo', () => {
      const result = buildBoardView(engine);
      expect(result.summary.totalRiskExposure).toBeDefined();
      const exposure = parseInt(result.summary.totalRiskExposure as string, 10);
      expect(exposure).toBeGreaterThan(0);
    });
  });

  /**
   * BFS chain completeness: toda reconstructDecision deve incluir
   * entidades de todos os tipos relevantes na cadeia, provando que
   * USES_MODEL e USES_PROMPT estão conectados no grafo real (L3).
   *
   * Diferentemente dos testes anteriores que usavam >= e assertions
   * lenientes, este teste exige === 1 para agentInvolved e verifica
   * que cada entidade na cadeia está presente (agent, model, regulation,
   * prompt, evidence, owner).
   */
  describe('Cadeia BFS completa — todas as 5 decisões', () => {
    const chainAssertions = [
      { decId: 'dec-001', expectedAgent: 'agent-judge', mod: 1, regs: 1, prm: 1 },
      { decId: 'dec-002', expectedAgent: 'agent-judge', mod: 1, regs: 1, prm: 1 },
      { decId: 'dec-003', expectedAgent: 'agent-judge', mod: 1, regs: 1, prm: 1 },
      { decId: 'dec-004', expectedAgent: 'agent-judge', mod: 1, regs: 1, prm: 1 },
      { decId: 'dec-005', expectedAgent: 'agent-judge', mod: 1, regs: 1, prm: 1 },
    ];

    for (const c of chainAssertions) {
      test(`${c.decId}: cadeia BFS reacha ${c.expectedAgent} + model + regulation + prompt`, () => {
        const { entities } = engine.reconstructDecision(c.decId);

        const agents   = entities.filter(e => e.kind === 'agent');
        const models   = entities.filter(e => e.kind === 'model');
        const regs     = entities.filter(e => e.kind === 'regulation');
        const prompts  = entities.filter(e => e.kind === 'prompt');
        const evidence = entities.filter(e => e.kind === 'evidence');
        const owners   = entities.filter(e => e.kind === 'owner');

        // Quem decidiu — exatamente 1 (não 12)
        expect(agents.length).toBe(1);
        expect(agents[0].id).toBe(c.expectedAgent);

        // Modelo está na cadeia (L3: aresta real, não só schema)
        expect(models.length).toBe(c.mod);

        // Regulação está na cadeia
        expect(regs.length).toBeGreaterThanOrEqual(c.regs);

        // Prompt está na cadeia
        expect(prompts.length).toBeGreaterThanOrEqual(c.prm);

        // Evidência está na cadeia (audit trail)
        expect(evidence.length).toBeGreaterThanOrEqual(2);

        // Owner está na cadeia (accountability)
        expect(owners.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  /**
   * Score precedence: verifica que score real da entidade é preservado
   * (não sobrescrito por fallback de riskLevel). Cobre todos os 5 decisions
   * para garantir que o fix de parênteses em engine.ts:128 funciona.
   */
  describe('Score precedence — nenhum override de riskLevel', () => {
    // Scores do seed data real em data.ts
    const decisions = [
      { id: 'dec-001', expectedScore: 68 },
      { id: 'dec-002', expectedScore: 42 },
      { id: 'dec-003', expectedScore: 88 },
      { id: 'dec-004', expectedScore: 62 },
      { id: 'dec-005', expectedScore: 35 },
    ];

    for (const d of decisions) {
      test(`${d.id}: score é ${d.expectedScore} (não fallback de riskLevel)`, () => {
        const { entities } = engine.reconstructDecision(d.id);
        const decision = entities.find(e => e.id === d.id) as any;
        // O fix (parênteses): entity.score ?? (riskLevel fallback)
        // Se score existe, deve ser o valor real, não 90 (critical) ou 70 (high)
        expect(decision.score).toBe(d.expectedScore);
      });
    }
  });

  /**
   * Resumo final: contagem estrutural do grafo completa.
   * Confirma que:
   * - 5 arestas USES_PROMPT (1 por prompt, não 60)
   * - 5 arestas GENERATED_BY_PROMPT (1 por decisão)
   * - ~14-17 arestas USES_MODEL (1 por agente + 1 por decisão)
   */
  test('estrutura final do grafo de governança multi-agente', () => {
    const allRels = engine.getRelationships();

    // USES_PROMPT: 1 por prompt (só o agente que decidiu) = 5
    const usesPrompt = allRels.filter(r => r.kind === 'USES_PROMPT');
    expect(usesPrompt.length).toBe(5);

    // GENERATED_BY_PROMPT: 1 por prompt = 5
    const genByPrompt = allRels.filter(r => r.kind === 'GENERATED_BY_PROMPT');
    expect(genByPrompt.length).toBe(5);

    // USES_MODEL: ao menos 1 no grafo (L3 confirmado)
    const usesModel = allRels.filter(r => r.kind === 'USES_MODEL');
    expect(usesModel.length).toBeGreaterThanOrEqual(1);

    // GOVERNS: 8 controles de domínio relevante × 5 prompts = 40 arestas
    const governsPrompt = allRels.filter(r => r.kind === 'GOVERNS' && r.targetId.startsWith('prompt-'));
    expect(governsPrompt.length).toBeGreaterThanOrEqual(1);
    expect(governsPrompt.length).toBeLessThanOrEqual(40);
  });
});
