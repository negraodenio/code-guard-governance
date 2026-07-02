import type { GraphEntity, Relationship, RelKind, FullGraph } from './types';

export class GraphEngine {
  private g: FullGraph = { entities: new Map(), relationships: [] };

  get graph() { return this.g; }
  get entities() { return this.g.entities; }
  get relationships() { return this.g.relationships; }
  get size() { return this.g.entities.size; }

  load(entities: GraphEntity[], relationships: Relationship[]) {
    for (const e of entities) this.g.entities.set(e.id, e);
    this.g.relationships.push(...relationships);
  }

  addEntity(e: GraphEntity) { this.g.entities.set(e.id, e); }
  addRelationship(r: Relationship) { this.g.relationships.push(r); }

  getEntity(id: string) { return this.g.entities.get(id); }

  getEntitiesByKind(kind: string): GraphEntity[] {
    return Array.from(this.g.entities.values()).filter(e => e.kind === kind);
  }

  getRelationships(kind?: RelKind): Relationship[] {
    return kind ? this.g.relationships.filter(r => r.kind === kind) : this.g.relationships;
  }

  reconstructDecision(decisionId: string, maxDepth = 5): { entities: GraphEntity[]; rels: Relationship[] } {
    if (!this.getEntity(decisionId)) return { entities: [], rels: [] };
    return this.traverse(
      decisionId,
      [
        'EVIDENCED_BY', 'GENERATED_BY_PROMPT', 'USES_PROMPT', 'USES_MODEL',
        'IMPACTS_RISK', 'REQUIRES_CERT', 'COSTS', 'USES_TOOL',
        'ACCESSES_SYSTEM', 'PROCESSES_DATA', 'OWNED_BY',
      ],
      ['MAKES_DECISION', 'REGULATES'],
      maxDepth,
    );
  }

  convertToVisualization(entities: GraphEntity[], rels: Relationship[]): { nodes: any[]; edges: any[] } {
    const colors: Record<string, string> = {
      agent: '#0ECFB8', decision: '#F0AB00', tool: '#5B50F0', external_system: '#F87171',
      data_asset: '#F59E0B', control: '#22C55E', regulation: '#94A3B8', certificate: '#A855F7',
      risk: '#EF4444', incident: '#F97316', evidence: '#6366F1', model: '#06B6D4',
      owner: '#EC4899', cost_center: '#14B8A6', prompt: '#F0AB00',
    };
    const scoreFor = (entity: any) => {
      if (entity.score !== undefined && entity.score !== null) return entity.score;
      if (entity.attrs?.score !== undefined && entity.attrs?.score !== null) return entity.attrs.score;
      const riskLevel = entity.riskLevel ?? entity.attrs?.riskLevel;
      if (riskLevel === 'critical') return 90;
      if (riskLevel === 'high') return 70;
      if (riskLevel === 'medium') return 50;
      if (riskLevel === 'low') return 25;
      return 50;
    };
    const nodeIds = new Set(entities.map(e => e.id));
    return {
      nodes: entities.map((entity: any) => ({
        id: entity.id,
        type: entity.kind === 'agent' ? 'persona' : entity.kind,
        label: entity.label,
        subtitle: entity.description,
        score: scoreFor(entity),
        color: colors[entity.kind] ?? '#6B7A95',
        radius: entity.kind === 'decision' ? 34 : entity.kind === 'agent' ? 30 : 22,
        payload: entity,
      })),
      edges: rels
        .filter(rel => nodeIds.has(rel.sourceId) && nodeIds.has(rel.targetId))
        .map(rel => ({
          source: rel.sourceId,
          target: rel.targetId,
          weight: rel.weight ?? 1,
          sentiment: 'neutral',
          label: rel.kind,
          dash: rel.kind === 'APPEALS_CONTROL' || rel.kind === 'REVIEWS',
        })),
    };
  }

