import { createAdminClient } from '@/lib/supabase/admin';
import type { GraphEntity, EntityKind } from '@council/graphos/types/entities';
import type { Relationship, RelKind } from '@council/graphos/types/relationships';
import { RELATIONSHIP_DEFS } from '@council/graphos/types/relationships';
import type { GraphNode, GraphEdge } from '@council/graphos';

type ColorMap = Record<string, string>;
const COLORS: ColorMap = {
  agent: '#0ECFB8', decision: '#F0F4FA', tool: '#5B50F0',
  external_system: '#F87171', data_asset: '#F59E0B',
  control: '#22C55E', regulation: '#94A3B8', certificate: '#A855F7',
  risk: '#EF4444', incident: '#F97316', evidence: '#6366F1',
  model: '#06B6D4', owner: '#EC4899', cost_center: '#14B8A6',
  prompt: '#F0AB00',
};

interface EntityRow {
  id: string;
  kind: string;
  label: string;
  description: string | null;
  attributes: Record<string, unknown>;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

interface RelationshipRow {
  id: string;
  kind: string;
  source_id: string;
  target_id: string;
  weight: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export class GraphRepository {
  private supabase = createAdminClient();

  private mapRowToEntity(row: EntityRow): GraphEntity {
    return {
      id: row.id,
      kind: row.kind as EntityKind,
      label: row.label,
      description: row.description ?? undefined,
      ...row.attributes,
    } as GraphEntity;
  }

  private mapRowToRelationship(row: RelationshipRow): Relationship {
    return {
      id: row.id,
      kind: row.kind as RelKind,
      sourceId: row.source_id,
      targetId: row.target_id,
      weight: row.weight,
      metadata: row.metadata,
    };
  }

  async addEntity(e: GraphEntity): Promise<void> {
    const { id, kind, label, description, ...attributes } = e;
    await this.supabase.from('graphos_entities').upsert({
      id,
      kind,
      label,
      description: description ?? null,
      attributes,
    }, { onConflict: 'id' });
  }

  async addEntityWithTenant(
    e: GraphEntity,
    tenantId: string,
    sourceTable?: string,
    sourceId?: string,
  ): Promise<void> {
    const { id, kind, label, description, ...attributes } = e;
    await this.supabase.from('graphos_entities').upsert({
      id,
      kind,
      label,
      description: description ?? null,
      attributes,
      tenant_id: tenantId,
      source_table: sourceTable ?? null,
      source_id: sourceId ?? null,
    }, { onConflict: 'id' });
  }

  async addRelationship(r: Relationship): Promise<void> {
    await this.supabase.from('graphos_relationships').upsert({
      id: r.id,
      kind: r.kind,
      source_id: r.sourceId,
      target_id: r.targetId,
      weight: r.weight ?? 1,
      metadata: r.metadata ?? {},
      tenant_id: r.tenantId ?? null,
    }, { onConflict: 'id' });
  }

  async addRelationships(rs: Relationship[]): Promise<void> {
    const rows = rs.map(r => ({
      id: r.id,
      kind: r.kind,
      source_id: r.sourceId,
      target_id: r.targetId,
      weight: r.weight ?? 1,
      metadata: r.metadata ?? {},
    }));
    const { error } = await this.supabase.from('graphos_relationships').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }

  async getEntity(id: string): Promise<GraphEntity | undefined> {
    const { data, error } = await this.supabase
      .from('graphos_entities')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return this.mapRowToEntity(data as EntityRow);
  }

  async getEntitiesByKind(kind: string): Promise<GraphEntity[]> {
    const { data, error } = await this.supabase
      .from('graphos_entities')
      .select('*')
      .eq('kind', kind);
    if (error) throw error;
    return (data || []).map(r => this.mapRowToEntity(r as EntityRow));
  }

  async getRelationships(kind?: RelKind): Promise<Relationship[]> {
    let query = this.supabase.from('graphos_relationships').select('*');
    if (kind) {
      query = query.eq('kind', kind);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(r => this.mapRowToRelationship(r as RelationshipRow));
  }

  private async getRelationshipsBySource(sourceId: string, kinds: string[]): Promise<Relationship[]> {
    if (kinds.length === 0) return [];
    const { data, error } = await this.supabase
      .from('graphos_relationships')
      .select('*')
      .eq('source_id', sourceId)
      .in('kind', kinds);
    if (error) throw error;
    return (data || []).map(r => this.mapRowToRelationship(r as RelationshipRow));
  }

  private async getRelationshipsByTarget(targetId: string, kinds: string[]): Promise<Relationship[]> {
    if (kinds.length === 0) return [];
    const { data, error } = await this.supabase
      .from('graphos_relationships')
      .select('*')
      .eq('target_id', targetId)
      .in('kind', kinds);
    if (error) throw error;
    return (data || []).map(r => this.mapRowToRelationship(r as RelationshipRow));
  }

  private async getEntitiesByIds(ids: string[]): Promise<GraphEntity[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from('graphos_entities')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return (data || []).map(r => this.mapRowToEntity(r as EntityRow));
  }

  async traverse(
    sourceId: string,
    forwardKinds: RelKind[],
    reverseKinds: RelKind[] = [],
    maxDepth = 3,
  ): Promise<{ entities: GraphEntity[]; rels: Relationship[] }> {
    const visited = new Set<string>([sourceId]);
    const rels: Relationship[] = [];
    const queue: { id: string; depth: number }[] = [{ id: sourceId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const forwardRels = await this.getRelationshipsBySource(id, forwardKinds);
      for (const rel of forwardRels) {
        if (!visited.has(rel.targetId)) {
          visited.add(rel.targetId);
          rels.push(rel);
          queue.push({ id: rel.targetId, depth: depth + 1 });
        }
      }

      const reverseRels = await this.getRelationshipsByTarget(id, reverseKinds);
      for (const rel of reverseRels) {
        if (!visited.has(rel.sourceId)) {
          visited.add(rel.sourceId);
          rels.push(rel);
          queue.push({ id: rel.sourceId, depth: depth + 1 });
        }
      }
    }

    const entities = await this.getEntitiesByIds(Array.from(visited));
    return { entities, rels };
  }

  async reconstructDecision(decisionId: string, _depth = 5) {
    return this.traverse(decisionId,
      ['GENERATED_BY_PROMPT', 'USES_PROMPT',
        'EVIDENCED_BY', 'OWNED_BY',
        'USES_TOOL', 'USES_MODEL', 'PROCESSES_DATA', 'IMPACTS_RISK', 'COSTS',
      ],
      ['MAKES_DECISION', 'REGULATES'],
      _depth,
    );
  }

  async securityView(agentId: string) {
    return this.traverse(agentId,
      ['USES_TOOL', 'ACCESSES_SYSTEM', 'PROCESSES_DATA', 'OWNED_BY'],
      [],
      4,
    );
  }

  async privacyView(agentId: string) {
    return this.traverse(agentId,
      ['PROCESSES_DATA', 'OWNED_BY'],
      ['REGULATES'],
      3,
    );
  }

  async complianceView(agentId: string) {
    return this.traverse(agentId,
      ['MAKES_DECISION', 'REQUIRES_CERT', 'EVIDENCED_BY'],
      ['REGULATES'],
      4,
    );
  }

  async constitutionalView(agentId: string) {
    return this.traverse(agentId,
      ['APPEALS_CONTROL', 'EVIDENCED_BY', 'REQUIRES_CERT'],
      ['GOVERNS'],
      4,
    );
  }

  convertToVisualization(
    entities: GraphEntity[],
    rels: Relationship[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodeMap = new Map<string, GraphNode>();

    for (const e of entities) {
      const color = COLORS[e.kind] ?? '#6B7A95';
      const entity = e as any;
      nodeMap.set(e.id, {
        id: e.id,
        type: e.kind === 'agent' ? 'persona'
           : e.kind === 'decision' ? 'decision'
           : e.kind === 'control' || e.kind === 'regulation' || e.kind === 'risk' || e.kind === 'prompt' ? 'concept'
           : 'concept',
        label: e.label,
        subtitle: e.description?.slice(0, 60),
        emoji: this.getEmoji(e.kind),
        score: entity.score ?? (entity.riskLevel === 'critical' ? 90 : entity.riskLevel === 'high' ? 70 : 50),
        color,
        radius: e.kind === 'agent' ? 30 : e.kind === 'decision' ? 34 : e.kind === 'risk' ? 26 : 20,
        payload: entity,
      });
    }

    const edges: GraphEdge[] = [];
    for (const rel of rels) {
      if (nodeMap.has(rel.sourceId) && nodeMap.has(rel.targetId)) {
        const def = RELATIONSHIP_DEFS[rel.kind];
        edges.push({
          source: rel.sourceId,
          target: rel.targetId,
          weight: rel.weight ?? 5,
          sentiment: 'neutral',
          label: def?.label ?? rel.kind,
          dash: rel.kind === 'APPEALS_CONTROL' || rel.kind === 'REVIEWS',
        });
      }
    }

    return { nodes: Array.from(nodeMap.values()), edges };
  }

  private getEmoji(kind: string): string {
    const map: Record<string, string> = {
      agent: '🤖', decision: '📋', tool: '🔧', external_system: '☁️',
      data_asset: '💾', control: '🛡️', regulation: '⚖️', certificate: '📜',
      risk: '⚠️', incident: '🚨', evidence: '📎', model: '🧠',
      owner: '👤', cost_center: '💰', prompt: '📝',
    };
    return map[kind] ?? '🔹';
  }
}
