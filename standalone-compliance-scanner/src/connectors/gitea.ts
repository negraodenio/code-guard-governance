// Gitea and Forgejo share the same REST API (Forgejo is a Gitea fork).
import type { SourceConnector, ConnectorConfig, ConnectorRepoMeta, ConnectorFile, SourceProvider } from './types';

export class GiteaConnector implements SourceConnector {
  /** Pass 'forgejo' to surface the correct provider label */
  constructor(private readonly providerOverride?: SourceProvider) {}

  readonly provider: SourceProvider = this.providerOverride ?? 'gitea';

  private base(cfg: ConnectorConfig) {
    if (!cfg.baseUrl) throw new Error('Gitea/Forgejo requires baseUrl (e.g. https://codeberg.org)');
    return cfg.baseUrl.replace(/\/$/, '');
  }

  private headers(token?: string): Record<string, string> {
    return token ? { Authorization: `token ${token}` } : {};
  }

  private async get(url: string, token?: string): Promise<any> {
    const res = await fetch(url, { headers: this.headers(token) });
    if (!res.ok) throw new Error(`Gitea ${res.status}: ${url}`);
    return res.json();
  }

  parseUrl(url: string): { owner: string; repo: string } {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const parts = urlObj.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    if (parts.length < 2) throw new Error(`Cannot parse Gitea URL: ${url}`);
    return { owner: parts[0], repo: parts[1] };
  }

  async fetchMeta(cfg: ConnectorConfig): Promise<ConnectorRepoMeta> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    const meta = await this.get(`${this.base(cfg)}/api/v1/repos/${owner}/${repo}`, cfg.token);
    return {
      name: meta.name, owner: meta.owner?.login ?? owner,
      fullName: meta.full_name ?? `${owner}/${repo}`,
      description: meta.description ?? '', defaultBranch: meta.default_branch ?? 'main',
      language: meta.language ?? '', stars: meta.stars_count ?? 0,
      forks: meta.forks_count ?? 0, createdAt: meta.created ?? '',
      updatedAt: meta.updated ?? '', hasLicense: !!meta.license,
      licenseName: meta.license?.spdx_id ?? null, fileCount: 0,
      topics: meta.topics ?? [], provider: this.provider, repoUrl: cfg.repoUrl,
    };
  }

  async fetchTree(cfg: ConnectorConfig, branch: string): Promise<ConnectorFile[]> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    try {
      const data = await this.get(
        `${this.base(cfg)}/api/v1/repos/${owner}/${repo}/git/trees/${branch}?recursive=true&token=${cfg.token ?? ''}`,
        cfg.token
      );
      return (data?.tree ?? [])
        .filter((f: any) => f.type === 'blob')
        .map((f: any) => ({ path: f.path, name: f.path.split('/').pop()!, type: 'file' as const, size: f.size }));
    } catch {
      // Fallback: contents API (no recursive, paginated)
      return this.fetchTreeContents(cfg, branch, '');
    }
  }

  private async fetchTreeContents(cfg: ConnectorConfig, branch: string, dir: string): Promise<ConnectorFile[]> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    const files: ConnectorFile[] = [];
    try {
      const items: any[] = await this.get(
        `${this.base(cfg)}/api/v1/repos/${owner}/${repo}/contents/${dir}?ref=${branch}`,
        cfg.token
      );
      for (const item of items.slice(0, 200)) {
        if (item.type === 'file') files.push({ path: item.path, name: item.name, type: 'file', size: item.size });
        else if (item.type === 'dir') files.push(...await this.fetchTreeContents(cfg, branch, item.path));
      }
    } catch {}
    return files;
  }

  async fetchFile(cfg: ConnectorConfig, path: string, branch: string): Promise<string | null> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    try {
      const data = await this.get(
        `${this.base(cfg)}/api/v1/repos/${owner}/${repo}/raw/${path}?ref=${branch}`,
        cfg.token
      );
      return typeof data === 'string' ? data : null;
    } catch { return null; }
  }

  async fetchLanguages(_cfg: ConnectorConfig): Promise<Record<string, number>> {
    return {}; // Gitea doesn't expose a languages endpoint
  }
}

/** Forgejo is API-compatible with Gitea. */
export class ForgejoConnector extends GiteaConnector {
  constructor() { super('forgejo'); }
  readonly provider: SourceProvider = 'forgejo';
}
