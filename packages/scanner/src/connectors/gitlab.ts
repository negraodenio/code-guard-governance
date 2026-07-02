import type { SourceConnector, ConnectorConfig, ConnectorRepoMeta, ConnectorFile } from './types';

export class GitLabConnector implements SourceConnector {
  readonly provider = 'gitlab' as const;

  private base(cfg: ConnectorConfig) {
    return (cfg.baseUrl ?? 'https://gitlab.com').replace(/\/$/, '');
  }

  private headers(token?: string): Record<string, string> {
    return token ? { 'PRIVATE-TOKEN': token } : {};
  }

  private async get(url: string, token?: string): Promise<any> {
    const res = await fetch(url, { headers: this.headers(token) });
    if (!res.ok) throw new Error(`GitLab ${res.status}: ${url}`);
    return res.json();
  }

  parseUrl(url: string): { owner: string; repo: string } {
    const m = url.replace(/\.git$/, '').match(/gitlab\.com[/:]([\w./-]+)\/([\w.-]+)$/);
    if (!m) throw new Error(`Not a GitLab URL: ${url}`);
    return { owner: m[1], repo: m[2] };
  }

  private encodeProjectId(cfg: ConnectorConfig) {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    return encodeURIComponent(`${owner}/${repo}`);
  }

  async fetchMeta(cfg: ConnectorConfig): Promise<ConnectorRepoMeta> {
    const pid = this.encodeProjectId(cfg);
    const meta = await this.get(`${this.base(cfg)}/api/v4/projects/${pid}`, cfg.token);
    return {
      name: meta.name, owner: meta.namespace?.full_path ?? meta.namespace?.name ?? '',
      fullName: meta.path_with_namespace, description: meta.description ?? '',
      defaultBranch: meta.default_branch ?? 'main', language: '',
      stars: meta.star_count ?? 0, forks: meta.forks_count ?? 0,
      createdAt: meta.created_at ?? '', updatedAt: meta.last_activity_at ?? '',
      hasLicense: !!meta.license, licenseName: meta.license?.key ?? null,
      fileCount: 0, topics: meta.tag_list ?? meta.topics ?? [],
      provider: 'gitlab', repoUrl: cfg.repoUrl,
    };
  }

  async fetchTree(cfg: ConnectorConfig, branch: string): Promise<ConnectorFile[]> {
    const pid = this.encodeProjectId(cfg);
    const base = this.base(cfg);
    const files: ConnectorFile[] = [];
    let page = 1;
    while (files.length < 5000) {
      const items: any[] = await this.get(
        `${base}/api/v4/projects/${pid}/repository/tree?recursive=true&per_page=100&page=${page}&ref=${branch}`,
        cfg.token
      ).catch(() => []);
      if (!items.length) break;
      for (const f of items) {
        if (f.type === 'blob') files.push({ path: f.path, name: f.name, type: 'file', size: undefined });
      }
      if (items.length < 100) break;
      page++;
    }
    return files;
  }

  async fetchFile(cfg: ConnectorConfig, path: string, branch: string): Promise<string | null> {
    const pid = this.encodeProjectId(cfg);
    try {
      const data = await this.get(
        `${this.base(cfg)}/api/v4/projects/${pid}/repository/files/${encodeURIComponent(path)}/raw?ref=${branch}`,
        cfg.token
      );
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch { return null; }
  }

  async fetchLanguages(cfg: ConnectorConfig): Promise<Record<string, number>> {
    const pid = this.encodeProjectId(cfg);
    try {
      return await this.get(`${this.base(cfg)}/api/v4/projects/${pid}/languages`, cfg.token);
    } catch { return {}; }
  }
}
