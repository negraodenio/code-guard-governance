import { GraphEngine } from '@council/graphos';
import { GraphRepository } from './db/repository';
import { buildFullGraph } from '@council/graphos';
import { VIEW_BUILDERS, VIEW_META, type ViewName } from '@council/graphos';
import { DB_VIEW_BUILDERS, DB_VIEW_META, type DbViewName } from './db/views';
import type { ViewResult } from '@council/graphos';

export type BackendType = 'memory' | 'postgres';

export interface GraphBackend {
  type: BackendType;
  getEntitiesByKind(kind: string): Promise<any[]> | any[];
  getRelationships(): Promise<any[]> | any[];
  getEntity(id: string): Promise<any | undefined> | (any | undefined);
  buildView(view: string, param?: string): Promise<ViewResult> | ViewResult;
  getMeta(view: string): Record<string, unknown> | undefined;
}

class MemoryBackend implements GraphBackend {
  type: BackendType = 'memory';
  private engine: GraphEngine;

  constructor(engine: GraphEngine) {
    this.engine = engine;
  }

  getEntitiesByKind(kind: string) {
    return this.engine.getEntitiesByKind(kind);
  }

  getRelationships() {
    return this.engine.getRelationships();
  }

  getEntity(id: string) {
    return this.engine.getEntity(id);
  }

  buildView(view: string, param?: string): ViewResult {
    const builder = VIEW_BUILDERS[view as ViewName];
    if (!builder) throw new Error(`Unknown view: ${view}`);
    return builder(this.engine, param);
  }

  getMeta(view: string) {
    return VIEW_META[view as ViewName];
  }
}

class PostgresBackend implements GraphBackend {
  type: BackendType = 'postgres';
  private repo: GraphRepository;

  constructor(repo: GraphRepository) {
    this.repo = repo;
  }

  async getEntitiesByKind(kind: string) {
    return this.repo.getEntitiesByKind(kind);
  }

  async getRelationships() {
    return this.repo.getRelationships();
  }

  async getEntity(id: string) {
    return this.repo.getEntity(id);
  }

  async buildView(view: string, param?: string): Promise<ViewResult> {
    const builder = DB_VIEW_BUILDERS[view as DbViewName];
    if (!builder) throw new Error(`Unknown view: ${view}`);
    return builder(this.repo, param);
  }

  getMeta(view: string) {
    return DB_VIEW_META[view as DbViewName];
  }
}

let cachedBackend: GraphBackend | null = null;

export async function createGraphBackend(): Promise<GraphBackend> {
  if (cachedBackend) return cachedBackend;

  const usePostgres = !!process.env.GRAPHOS_DB_URL;

  if (usePostgres) {
    const repo = new GraphRepository();
    cachedBackend = new PostgresBackend(repo);
  } else {
    const engine = await buildFullGraph();
    cachedBackend = new MemoryBackend(engine);
  }

  return cachedBackend;
}

export function resetBackendCache(): void {
  cachedBackend = null;
}
