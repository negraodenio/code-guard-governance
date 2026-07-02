import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDocsConnector } from '@council/scanner';
import type { DocsConfig } from '@council/scanner';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/docs/ingest
// Ingests pages from Confluence / SharePoint / Notion into:
//   1. graphos_entities (kind=evidence) — for the governance graph
//   2. Supabase repo_chunks — for RAG queries via /api/rag/query
// Body: DocsConfig + optional { maxPages, repoId }
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_ID = process.env.GRAPHOS_TENANT_ID ?? '52f41339-a838-4d8f-b041-f9b7bf1ff305';
const CHUNK_SIZE = 1200; // chars per RAG chunk

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { maxPages = 200, repoId, ...cfg } = body as DocsConfig & { maxPages?: number; repoId?: string };

    if (!cfg?.provider) {
      return NextResponse.json({ ok: false, error: 'provider required (confluence | sharepoint | notion)' }, { status: 400 });
    }

    const connector = getDocsConnector(cfg.provider);
    const pages = await connector.fetchPages(cfg, { maxPages });

    const supabase = getSupabase();
    let evidenceCreated = 0, chunksCreated = 0;

    for (const page of pages) {
      // 1. Governance graph: evidence entity per page
      const entityId = `docs-${cfg.provider}-${page.id}`.slice(0, 100);
      const { error: entityErr } = await supabase.from('graphos_entities').upsert({
        id: entityId, kind: 'evidence',
        label: page.title.slice(0, 200),
        description: page.body.slice(0, 500),
        attributes: {
          provider: cfg.provider, docsId: page.id, url: page.url,
          space: page.space, author: page.author, updatedAt: page.updatedAt,
          labels: page.labels,
        },
        tenant_id: TENANT_ID,
      }, { onConflict: 'id' });
      if (!entityErr) evidenceCreated++;

      // 2. RAG chunks — insert into repo_chunks if repoId provided
      if (repoId && page.body.length > 100) {
        const chunks = chunkText(page.body);
        for (const [i, chunk] of chunks.entries()) {
          const { error: chunkErr } = await supabase.from('repo_chunks').upsert({
            id: `${entityId}-chunk-${i}`,
            repo_id: repoId,
            content: chunk,
            metadata: {
              source: cfg.provider, pageId: page.id, title: page.title,
              url: page.url, chunkIndex: i, totalChunks: chunks.length,
            },
          }, { onConflict: 'id' });
          if (!chunkErr) chunksCreated++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        provider: cfg.provider, pagesIngested: pages.length,
        evidenceCreated, chunksCreated,
        sample: pages.slice(0, 3).map(p => ({ id: p.id, title: p.title, url: p.url })),
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
