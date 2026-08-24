import type { SourceConnector, ConnectorConfig, ConnectorRepoMeta, ConnectorFile } from './types';

export class AzureDevOpsConnector implements SourceConnector {
  readonly provider = 'azure-devops' as const;
  private readonly API = 'https://dev.azure.com';

  private headers(token?: string): Record<string, string> {
    // token = Personal Access Token (PAT) — encode as Basic :<PAT>
    return token ? { Authorization: `Basic ${Buffer.from(`:${token}`).toString('base64')}` } : {};
  }

  private async get(url: string, token?: string): Promise<any> {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}api-version=7.1`, { headers: this.headers(token) });
    if (!res.ok) throw new Error(`Azure DevOps ${res.status}: ${url}`);
    return res.json();
  }

  // Accepts formats:
  //   dev.azure.com/{org}/{project}/_git/{repo}
  //   {org}.visualstudio.com/{project}/_git/{repo}
  parseUrl(url: string): { owner: string; repo: string } {
    const m1 = url.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/?#]+)/);
    if (m1) return { owner: `${m1[1]}/${m1[2]}`, repo: m1[3] };
    const m2 = url.match(/([^.]+)\.visualstudio\.com\/([^/]+)\/_git\/([^/?#]+)/);
    if (m2) return { owner: `${m2[1]}/${m2[2]}`, repo: m2[3] };
    throw new Error(`Not an Azure DevOps URL: ${url}`);
  }

  private parts(cfg: ConnectorConfig) {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    const [org, project] = owner.split('/');
    return { org: cfg.organization ?? org, project, repo };
  }

  async fetchMeta(cfg: ConnectorConfig): Promise<ConnectorRepoMeta> {
    const { org, project, repo } = this.parts(cfg);
    const meta = await this.get(`${this.API}/${org}/${project}/_apis/git/repositories/${repo}`, cfg.token);
    return {
      name: meta.name, owner: org, fullName: `${org}/${project}/${repo}`,
      description: '', defaultBranch: (meta.defaultBranch ?? 'refs/heads/main').replace('refs/heads/', ''),
      language: '', stars: 0, forks: 0, createdAt: '', updatedAt: '',
      hasLicense: false, licenseName: null, fileCount: 0, topics: [],
      provider: 'azure-devops', repoUrl: cfg.repoUrl,
    };
  }

  async fetchTree(cfg: ConnectorConfig, branch: string): Promise<ConnectorFile[]> {
    const { org, project, repo } = this.parts(cfg);
    try {
      const data = await this.get(
        `${this.API}/${org}/${project}/_apis/git/repositories/${repo}/items?recursionLevel=Full&versionDescriptor.version=${branch}&versionDescriptor.versionType=branch`,
        cfg.token
      );
      return (data.value ?? [])
        .filter((f: any) => !f.isFolder)
        .map((f: any) => ({ path: f.path.replace(/^\//, ''), name: f.path.split('/').pop()!, type: 'file' as const, size: f.contentMetadata?.length }));
    } catch { return []; }
  }

  async fetchFile(cfg: ConnectorConfig, path: string, branch: string): Promise<string | null> {
    const { org, project, repo } = this.parts(cfg);
    try {
      const res = await fetch(
        `${this.API}/${org}/${project}/_apis/git/repositories/${repo}/items?path=${encodeURIComponent('/' + path)}&versionDescriptor.version=${branch}&versionDescriptor.versionType=branch&$format=text&api-version=7.1`,
        { headers: this.headers(cfg.token) }
      );
      if (!res.ok) return null;
      return res.text();
    } catch { return null; }
  }

  async fetchLanguages(_cfg: ConnectorConfig): Promise<Record<string, number>> {
    return {}; // Azure DevOps doesn't expose byte-per-lang
  }
}