  traverse(
    sourceId: string,
    forwardKinds: RelKind[] = [],
    reverseKinds: RelKind[] = [],
    maxDepth = 3,
  ): { entities: GraphEntity[]; rels: Relationship[] } {
    const visited = new Set<string>([sourceId]);
    const rels: Relationship[] = [];
    const queue: { id: string; depth: number }[] = [{ id: sourceId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      for (const rel of this.g.relationships) {
        if (forwardKinds.includes(rel.kind) && rel.sourceId === id && !visited.has(rel.targetId)) {
          visited.add(rel.targetId);
          rels.push(rel);
          queue.push({ id: rel.targetId, depth: depth + 1 });
        }
        if (reverseKinds.includes(rel.kind) && rel.targetId === id && !visited.has(rel.sourceId)) {
          visited.add(rel.sourceId);
          rels.push(rel);
          queue.push({ id: rel.sourceId, depth: depth + 1 });
        }
      }
    }

    return {
      entities: Array.from(visited).map(id => this.g.entities.get(id)).filter(Boolean) as GraphEntity[],
      rels,
    };
  }

  propagateRisk(
    sourceId: string,
    depth = 4,
  ): { entities: GraphEntity[]; rels: Relationship[]; exposureMap: Map<string, number> } {
    if (!this.getEntity(sourceId)) return { entities: [], rels: [], exposureMap: new Map() };

    const FORWARD_KINDS: RelKind[] = [
      'MAKES_DECISION', 'USES_TOOL', 'ACCESSES_SYSTEM',
      'PROCESSES_DATA', 'USES_MODEL', 'DEPENDS_ON', 'INTEGRATES_WITH',
    ];

    const exposureMap = new Map<string, number>();
    const visited = new Set<string>([sourceId]);
    const rels: Relationship[] = [];
    const queue: { id: string; depth: number; score: number }[] = [{ id: sourceId, depth: 0, score: 100 }];
    exposureMap.set(sourceId, 100);

    while (queue.length > 0) {
      const { id, depth: d, score } = queue.shift()!;
      if (d >= depth) continue;
      for (const rel of this.g.relationships) {
        if (FORWARD_KINDS.includes(rel.kind) && rel.sourceId === id && !visited.has(rel.targetId)) {
          visited.add(rel.targetId);
          rels.push(rel);
          // Exposure decays by 40% per hop, floored at 5
          const childScore = Math.max(5, Math.round(score * 0.6));
          exposureMap.set(rel.targetId, childScore);
          queue.push({ id: rel.targetId, depth: d + 1, score: childScore });
        }
      }
    }

    return {
      entities: Array.from(visited)
        .map(id => this.g.entities.get(id))
        .filter(Boolean) as GraphEntity[],
      rels,
      exposureMap,
    };
  }

  computeTripleConfidence(): {
    discovery: number;
    governance: number;
    compliance: number;
    overall: number;
    label: 'HIGH' | 'MEDIUM' | 'LOW';
  } {
    const agents     = this.getEntitiesByKind('agent');
    const decisions  = this.getEntitiesByKind('decision');
    const regs       = this.getEntitiesByKind('regulation') as any[];
    const controls   = this.getEntitiesByKind('control');
    const evidence   = this.getEntitiesByKind('evidence');
    const owners     = this.getEntitiesByKind('owner');
    const allRels    = this.g.relationships;

    // ── Discovery: % of agents that have evidence linked
    const agentIds = new Set(agents.map(a => a.id));
    const evidencedAgents = new Set(
      allRels
        .filter(r => r.kind === 'MAKES_DECISION')
        .map(r => r.sourceId)
        .filter(id => agentIds.has(id)),
    );
    const discovery = agents.length > 0
      ? Math.round((evidencedAgents.size / agents.length) * 100)
      : 0;

    // ── Governance: agents with owner + control + decision trail
    const agentsWithOwner = new Set(
      allRels.filter(r => r.kind === 'OWNED_BY' && agentIds.has(r.sourceId)).map(r => r.sourceId),
    );
    const agentsWithDecision = new Set(
      allRels.filter(r => r.kind === 'MAKES_DECISION' && agentIds.has(r.sourceId)).map(r => r.sourceId),
    );
    const fullyGoverned = agents.filter(
      a => agentsWithOwner.has(a.id) && agentsWithDecision.has(a.id),
    ).length;
    const governance = agents.length > 0
      ? Math.round((fullyGoverned / agents.length) * 100)
      : (controls.length > 0 && owners.length > 0 ? 60 : 20);

    // ── Compliance: % of regulations that are compliant
    const compliant = regs.filter(
      r => (r.status ?? r.attrs?.status) === 'compliant',
    ).length;
    const compliance = regs.length > 0
      ? Math.round((compliant / regs.length) * 100)
      : (evidence.length > 0 ? 50 : 0);

    // ── Overall: weighted 30/40/30
    const overall = Math.round(discovery * 0.3 + governance * 0.4 + compliance * 0.3);

    const label: 'HIGH' | 'MEDIUM' | 'LOW' =
      overall >= 75 ? 'HIGH' : overall >= 50 ? 'MEDIUM' : 'LOW';

    return { discovery, governance, compliance, overall, label };
  }

  lens(name: string, entityId?: string) {
    const lenses: Record<string, () => any> = {
      ceo: () => ({
        totalAgents: this.getEntitiesByKind('agent').length,
        criticalRisks: this.getEntitiesByKind('risk').filter((r: any) => r.severity === 'critical' || r.attrs?.severity === 'critical').length,
        totalEvidence: this.getEntitiesByKind('evidence').length,
      }),
      cfo: () => ({
        totalCost: this.getEntitiesByKind('cost_center').reduce((s: number, c: any) => s + (c.costUsd ?? c.attrs?.costUsd ?? 0), 0),
        models: this.getEntitiesByKind('model').length,
      }),
      ciso: () => ({
        highRiskAgents: this.getEntitiesByKind('agent').filter((a: any) => ['high', 'critical'].includes(a.riskLevel ?? a.attrs?.riskLevel)).length,
        incidents: this.getEntitiesByKind('incident').length,
        risks: this.getEntitiesByKind('risk').length,
      }),
      dpo: () => ({ dataAssets: this.getEntitiesByKind('data_asset').length, regulations: this.getEntitiesByKind('regulation').length }),
      compliance: () => ({
        nonCompliant: this.getEntitiesByKind('regulation').filter((r: any) => (r.status ?? r.attrs?.status) === 'non_compliant').length,
        totalRegs: this.getEntitiesByKind('regulation').length,
      }),
      auditor: () => entityId ? this.reconstructDecision(entityId) : null,
      board: () => ({
        criticalRisks: this.getEntitiesByKind('risk').filter((r: any) => (r.severity ?? r.attrs?.severity) === 'critical').length,
        criticalIncidents: this.getEntitiesByKind('incident').filter((i: any) => (i.severity ?? i.attrs?.severity) === 'critical').length,
      }),
      ecosystem: () => entityId ? this.traverse(entityId, ['USES_TOOL', 'USES_MODEL', 'PROCESSES_DATA', 'DEPENDS_ON', 'INTEGRATES_WITH'], ['OWNED_BY', 'REGULATES', 'GOVERNS']) : null,
      certification: () => ({ certificates: this.getEntitiesByKind('certificate').length, controls: this.getEntitiesByKind('control').length }),
    };
    return lenses[name]?.() ?? null;
  }

  // ── Persistence & Validation ────────────────────────────────────────────────

  serialize(): string {
    return JSON.stringify({
      entities: Array.from(this.g.entities.values()),
      relationships: this.g.relationships,
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.g.entities.clear();
      this.g.relationships = [];
      if (Array.isArray(parsed.entities)) {
        for (const e of parsed.entities) this.addEntity(e);
      }
      if (Array.isArray(parsed.relationships)) {
        for (const r of parsed.relationships) this.addRelationship(r);
      }
    } catch (err) {
      console.error('[GraphEngine] Failed to deserialize data:', err);
    }
  }

  stats(): { nodes: number; edges: number; byKind: Record<string, number>; relsByKind: Record<string, number> } {
    const byKind: Record<string, number> = {};
    for (const e of this.g.entities.values()) {
      byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    }
    const relsByKind: Record<string, number> = {};
    for (const r of this.g.relationships) {
      relsByKind[r.kind] = (relsByKind[r.kind] ?? 0) + 1;
    }
    return {
      nodes: this.g.entities.size,
      edges: this.g.relationships.length,
      byKind,
      relsByKind,
    };
  }

  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for orphaned relationships (source or target missing)
    for (const r of this.g.relationships) {
      if (!this.g.entities.has(r.sourceId)) {
        issues.push(`Relationship ${r.id} (${r.kind}) references missing sourceId: ${r.sourceId}`);
      }
      if (!this.g.entities.has(r.targetId)) {
        issues.push(`Relationship ${r.id} (${r.kind}) references missing targetId: ${r.targetId}`);
      }
    }

    // Check for malformed entities
    for (const [id, e] of this.g.entities.entries()) {
      if (!e.kind) issues.push(`Entity ${id} is missing 'kind' property.`);
      if (!e.label) issues.push(`Entity ${id} is missing 'label' property.`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
