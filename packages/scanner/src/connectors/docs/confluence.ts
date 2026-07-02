import type { DocsConnector, DocsConfig, DocsPage } from './types';
import { htmlToText } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Confluence Cloud — REST API v2
// Docs: https://developer.atlassian.com/cloud/confluence/rest/v2/
// Auth: Basic (email:apiToken), no OAuth needed for read-only
// ─────────────────────────────────────────────────────────────────────────────

type ConfCfg = Extract<DocsConfig, { provider: 'confluence' }>;

export class ConfluenceConnector implements DocsConnector {
  readonly provider = 'confluence' as const;

  private headers(cfg: ConfCfg): Record<string, string> {
    const creds = Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString('base64');
    return { Authorization: `Basic ${creds}`, 'Content-Type': 'application/json' };
  }

  private async get(cfg: ConfCfg, path: string): Promise<any> {
    const base = cfg.baseUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/wiki/rest/api${path}`, { headers: this.headers(cfg) });
    if (!res.ok) throw new Error(`Confluence ${res.status}: ${path}`);
    return res.json();
  }

  async fetchPages(cfg: DocsConfig, opts: { maxPages?: number } = {}): Promise<DocsPage[]> {
    const c = cfg as ConfCfg;
    const max = opts.maxPages ?? 500;
    const pages: DocsPage[] = [];
    let start = 0;
    const limit = 50;

    const spaceFilter = c.spaceKey ? `&spaceKey=${c.spaceKey}` : '';

    while (pages.length < max) {
      const data = await this.get(c, `/content?type=page&status=current&expand=body.view,version,space,ancestors&start=${start}&limit=${limit}${spaceFilter}`);
      const results: any[] = data.results ?? [];
      for (const p of results) {
        pages.push({
          id: p.id,
          title: p.title,
          url: `${c.baseUrl.replace(/\/$/, '')}/wiki${p._links?.webui ?? ''}`,
          body: htmlToText(p.body?.view?.value ?? '').slice(0, 8000),
          updatedAt: p.version?.when ?? '',
          author: p.version?.by?.displayName ?? undefined,
          space: p.space?.key ?? undefined,
          labels: p.metadata?.labels?.results?.map((l: any) => l.name) ?? [],
          provider: 'confluence',
        });
      }
      if (results.length < limit) break;
      start += limit;
    }
    return pages;
  }
}
