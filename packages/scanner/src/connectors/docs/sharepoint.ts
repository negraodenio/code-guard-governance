import type { DocsConnector, DocsConfig, DocsPage } from './types';
import { htmlToText } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SharePoint Online — Microsoft Graph API (Sites + Pages)
// Docs: https://learn.microsoft.com/graph/api/resources/sitepage
// Auth: Client Credentials → Bearer token (same as Entra ID)
// ─────────────────────────────────────────────────────────────────────────────

type SpCfg = Extract<DocsConfig, { provider: 'sharepoint' }>;

async function getToken(cfg: SpCfg): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  );
  if (!res.ok) throw new Error(`SharePoint token error: ${res.status}`);
  return (await res.json()).access_token as string;
}

export class SharePointConnector implements DocsConnector {
  readonly provider = 'sharepoint' as const;

  private async get(token: string, path: string): Promise<any> {
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`SharePoint ${res.status}: ${path}`);
    return res.json();
  }

  private async paginate(token: string, path: string): Promise<any[]> {
    const all: any[] = [];
    let url: string | null = path;
    while (url && all.length < 2000) {
      const page = await this.get(token, url.replace('https://graph.microsoft.com/v1.0', ''));
      all.push(...(page.value ?? []));
      url = page['@odata.nextLink'] ?? null;
    }
    return all;
  }

  async fetchPages(cfg: DocsConfig, opts: { maxPages?: number } = {}): Promise<DocsPage[]> {
    const c = cfg as SpCfg;
    const token = await getToken(c);
    const max = opts.maxPages ?? 500;

    // List site pages (modern SharePoint pages)
    const rawPages = (await this.paginate(token, `/sites/${c.siteId}/pages`)).slice(0, max);
    const pages: DocsPage[] = [];

    for (const p of rawPages) {
      let body = '';
      try {
        // Fetch page content (canvasLayout)
        const detail = await this.get(token, `/sites/${c.siteId}/pages/${p.id}/microsoft.graph.sitePage?$expand=canvasLayout`);
        const textParts: string[] = [];
        for (const zone of detail.canvasLayout?.horizontalSections ?? []) {
          for (const col of zone.columns ?? []) {
            for (const wp of col.webparts ?? []) {
              if (wp.innerHtml) textParts.push(htmlToText(wp.innerHtml));
            }
          }
        }
        body = textParts.join('\n\n').slice(0, 8000);
      } catch {}

      pages.push({
        id: p.id, title: p.title ?? '',
        url: p.webUrl ?? '',
        body, updatedAt: p.lastModifiedDateTime ?? '',
        author: p.lastModifiedBy?.user?.displayName ?? undefined,
        space: c.siteId, labels: [],
        provider: 'sharepoint',
      });
    }
    return pages;
  }
}
