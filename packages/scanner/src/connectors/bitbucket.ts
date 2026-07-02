import type { SourceConnector, ConnectorConfig, ConnectorRepoMeta, ConnectorFile } from './types';

export class BitbucketConnector implements SourceConnector {
  readonly provider = 'bitbucket' as const;
  private readonly API = 'https://api.bitbucket.org/2.0';

  private headers(token?: string): Record<string, string> {
    // token = "username:app_password" (base64) OR Bearer token
    return token ? { Authorization: token.includes(':') ? `Basic ${Buffer.from(token).toString('base64')}` : `Bearer ${token}` } : {};
  }

  private async get(url: string, token?: string): Promise<any> {
    const res = await fetch(url, { headers: this.headers(token) });
    if (!res.ok) throw new Error(`Bitbucket ${res.status}: ${url}`);
    return res.json();
  }

  parseUrl(url: string): { owner: string; repo: string } {
    const m = url.replace(/\.git$/, '').match(/bitbucket\.org[/:]([\w.-]+)\/([\w.-]+)/);
    if (!m) throw new Error(`Not a Bitbucket URL: ${url}`);
    return { owner: m[1], repo: m[2] };
  }

  async fetchMeta(cfg: ConnectorConfig): Promise<ConnectorRepoMeta> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    const meta = await this.get(`${this.API}/repositories/${owner}/${repo}`, cfg.token);
    return {
      name: meta.name, owner: meta.owner?.nickname ?? owner,
      fullName: meta.full_name, description: meta.description ?? '',
      defaultBranch: meta.mainbranch?.name ?? 'main', language: meta.language ?? '',
      stars: 0, forks: meta.forks_count ?? 0,
      createdAt: meta.created_on ?? '', updatedAt: meta.updated_on ?? '',
      hasLicense: false, licenseName: null, fileCount: 0,
      topics: [], provider: 'bitbucket', repoUrl: cfg.repoUrl,
    };
  }

  async fetchTree(cfg: ConnectorConfig, branch: string): Promise<ConnectorFile[]> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    const files: ConnectorFile[] = [];
    let url: string | null = `${this.API}/repositories/${owner}/${repo}/src/${branch}/?pagelen=100&fields=values.path,values.type,values.size,next`;
    while (url && files.length < 5000) {
      const page: any = await this.get(url, cfg.token).catch(() => null);
      if (!page) break;
      for (const f of (page.values ?? [])) {
        if (f.type === 'commit_file') files.push({ path: f.path, name: f.path.split('/').pop()!, type: 'file', size: f.size });
      }
      url = page.next ?? null;
    }
    return files;
  }

  async fetchFile(cfg: ConnectorConfig, path: string, branch: string): Promise<string | null> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    try {
      const res = await fetch(`${this.API}/repositories/${owner}/${repo}/src/${branch}/${path}`, { headers: this.headers(cfg.token) });
      if (!res.ok) return null;
      return res.text();
    } catch { return null; }
  }

  async fetchLanguages(_cfg: ConnectorConfig): Promise<Record<string, number>> {
    return {}; // Bitbucket API doesn't expose bytes-per-language
  }
}
