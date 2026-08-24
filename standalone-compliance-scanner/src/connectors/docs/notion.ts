import type { DocsConnector, DocsConfig, DocsPage } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Notion — API v1 (Databases + Pages)
// Docs: https://developers.notion.com/reference/intro
// Auth: Integration Token (Bearer)
// ─────────────────────────────────────────────────────────────────────────────

type NotionCfg = Extract<DocsConfig, { provider: 'notion' }>;

export class NotionConnector implements DocsConnector {
  readonly provider = 'notion' as const;

  private headers(cfg: NotionCfg): Record<string, string> {
    return {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };
  }

  private async get(cfg: NotionCfg, path: string): Promise<any> {
    const res = await fetch(`https://api.notion.com/v1${path}`, { headers: this.headers(cfg) });
    if (!res.ok) throw new Error(`Notion ${res.status}: ${path}`);
    return res.json();
  }

  private async post(cfg: NotionCfg, path: string, body: unknown): Promise<any> {
    const res = await fetch(`https://api.notion.com/v1${path}`, {
      method: 'POST', headers: this.headers(cfg), body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Notion POST ${res.status}: ${path}`);
    return res.json();
  }

  /** Extract plain text from Notion rich_text array */
  private richText(arr: any[]): string {
    return (arr ?? []).map((t: any) => t.plain_text ?? '').join('');
  }

  /** Extract readable text from a page's block content (recursive, max depth 3) */
  private async extractPageText(cfg: NotionCfg, pageId: string, depth = 0): Promise<string> {
    if (depth > 2) return '';
    const data = await this.get(cfg, `/blocks/${pageId}/children?page_size=100`);
    const parts: string[] = [];
    for (const block of (data.results ?? [])) {
      const type: string = block.type;
      const content = block[type];
      if (!content) continue;
      if (content.rich_text) parts.push(this.richText(content.rich_text));
      if (block.has_children && depth < 2) {
        parts.push(await this.extractPageText(cfg, block.id, depth + 1));
      }
    }
    return parts.join('\n').slice(0, 8000);
  }

  async fetchPages(cfg: DocsConfig, opts: { maxPages?: number } = {}): Promise<DocsPage[]> {
    const c = cfg as NotionCfg;
    const max = opts.maxPages ?? 300;
    const pages: DocsPage[] = [];

    if (c.databaseId) {
      // Fetch rows from a specific database
      let cursor: string | undefined;
      while (pages.length < max) {
        const body: any = { page_size: 100 };
        if (cursor) body.start_cursor = cursor;
        const data = await this.post(c, `/databases/${c.databaseId}/query`, body);
        for (const row of (data.results ?? [])) {
          const props = row.properties ?? {};
          const titleProp = Object.values(props).find((p: any) => p.type === 'title') as any;
          const title = this.richText(titleProp?.title ?? []);
          const body = await this.extractPageText(c, row.id);
          pages.push({
            id: row.id, title, url: row.url ?? '',
            body, updatedAt: row.last_edited_time ?? '',
            author: row.last_edited_by?.name ?? undefined,
            space: c.databaseId, labels: [],
            provider: 'notion',
          });
        }
        if (!data.has_more) break;
        cursor = data.next_cursor;
      }
    } else {
      // Search all pages accessible to the integration
      let cursor: string | undefined;
      while (pages.length < max) {
        const body: any = { filter: { value: 'page', property: 'object' }, page_size: 100 };
        if (cursor) body.start_cursor = cursor;
        const data = await this.post(c, '/search', body);
        for (const page of (data.results ?? [])) {
          const props = page.properties ?? {};
          const titleProp = Object.values(props).find((p: any) => p.type === 'title') as any;
          const title = this.richText(titleProp?.title ?? []) || page.id;
          const body = await this.extractPageText(c, page.id);
          pages.push({
            id: page.id, title, url: page.url ?? '',
            body, updatedAt: page.last_edited_time ?? '',
            author: page.last_edited_by?.name ?? undefined,
            space: page.parent?.database_id ?? page.parent?.page_id ?? undefined,
            labels: [], provider: 'notion',
          });
        }
        if (!data.has_more) break;
        cursor = data.next_cursor;
      }
    }
    return pages;
  }
}
