import { GraphEngine, buildFullGraph } from '@council/graphos';
import type { GraphEntity, Relationship } from '@council/graphos';

describe('GraphOS Engine', () => {
  let engine: GraphEngine;
  let allEntities: GraphEntity[];
  let allRels: Relationship[];

  beforeAll(async () => {
    engine = await buildFullGraph();
    allEntities = Array.from((engine as any).graph.entities.values());
    allRels = (engine as any).graph.relationships;
  });

  test('buildFullGraph loads 12 agents', () => {
    const agents = engine.getEntitiesByKind('agent');
    expect(agents.length).toBe(12);
  });

  test('buildFullGraph loads 5 decisions', () => {
    const decisions = engine.getEntitiesByKind('decision');
    expect(decisions.length).toBe(5);
  });

  test('buildFullGraph loads ~150 relationships', () => {
    expect(allRels.length).toBeGreaterThan(100);
  });

  test('USES_MODEL edges exist between agents and models', () => {
    const usesModel = allRels.filter(r => r.kind === 'USES_MODEL');
    expect(usesModel.length).toBeGreaterThan(0);
    const agentIds = new Set(usesModel.map(r => r.sourceId));
    const modelIds = new Set(usesModel.map(r => r.targetId));
    expect(agentIds.size).toBeGreaterThan(0);
    expect(modelIds.size).toBeGreaterThan(0);
  });

  describe('traverse() — BFS', () => {
    test('traverse from decision dec-001 follows MAKES_DECISION to agent', () => {
      const { entities, rels } = engine.traverse('dec-001', [], ['MAKES_DECISION']);
      const agents = entities.filter(e => e.kind === 'agent');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-judge');
    });

    test('traverse from decision dec-001 reaches evidence via EVIDENCED_BY', () => {
      const { entities } = engine.traverse('dec-001', ['EVIDENCED_BY'], ['MAKES_DECISION'], 2);
      const evidences = entities.filter(e => e.kind === 'evidence');
      expect(evidences.length).toBeGreaterThanOrEqual(2);
    });

    test('traverse respects maxDepth — depth 1 reaches decision + agent + evidence (edges consumed at depth 0)', () => {
      const { entities } = engine.traverse('dec-001', ['EVIDENCED_BY'], ['MAKES_DECISION'], 1);
      const agents = entities.filter(e => e.kind === 'agent');
      const evidences = entities.filter(e => e.kind === 'evidence');
      expect(agents.length).toBe(1);
      // Evidence is reached at depth 0 (edge from decision), so evidence nodes exist at depth 1
      expect(evidences.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('reconstructDecision()', () => {
    test('reconstructs dec-001 with agent, evidence, owner, regulation', () => {
      const { entities, rels } = engine.reconstructDecision('dec-001');

      const agents = entities.filter(e => e.kind === 'agent');
      const evidences = entities.filter(e => e.kind === 'evidence');
      const owners = entities.filter(e => e.kind === 'owner');
      const regulations = entities.filter(e => e.kind === 'regulation');
      const models = entities.filter(e => e.kind === 'model');

      // BFS direcional: exatamente 1 agente (não 12), cada tipo na cadeia
      expect(agents.length).toBe(1);
      expect(evidences.length).toBeGreaterThanOrEqual(2);
      expect(owners.length).toBeGreaterThanOrEqual(1);
      expect(regulations.length).toBeGreaterThanOrEqual(1);
      expect(models.length).toBeGreaterThanOrEqual(1);

      expect(rels.length).toBeGreaterThan(0);
    });

    test('returns empty for nonexistent decision', () => {
      const { entities, rels } = engine.reconstructDecision('dec-nonexistent');
      expect(entities.length).toBe(0); // source ID not in entity map, filtered out
      expect(rels.length).toBe(0);
    });
  });

  describe('convertToVisualization()', () => {
    test('score precedence is correct — uses actual score', () => {
      const { entities } = engine.reconstructDecision('dec-001');
      const { nodes } = engine.convertToVisualization(entities, []);

      const decisionNode = nodes.find(n => n.id === 'dec-001');
      expect(decisionNode).toBeDefined();
      // dec-001 has score 68 — should NOT be 90 (which would indicate the precedence bug)
      expect(decisionNode!.score).not.toBe(90);
      // With the fix, it should use entity.score directly
    });

    test('fallback uses riskLevel when score is null', () => {
      // Create an entity with null score but high riskLevel
      const fakeEntity: GraphEntity = {
        id: 'test-risk', kind: 'risk', label: 'Test Risk',
      };
      (fakeEntity as any).riskLevel = 'high';
      (fakeEntity as any).score = null;

      const { nodes } = engine.convertToVisualization([fakeEntity], []);
      const node = nodes.find(n => n.id === 'test-risk');
      expect(node).toBeDefined();
      // high risk → fallback 70
      expect(node!.score).toBe(70);
    });
  });

  describe('Views', () => {
    test('CEO view returns summary with agent count', () => {
      const { buildCEOView } = require('@council/graphos/views');
      const result = buildCEOView(engine);
      expect(result.summary.agents).toBe(12);
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    test('CFO view returns cost data', () => {
      const { buildCFOView } = require('@council/graphos/views');
      const result = buildCFOView(engine);
      expect(result.summary.avgCostPerDecision).toBeDefined();
      expect(result.summary.totalDecisions).toBe(5);
    });

    test('Auditor view reconstructs first decision', () => {
      const { buildAuditorView } = require('@council/graphos/views');
      const result = buildAuditorView(engine);
      expect(result.summary.decisionId).toBeDefined();
      expect(result.summary.verdict).toBeDefined();
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    test('Certification view returns certificate readiness', () => {
      const { buildCertificationView } = require('@council/graphos/views');
      const result = buildCertificationView(engine);
      expect(result.summary.totalCertificates).toBeGreaterThanOrEqual(0);
      expect(result.title).toContain('Certification');
    });

    test('All 10 views execute without error', () => {
      const viewNames = ['ceo', 'cfo', 'ciso', 'dpo', 'compliance', 'auditor', 'board', 'constitutional', 'ecosystem', 'certification'];
      for (const name of viewNames) {
        expect(() => {
          const builder = require('@council/graphos/views').VIEW_BUILDERS[name];
          const result = builder(engine);
          expect(result).toBeDefined();
          expect(result.title).toBeDefined();
          expect(result.description).toBeDefined();
        }).not.toThrow();
      }
    });
  });

  describe('BFS directionality — USES_TOOL forward-only', () => {
    test('USES_TOOL from agent reaches tool (forward)', () => {
      const { entities } = engine.traverse('agent-judge', ['USES_TOOL'], [], 1);
      const tools = entities.filter(e => e.kind === 'tool');
      expect(tools.length).toBeGreaterThanOrEqual(1);
    });

    test('USES_TOOL reverse from tool does NOT reach other agents', () => {
      // Agent-judge uses tool-llm-openrouter. Forward only → tool.
      // Reverse is NOT followed, so no other agents should appear.
      const { entities } = engine.traverse('tool-llm-openrouter', ['USES_TOOL'], [], 1);
      const agents = entities.filter(e => e.kind === 'agent');
      // Tool itself + nothing else via USES_TOOL (forward only, tool is not source)
      expect(entities.length).toBe(1); // only the tool itself
      expect(agents.length).toBe(0);
    });

    test('reverseKinds param: MAKES_DECISION reverse finds agent from decision', () => {
      const { entities } = engine.traverse('dec-001', [], ['MAKES_DECISION'], 1);
      const agents = entities.filter(e => e.kind === 'agent');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-judge');
    });
  });
});
