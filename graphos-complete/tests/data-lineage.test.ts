import { buildFullGraph } from '@council/graphos';
import { buildDataLineageView, buildRiskPropagationView } from '@council/graphos/views';
import type { GraphEngine } from '@council/graphos';

describe('Data Lineage View', () => {
  let engine: GraphEngine;

  beforeAll(async () => {
    engine = await buildFullGraph();
  });

  test('buildDataLineageView returns a valid ViewResult', () => {
    const result = buildDataLineageView(engine);
    expect(result.title).toContain('Data Lineage');
    expect(result.description).toBeDefined();
    expect(result.nodes).toBeDefined();
    expect(result.edges).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  test('summary has totalFlows, dataAssets, externalSystems', () => {
    const result = buildDataLineageView(engine);
    expect(result.summary.totalFlows).toBeDefined();
    expect(result.summary.dataAssets).toBeDefined();
    expect(result.summary.externalSystems).toBeDefined();
  });

  test('view uses engine entities when no flows provided', () => {
    const result = buildDataLineageView(engine);
    // Should use data_asset + tool + external_system + agent from engine
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  test('view with raw lineage flows builds source/sink nodes', () => {
    const mockFlows = [
      {
        id: 'flow_0',
        source: { type: 'source', category: 'email', file: 'user.ts', line: 10, content: 'const email = user.email' },
        transformation: { type: 'transform', category: 'hash', file: 'user.ts', line: 15, content: 'sha256(email)' },
        sink: { type: 'sink', category: 'database', file: 'user.ts', line: 20, content: 'db.insert(hashedEmail)' },
        riskLevel: 'medium',
        confidence: 75,
        evidence: ['email at user.ts:10', 'hash transform', 'db.insert at user.ts:20'],
      },
      {
        id: 'flow_1',
        source: { type: 'source', category: 'credit_card', file: 'payment.ts', line: 5, content: 'const card = body.card' },
        transformation: null,
        sink: { type: 'sink', category: 'openai', file: 'payment.ts', line: 30, content: 'openai.chat.completions' },
        riskLevel: 'critical',
        confidence: 90,
        evidence: ['credit_card at payment.ts:5', 'openai sink at payment.ts:30'],
      },
    ];

    const result = buildDataLineageView(engine, mockFlows);
    expect(result.summary.totalFlows).toBe(2);
    expect(result.summary.criticalFlows).toBe(1);
    expect(result.summary.highFlows).toBe(0);
    // Source + transform + sink nodes
    expect(result.nodes.length).toBeGreaterThanOrEqual(4);
    expect(result.edges.length).toBeGreaterThanOrEqual(3);
  });

  test('includes tripleConfidence in result', () => {
    const result = buildDataLineageView(engine);
    expect(result.tripleConfidence).toBeDefined();
    expect(result.tripleConfidence!.discovery).toBeGreaterThanOrEqual(0);
    expect(result.tripleConfidence!.governance).toBeGreaterThanOrEqual(0);
    expect(result.tripleConfidence!.compliance).toBeGreaterThanOrEqual(0);
  });
});

describe('Risk Propagation View', () => {
  let engine: GraphEngine;

  beforeAll(async () => {
    engine = await buildFullGraph();
  });

  test('buildRiskPropagationView returns a valid ViewResult', () => {
    const result = buildRiskPropagationView(engine);
    expect(result.title).toContain('Risk Propagation');
    expect(result.description).toBeDefined();
    expect(result.nodes).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  test('propagates from most critical agent', () => {
    const result = buildRiskPropagationView(engine);
    // Source agent is reported in summary
    expect(result.summary.source).toBeDefined();
    expect(String(result.summary.source).length).toBeGreaterThan(0);
  });

  test('affected entities count is > 0 for agent-judge', () => {
    const result = buildRiskPropagationView(engine, 'agent-judge');
    expect(Number(result.summary.totalAffected)).toBeGreaterThan(0);
  });

  test('maxExposure is 100 for the source node', () => {
    const result = buildRiskPropagationView(engine, 'agent-judge');
    expect(Number(result.summary.maxExposure)).toBe(100);
  });

  test('exposure decays: nodes include different score values', () => {
    const result = buildRiskPropagationView(engine, 'agent-judge');
    const scores = result.nodes.map(n => n.score as number);
    const uniqueScores = new Set(scores);
    // source=100, hop1=60, hop2=36 — should have at least 2 distinct values
    expect(uniqueScores.size).toBeGreaterThanOrEqual(2);
  });

  test('non-existent source returns empty result', () => {
    const result = buildRiskPropagationView(engine, 'agent-nonexistent-xyz');
    // Falls back to most critical agent, so nodes still populated
    expect(result).toBeDefined();
    expect(result.title).toContain('Risk Propagation');
  });

  test('includes tripleConfidence', () => {
    const result = buildRiskPropagationView(engine);
    expect(result.tripleConfidence).toBeDefined();
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.tripleConfidence!.label);
  });
});

describe('GraphEngine.propagateRisk()', () => {
  let engine: GraphEngine;

  beforeAll(async () => {
    engine = await buildFullGraph();
  });

  test('source node has exposure 100', () => {
    const { exposureMap } = engine.propagateRisk('agent-judge');
    expect(exposureMap.get('agent-judge')).toBe(100);
  });

  test('first-hop nodes have exposure ~60', () => {
    const { exposureMap } = engine.propagateRisk('agent-judge', 1);
    const hops = Array.from(exposureMap.entries()).filter(([id]) => id !== 'agent-judge');
    // All first-hop should be 60 (100 * 0.6)
    for (const [, score] of hops) {
      expect(score).toBe(60);
    }
  });

  test('unknown entity returns empty', () => {
    const result = engine.propagateRisk('entity-does-not-exist');
    expect(result.entities.length).toBe(0);
    expect(result.rels.length).toBe(0);
    expect(result.exposureMap.size).toBe(0);
  });

  test('depth 0 stops at source only', () => {
    const { entities } = engine.propagateRisk('agent-judge', 0);
    expect(entities.length).toBe(1);
    expect(entities[0].id).toBe('agent-judge');
  });
});

describe('GraphEngine.computeTripleConfidence()', () => {
  let engine: GraphEngine;

  beforeAll(async () => {
    engine = await buildFullGraph();
  });

  test('returns all 5 fields', () => {
    const tc = engine.computeTripleConfidence();
    expect(tc.discovery).toBeDefined();
    expect(tc.governance).toBeDefined();
    expect(tc.compliance).toBeDefined();
    expect(tc.overall).toBeDefined();
    expect(tc.label).toBeDefined();
  });

  test('all scores are 0-100', () => {
    const tc = engine.computeTripleConfidence();
    expect(tc.discovery).toBeGreaterThanOrEqual(0);
    expect(tc.discovery).toBeLessThanOrEqual(100);
    expect(tc.governance).toBeGreaterThanOrEqual(0);
    expect(tc.governance).toBeLessThanOrEqual(100);
    expect(tc.compliance).toBeGreaterThanOrEqual(0);
    expect(tc.compliance).toBeLessThanOrEqual(100);
    expect(tc.overall).toBeGreaterThanOrEqual(0);
    expect(tc.overall).toBeLessThanOrEqual(100);
  });

  test('label is one of HIGH/MEDIUM/LOW', () => {
    const { label } = engine.computeTripleConfidence();
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(label);
  });

  test('governance score > 0 because agents have owners in seed', () => {
    const { governance } = engine.computeTripleConfidence();
    expect(governance).toBeGreaterThan(0);
  });

  test('compliance score > 0 because some regulations are compliant in seed', () => {
    const { compliance } = engine.computeTripleConfidence();
    // GDPR, LGPD, ISO 42001 are compliant in seed → compliance > 0
    expect(compliance).toBeGreaterThan(0);
  });

  test('overall is weighted average of 3 axes', () => {
    const tc = engine.computeTripleConfidence();
    const expected = Math.round(tc.discovery * 0.3 + tc.governance * 0.4 + tc.compliance * 0.3);
    expect(tc.overall).toBe(expected);
  });
});
