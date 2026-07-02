/**
 * GraphOS DB Repository tests.
 *
 * These tests mock the Supabase client to verify the repository logic
 * without requiring a real Postgres database.
 *
 * Run with: npx jest tests/graphos-db.test.ts
 * To run against a real DB, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { GraphRepository } from '../src/graphos/db/repository';
import type { GraphEntity, Relationship } from '@council/graphos';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
function ent(id: string, kind: string, label: string, description: string, attrs: Record<string, any> = {}) {
  return { id, kind, label, description, attributes: attrs, embedding: null, created_at: '2026-06-20T00:00:00Z', updated_at: '2026-06-20T00:00:00Z' };
}

function rel(id: string, kind: string, source_id: string, target_id: string, weight = 1, metadata: Record<string, any> = {}) {
  return { id, kind, source_id, target_id, weight, metadata, created_at: '2026-06-20T00:00:00Z' };
}

const MOCK_ENTITIES: Record<string, any> = {
  'agent-judge': ent('agent-judge', 'agent', 'Executive Judge', 'Final decision authority', {
    agentType: 'ai_persona', personaId: 'judge', ownerId: 'owner-ceo',
    riskLevel: 'medium', status: 'active', tools: ['tool-llm-openrouter'],
    models: ['model-gpt4'], complianceScore: 90, critical: true,
  }),
  'dec-001': ent('dec-001', 'decision', 'EU Market Expansion', 'Expand into EU market', {
    verdict: 'CONDITIONAL', score: 68, confidence: 82,
    timestamp: '2026-06-15T10:00:00Z', agentId: 'agent-judge',
    evidenceIds: ['ev-001', 'ev-002'], riskIds: ['risk-001'],
    costUsd: 2.45, regulationIds: ['reg-gdpr'],
  }),
  'tool-llm-openrouter': ent('tool-llm-openrouter', 'tool', 'OpenRouter LLM', 'LLM API proxy', {
    toolType: 'api', accessLevel: 'write', dataAssets: ['data-prompts'],
    exposed: true, hasSecrets: true,
  }),
  'ev-001': ent('ev-001', 'evidence', 'Market Analysis Report Q2', 'Q2 market data', {
    evidenceType: 'document', source: 'Internal Research',
  }),
  'owner-ceo': ent('owner-ceo', 'owner', 'CEO', 'Chief Executive Officer', {
    email: 'ceo@councilia.com', role: 'ceo', teams: ['Executive'],
  }),
  'reg-gdpr': ent('reg-gdpr', 'regulation', 'GDPR (EU) 2016/679', 'General Data Protection Regulation', {
    regulationId: 'GDPR', authority: 'EU', status: 'compliant',
    requirements: ['Consent', 'DPIA'],
    certificateIds: ['cert-soc2'], agentsInScope: ['agent-judge'],
  }),
  'model-gpt4': ent('model-gpt4', 'model', 'GPT-4o', 'OpenAI GPT-4o', {
    provider: 'openai', modelId: 'gpt-4o', version: '2024-08-06',
    costPerToken: 0.000005, latencyMs: 1200, tokensUsed: 12500000,
  }),
};

const MOCK_RELS: Record<string, any> = {
  'rel-uses-agent-judge-tool-llm-openrouter': rel('rel-uses-agent-judge-tool-llm-openrouter', 'USES_TOOL', 'agent-judge', 'tool-llm-openrouter', 3),
  'rel-dec-agent-dec-001': rel('rel-dec-agent-dec-001', 'MAKES_DECISION', 'agent-judge', 'dec-001', 68, { verdict: 'CONDITIONAL' }),
  'rel-evidence-dec-001-ev-001': rel('rel-evidence-dec-001-ev-001', 'EVIDENCED_BY', 'dec-001', 'ev-001', 2),
  'rel-owned-agent-judge': rel('rel-owned-agent-judge', 'OWNED_BY', 'agent-judge', 'owner-ceo'),
  'rel-uses-model-agent-judge': rel('rel-uses-model-agent-judge', 'USES_MODEL', 'agent-judge', 'model-gpt4', 2),
  'rel-reg-reg-gdpr-agent-judge': rel('rel-reg-reg-gdpr-agent-judge', 'REGULATES', 'reg-gdpr', 'agent-judge'),
};

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
function createMockSupabase() {
  const entities = new Map(Object.entries(MOCK_ENTITIES));
  const rels = new Map(Object.entries(MOCK_RELS));

  const mockQuery = (table: string) => {
    let filters: Record<string, any> = {};
    let filterIn: Record<string, any[]> = {};

    const builder = {
      select: () => builder,
      eq: (col: string, val: any) => {
        filters[col] = val;
        return builder;
      },
      in: (col: string, vals: any[]) => {
        filterIn[col] = vals;
        return builder;
      },
      single: () => {
        const store = table === 'graphos_entities' ? entities : rels;
        const entries = Array.from(store.values());
        const match = entries.find(e => {
          return Object.entries(filters).every(([k, v]) => e[k] === v);
        });
        return { data: match || null, error: match ? null : { message: 'Not found' } };
      },
      then: (resolve: any, _reject?: any) => {
        const store = table === 'graphos_entities' ? entities : rels;
        let results = Array.from(store.values());

        for (const [col, val] of Object.entries(filters)) {
          results = results.filter(r => r[col] === val);
        }
        for (const [col, vals] of Object.entries(filterIn)) {
          results = results.filter(r => vals.includes(r[col]));
        }

        resolve({ data: results, error: null });
      },
    };

    return builder;
  };

  return {
    from: (table: string) => ({
      select: () => mockQuery(table),
      upsert: async (data: any, _opts?: any) => {
        const store = table === 'graphos_entities' ? entities : rels;
        const rows = Array.isArray(data) ? data : [data];
        for (const row of rows) {
          store.set(row.id, row);
        }
        return { error: null };
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
function getTestRepo(): GraphRepository {
  const repo = new GraphRepository();
  (repo as any).supabase = createMockSupabase();
  return repo;
}

describe('GraphOS DB Repository', () => {
  describe('CRUD operations', () => {
    test('getEntity returns entity by id', async () => {
      const repo = getTestRepo();
      const entity = await repo.getEntity('agent-judge');
      expect(entity).toBeDefined();
      expect(entity!.id).toBe('agent-judge');
      expect(entity!.kind).toBe('agent');
      expect(entity!.label).toBe('Executive Judge');
    });

    test('getEntity returns undefined for nonexistent id', async () => {
      const repo = getTestRepo();
      const entity = await repo.getEntity('nonexistent');
      expect(entity).toBeUndefined();
    });

    test('getEntitiesByKind filters correctly', async () => {
      const repo = getTestRepo();
      const agents = await repo.getEntitiesByKind('agent');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-judge');

      const decisions = await repo.getEntitiesByKind('decision');
      expect(decisions.length).toBe(1);
      expect(decisions[0].id).toBe('dec-001');
    });

    test('getRelationships returns all or filtered by kind', async () => {
      const repo = getTestRepo();
      const all = await repo.getRelationships();
      expect(all.length).toBe(Object.keys(MOCK_RELS).length);

      const usesTool = await repo.getRelationships('USES_TOOL' as any);
      expect(usesTool.length).toBe(1);
      expect(usesTool[0].kind).toBe('USES_TOOL');
    });

    test('addEntity upserts correctly', async () => {
      const repo = getTestRepo();
      const newEntity: GraphEntity = {
        id: 'test-new', kind: 'tool', label: 'Test Tool', description: 'A test',
      };
      await repo.addEntity(newEntity);
      const fetched = await repo.getEntity('test-new');
      expect(fetched).toBeDefined();
      expect(fetched!.label).toBe('Test Tool');
    });

    test('addRelationships upserts multiple', async () => {
      const repo = getTestRepo();
      const newRels: Relationship[] = [
        { id: 'rel-test-1', kind: 'DEPENDS_ON' as any, sourceId: 'agent-judge', targetId: 'test-new', weight: 1 },
        { id: 'rel-test-2', kind: 'CONTAINS' as any, sourceId: 'agent-judge', targetId: 'agent-judge', weight: 1 },
      ];
      await repo.addRelationships(newRels);
      const all = await repo.getRelationships();
      expect(all.length).toBe(Object.keys(MOCK_RELS).length + 2);
    });
  });

  describe('traverse() — BFS', () => {
    test('traverse from decision dec-001 follows reverse MAKES_DECISION to agent', async () => {
      const repo = getTestRepo();
      const { entities } = await repo.traverse('dec-001', [], ['MAKES_DECISION']);
      const agents = entities.filter(e => e.kind === 'agent');
      expect(agents.length).toBe(1);
      expect(agents[0].id).toBe('agent-judge');
    });

    test('traverse from decision dec-001 reaches evidence via EVIDENCED_BY', async () => {
      const repo = getTestRepo();
      const { entities } = await repo.traverse('dec-001', ['EVIDENCED_BY'], ['MAKES_DECISION'], 2);
      const evidences = entities.filter(e => e.kind === 'evidence');
      expect(evidences.length).toBeGreaterThanOrEqual(1);
    });

    test('traverse respects maxDepth — depth 1 reaches agent + evidence', async () => {
      const repo = getTestRepo();
      const { entities } = await repo.traverse('dec-001', ['EVIDENCED_BY'], ['MAKES_DECISION'], 1);
      const agents = entities.filter(e => e.kind === 'agent');
      const evidences = entities.filter(e => e.kind === 'evidence');
      expect(agents.length).toBe(1);
      expect(evidences.length).toBeGreaterThanOrEqual(1);
    });

    test('USES_TOOL forward from agent reaches tool', async () => {
      const repo = getTestRepo();
      const { entities } = await repo.traverse('agent-judge', ['USES_TOOL'], [], 1);
      const tools = entities.filter(e => e.kind === 'tool');
      expect(tools.length).toBeGreaterThanOrEqual(1);
    });

    test('USES_TOOL reverse from tool does NOT reach agents (forward-only)', async () => {
      const repo = getTestRepo();
      const { entities } = await repo.traverse('tool-llm-openrouter', ['USES_TOOL'], [], 1);
      const agents = entities.filter(e => e.kind === 'agent');
      expect(entities.length).toBe(1);
      expect(agents.length).toBe(0);
    });
  });

  describe('reconstructDecision()', () => {
    test('reconstructs dec-001 with agent, evidence, owner, regulation', async () => {
      const repo = getTestRepo();
      const { entities, rels } = await repo.reconstructDecision('dec-001');

      const agents = entities.filter(e => e.kind === 'agent');
      const evidences = entities.filter(e => e.kind === 'evidence');
      const owners = entities.filter(e => e.kind === 'owner');
      const regulations = entities.filter(e => e.kind === 'regulation');
      const models = entities.filter(e => e.kind === 'model');

      expect(agents.length).toBe(1);
      expect(evidences.length).toBeGreaterThanOrEqual(1);
      expect(owners.length).toBeGreaterThanOrEqual(1);
      expect(regulations.length).toBeGreaterThanOrEqual(1);
      expect(models.length).toBeGreaterThanOrEqual(1);
      expect(rels.length).toBeGreaterThan(0);
    });

    test('returns empty for nonexistent decision', async () => {
      const repo = getTestRepo();
      const { entities, rels } = await repo.reconstructDecision('dec-nonexistent');
      expect(entities.length).toBe(0);
      expect(rels.length).toBe(0);
    });
  });

  describe('convertToVisualization()', () => {
    test('score precedence uses actual score', async () => {
      const repo = getTestRepo();
      const { entities } = await repo.reconstructDecision('dec-001');
      const { nodes } = repo.convertToVisualization(entities, []);

      const decisionNode = nodes.find(n => n.id === 'dec-001');
      expect(decisionNode).toBeDefined();
      expect(decisionNode!.score).not.toBe(90);
    });

    test('fallback uses riskLevel when score is null', () => {
      const repo = getTestRepo();
      const fakeEntity: GraphEntity = {
        id: 'test-risk', kind: 'risk', label: 'Test Risk',
      };
      (fakeEntity as any).riskLevel = 'high';
      (fakeEntity as any).score = null;

      const { nodes } = repo.convertToVisualization([fakeEntity], []);
      const node = nodes.find(n => n.id === 'test-risk');
      expect(node).toBeDefined();
      expect(node!.score).toBe(70);
    });
  });

  describe('Views', () => {
    test('CEO view returns summary with agent count', async () => {
      const { buildCEOView } = require('../src/graphos/db/views');
      const repo = getTestRepo();
      const result = await buildCEOView(repo);
      expect(result.summary.agents).toBe(1);
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    test('CFO view returns cost data', async () => {
      const { buildCFOView } = require('../src/graphos/db/views');
      const repo = getTestRepo();
      const result = await buildCFOView(repo);
      expect(result.summary.avgCostPerDecision).toBeDefined();
      expect(result.summary.totalDecisions).toBe(1);
    });

    test('Auditor view reconstructs first decision', async () => {
      const { buildAuditorView } = require('../src/graphos/db/views');
      const repo = getTestRepo();
      const result = await buildAuditorView(repo);
      expect(result.summary.decisionId).toBeDefined();
      expect(result.summary.verdict).toBeDefined();
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    test('All 10 DB views execute without error', async () => {
      const { DB_VIEW_BUILDERS } = require('../src/graphos/db/views');
      const repo = getTestRepo();
      const viewNames = ['ceo', 'cfo', 'ciso', 'dpo', 'compliance', 'auditor', 'board', 'constitutional', 'ecosystem', 'certification'];
      for (const name of viewNames) {
        const builder = DB_VIEW_BUILDERS[name];
        const result = await builder(repo);
        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.description).toBeDefined();
      }
    });
  });

  describe('factory', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    test('createGraphBackend returns memory backend by default', async () => {
      const { createGraphBackend, resetBackendCache } = require('../src/graphos/factory');
      resetBackendCache();
      delete process.env.GRAPHOS_DB_URL;
      const backend = await createGraphBackend();
      expect(backend.type).toBe('memory');
    });
  });
});

describe('GraphOS DB Views', () => {
  test('DB view builders match in-memory view names', () => {
    const { DB_VIEW_BUILDERS } = require('../src/graphos/db/views');
    const names = Object.keys(DB_VIEW_BUILDERS);
    const expected = ['ceo', 'cfo', 'ciso', 'dpo', 'compliance', 'auditor', 'board', 'constitutional', 'ecosystem', 'certification', 'ai_act', 'agent_governance'];
    expect(names.sort()).toEqual(expected.sort());
  });

  test('DB view meta matches in-memory meta', () => {
    const { DB_VIEW_META } = require('../src/graphos/db/views');
    expect(DB_VIEW_META.ceo.label).toBe('CEO');
    expect(DB_VIEW_META.cfo.label).toBe('CFO');
    expect(DB_VIEW_META.auditor.label).toBe('Auditor');
  });
});
