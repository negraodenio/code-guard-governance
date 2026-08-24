export interface GraphEntity {
  id: string;
  kind: string;
  label: string;
  description?: string;
  [key: string]: any;
}

export interface Relationship {
  id: string;
  type: string;
  from: string;
  to: string;
  label?: string;
  [key: string]: any;
}

export type AgentNode = GraphEntity;
export type ToolNode = GraphEntity;
export type ExternalSystemNode = GraphEntity;
export type DataAssetNode = GraphEntity;
export type ModelNode = GraphEntity;
export type RiskNode = GraphEntity;
export type RegulationNode = GraphEntity;
export type EvidenceNode = GraphEntity;
export type OwnerNode = GraphEntity;
export type PromptNode = GraphEntity;

export class GraphEngine {
  private entities = new Map<string, GraphEntity>();
  private relationships: Relationship[] = [];

  addEntity(entity: GraphEntity): void {
    this.entities.set(entity.id, entity);
  }

  addRelationship(rel: Relationship): void {
    this.relationships.push(rel);
  }

  getEntity(id: string): GraphEntity | undefined {
    return this.entities.get(id);
  }

  getEntities(): GraphEntity[] {
    return Array.from(this.entities.values());
  }

  getRelationships(): Relationship[] {
    return this.relationships;
  }

  toJSON() {
    return {
      entities: this.getEntities(),
      relationships: this.getRelationships(),
    };
  }
}
