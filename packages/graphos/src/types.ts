export type EntityKind =
  | 'agent' | 'decision' | 'tool' | 'external_system'
  | 'data_asset' | 'control' | 'regulation' | 'certificate'
  | 'risk' | 'incident' | 'evidence' | 'model' | 'owner'
  | 'cost_center' | 'prompt' | 'memory' | 'classification';

export interface GraphEntity {
  id: string; kind: string; label: string; description?: string;
  attrs?: Record<string, unknown>;
}

export type RelKind = string;

export interface Relationship {
  id: string; sourceId: string; targetId: string; kind: RelKind;
  weight?: number; metadata?: Record<string, unknown>;
  tenantId?: string;
}

export interface FullGraph {
  entities: Map<string, GraphEntity>;
  relationships: Relationship[];
}
