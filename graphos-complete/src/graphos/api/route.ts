import { NextRequest, NextResponse } from 'next/server';
import { createGraphBackend } from '../factory';
import { getScannerResult } from '../scanner-cache';
import { VIEW_BUILDERS, VIEW_META, type ViewName } from '@council/graphos';

const VALID_VIEWS = ['ceo', 'cfo', 'ciso', 'dpo', 'compliance', 'auditor', 'board', 'constitutional', 'ecosystem', 'certification', 'ai_act', 'agent_governance'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const view = (body.view ?? 'ceo') as string;
    const param = body.param as string | undefined;
    const repoUrl = body.repoUrl as string | undefined;

    if (!VALID_VIEWS.includes(view)) {
      return NextResponse.json({ ok: false, error: `Invalid view. Must be one of: ${VALID_VIEWS.join(', ')}` }, { status: 400 });
    }

    let result: any;
    let meta: any;

    if (repoUrl) {
      const cached = getScannerResult(repoUrl);
      if (!cached) {
        return NextResponse.json({ ok: false, error: `No cached scan found for ${repoUrl}. Run scan first.` }, { status: 404 });
      }
      const builder = VIEW_BUILDERS[view as ViewName];
      if (!builder) {
        return NextResponse.json({ ok: false, error: `Invalid view: ${view}` }, { status: 400 });
      }

      const viewParam = view === 'data_lineage'
        ? cached.result.enrichment?.lineage?.flows
        : param;

      result = builder(cached.engine, viewParam as any);
      const allRels = cached.engine.getRelationships();
      const entityIds = new Set([...allRels.map((r: any) => r.sourceId), ...allRels.map((r: any) => r.targetId)]);
      const entityCount = Array.from(entityIds).filter((id: string) => cached.engine.getEntity(id)).length;
      meta = {
        view,
        repoUrl,
        label: VIEW_META[view as ViewName]?.label ?? view,
        icon: VIEW_META[view as ViewName]?.icon ?? '',
        question: VIEW_META[view as ViewName]?.question ?? '',
        backend: 'scanner',
        totalEntities: entityCount,
        relationshipsCount: allRels.length,
      };
    } else {
      const backend = await createGraphBackend();
      result = await backend.buildView(view, param);
      const agents = await backend.getEntitiesByKind('agent');
      const decisions = await backend.getEntitiesByKind('decision');
      const risks = await backend.getEntitiesByKind('risk');
      const controls = await backend.getEntitiesByKind('control');
      const regulations = await backend.getEntitiesByKind('regulation');
      const rels = await backend.getRelationships();
      meta = {
        view,
        label: backend.getMeta(view)?.label ?? view,
        icon: backend.getMeta(view)?.icon ?? '',
        question: backend.getMeta(view)?.question ?? '',
        backend: backend.type,
        totalEntities: agents.length + decisions.length + risks.length + controls.length + regulations.length,
        relationshipsCount: Array.isArray(rels) ? rels.length : 0,
      };
    }

    return NextResponse.json({ ok: true, data: result, meta });
  } catch (err) {
    console.error('[GraphOS API] Error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const view = (url.searchParams.get('view') ?? 'ceo') as string;
    const param = url.searchParams.get('param') ?? undefined;
    const repoUrl = url.searchParams.get('repoUrl') ?? undefined;

    if (!VALID_VIEWS.includes(view)) {
      return NextResponse.json({ ok: false, error: `Invalid view. Must be one of: ${VALID_VIEWS.join(', ')}` }, { status: 400 });
    }

    let result: any;
    let meta: any;

    if (repoUrl) {
      const cached = getScannerResult(repoUrl);
      if (!cached) {
        return NextResponse.json({ ok: false, error: `No cached scan found for ${repoUrl}. Run scan first.` }, { status: 404 });
      }
      const builder = VIEW_BUILDERS[view as ViewName];
      if (!builder) {
        return NextResponse.json({ ok: false, error: `Invalid view: ${view}` }, { status: 400 });
      }

      const viewParam = view === 'data_lineage'
        ? cached.result.enrichment?.lineage?.flows
        : param;

      result = builder(cached.engine, viewParam as any);
      const allRels = cached.engine.getRelationships();
      const entityIds = new Set([...allRels.map((r: any) => r.sourceId), ...allRels.map((r: any) => r.targetId)]);
      const entityCount = Array.from(entityIds).filter((id: string) => cached.engine.getEntity(id)).length;
      meta = {
        view, repoUrl,
        label: VIEW_META[view as ViewName]?.label ?? view,
        icon: VIEW_META[view as ViewName]?.icon ?? '',
        question: VIEW_META[view as ViewName]?.question ?? '',
        backend: 'scanner', totalEntities: entityCount, relationshipsCount: allRels.length,
      };
    } else {
      const backend = await createGraphBackend();
      result = await backend.buildView(view, param);
      meta = {
        view,
        label: backend.getMeta(view)?.label ?? view,
        icon: backend.getMeta(view)?.icon ?? '',
        question: backend.getMeta(view)?.question ?? '',
        backend: backend.type,
      };
    }

    return NextResponse.json({ ok: true, data: result, meta });
  } catch (err) {
    console.error('[GraphOS API] Error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
