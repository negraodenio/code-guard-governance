import { parseGovernanceIntent, answerGovernanceQuery } from '../src/lib/governance/talk';
import { buildFullGraph } from '@council/graphos';
import type { GraphEngine } from '@council/graphos';

describe('Talk to Governance — Intent Parser', () => {
  // ── Intent detection — EN ────────────────────────────────────────────────
  describe('English queries', () => {
    const cases: Array<[string, string]> = [
      ['Who decided dec-001?', 'who_decided'],
      ['Which agents process PII?', 'which_agents_pii'],
      ['Are we compliant with GDPR?', 'compliance_status'],
      ['What is the total risk exposure?', 'risk_exposure'],
      ['Who owns each agent?', 'who_owns_agent'],
      ['Can we certify under ISO 42001?', 'certification_status'],
      ['What does the LLM model cost?', 'model_cost'],
      ['Show me the audit trail for evidence', 'audit_trail'],
      ['What regulation gaps do we have?', 'regulation_gaps'],
      ['List high risk agents and autonomous ones', 'high_risk_agents'],
      ['Where does data go? Show me data flows', 'data_flows'],
      ['Which controls are active in the system?', 'controls_active'],
    ];

    for (const [query, expectedIntent] of cases) {
      test(`"${query}" → ${expectedIntent}`, () => {
        const { intent, confidence } = parseGovernanceIntent(query);
        expect(intent).toBe(expectedIntent);
        expect(confidence).toBeGreaterThan(0);
      });
    }
  });

  // ── Intent detection — PT ────────────────────────────────────────────────
  describe('Portuguese queries', () => {
    const cases: Array<[string, string]> = [
      ['Quem decidiu a decisão 001?', 'who_decided'],
      ['Quais agentes processam dados pessoais?', 'which_agents_pii'],
      ['Quais são as lacunas de regulação?', 'regulation_gaps'],
      ['Qual é a exposição de risco total?', 'risk_exposure'],
      ['Quem é dono do agente compliance?', 'who_owns_agent'],
      ['Podemos certificar ISO 42001?', 'certification_status'],
    ];

    for (const [query, expectedIntent] of cases) {
      test(`PT: "${query}" → ${expectedIntent}`, () => {
        const { intent } = parseGovernanceIntent(query);
        expect(intent).toBe(expectedIntent);
      });
    }
  });

  // ── Unknown intent ───────────────────────────────────────────────────────
  test('gibberish returns unknown', () => {
    const { intent, confidence } = parseGovernanceIntent('xyzzy frobble wibble');
    expect(intent).toBe('unknown');
    expect(confidence).toBe(0);
  });

  test('empty string returns unknown with 0 confidence', () => {
    const { intent, confidence } = parseGovernanceIntent('');
    expect(intent).toBe('unknown');
    expect(confidence).toBe(0);
  });
});

describe('Talk to Governance — Answer Engine', () => {
  let engine: GraphEngine;

  beforeAll(async () => {
    engine = await buildFullGraph();
  });

  test('who_decided returns 5 decisions with agents', () => {
    const answer = answerGovernanceQuery('who_decided', engine, 'who decided?');
    expect(answer.intent).toBe('who_decided');
    expect(answer.score).toBeGreaterThanOrEqual(5); // 5 decisions in seed
    expect(answer.nodeIds.length).toBeGreaterThan(0);
    expect(answer.evidence.length).toBeGreaterThan(0);
    expect(answer.answer).toContain('decisions');
    expect(answer.answerPt).toContain('decisões');
  });

  test('compliance_status returns % score', () => {
    const answer = answerGovernanceQuery('compliance_status', engine, 'are we compliant?');
    expect(answer.intent).toBe('compliance_status');
    expect(typeof answer.score).toBe('number');
    expect(answer.score).toBeGreaterThanOrEqual(0);
    expect(answer.score).toBeLessThanOrEqual(100);
  });

  test('model_cost returns totalCost number', () => {
    const answer = answerGovernanceQuery('model_cost', engine, 'what does it cost?');
    expect(answer.intent).toBe('model_cost');
    expect(answer.nodeIds.length).toBeGreaterThan(0);
  });

  test('audit_trail returns evidence count', () => {
    const answer = answerGovernanceQuery('audit_trail', engine, 'show audit trail');
    expect(answer.intent).toBe('audit_trail');
    expect(answer.answer).toContain('evidence');
    expect(answer.answer).toContain('HMAC');
  });

  test('high_risk_agents identifies critical agent-judge', () => {
    const answer = answerGovernanceQuery('high_risk_agents', engine, 'list high risk agents');
    expect(answer.intent).toBe('high_risk_agents');
    // agent-judge is critical
    expect(answer.nodeIds.length).toBeGreaterThanOrEqual(1);
  });

  test('controls_active lists CG-AG controls', () => {
    const answer = answerGovernanceQuery('controls_active', engine, 'which controls are active?');
    expect(answer.intent).toBe('controls_active');
    expect(typeof answer.score).toBe('number');
    expect(answer.score).toBeGreaterThanOrEqual(10); // seed has 12 controls
  });

  test('data_flows returns processRels count', () => {
    const answer = answerGovernanceQuery('data_flows', engine, 'where does data go?');
    expect(answer.intent).toBe('data_flows');
    expect(answer.nodeIds.length).toBeGreaterThan(0);
  });

  test('who_owns_agent returns ownership %', () => {
    const answer = answerGovernanceQuery('who_owns_agent', engine, 'who owns agents?');
    expect(answer.intent).toBe('who_owns_agent');
    expect(typeof answer.score).toBe('number');
    expect(answer.score).toBeGreaterThanOrEqual(0);
  });

  test('unknown intent returns helpful fallback', () => {
    const answer = answerGovernanceQuery('unknown', engine, 'xyzzy frobble');
    expect(answer.intent).toBe('unknown');
    expect(answer.confidence).toBe(0);
    expect(answer.answer).toContain('compliance');
    expect(answer.answerPt).toContain('conformidade');
  });

  test('all 12 intents execute without throwing', () => {
    const intents = [
      'who_decided', 'which_agents_pii', 'compliance_status', 'risk_exposure',
      'who_owns_agent', 'certification_status', 'model_cost', 'audit_trail',
      'regulation_gaps', 'high_risk_agents', 'data_flows', 'controls_active',
    ] as const;
    for (const intent of intents) {
      expect(() => answerGovernanceQuery(intent, engine, `test ${intent}`)).not.toThrow();
    }
  });
});
