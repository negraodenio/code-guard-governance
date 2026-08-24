// ─────────────────────────────────────────────────────────────────────────────
// Docs Connector SDK — Core Types
// Normalises content from Confluence, SharePoint, Notion.
// Output feeds the evidence store + RAG pipeline (Mistral embeddings).
// ─────────────────────────────────────────────────────────────────────────────

export type DocsProvider = 'confluence' | 'sharepoint' | 'notion';

/** A single document/page normalised from any docs provider. */
export interface DocsPage {
  id: string;
  title: string;
  url: string;
  /** Plain text content (stripped of HTML/markdown) */
  body: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
  author?: string;
  space?: string;       // Confluence space / SharePoint site / Notion workspace
  labels?: string[];
  provider: DocsProvider;
}

/** Credentials for each docs provider. */
export type DocsConfig =
  | { provider: 'confluence'; baseUrl: string; email: string; apiToken: string; spaceKey?: string }
  | { provider: 'sharepoint'; tenantId: string; clientId: string; clientSecret: string; siteId: string }
  | { provider: 'notion';     apiToken: string; databaseId?: string };

export interface DocsConnector {
  readonly provider: DocsProvider;
  /** Fetch all pages (paginated). Optionally filter by space/site/db. */
  fetchPages(cfg: DocsConfig, opts?: { maxPages?: number }): Promise<DocsPage[]>;
}

/** Strip basic HTML tags to plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}
