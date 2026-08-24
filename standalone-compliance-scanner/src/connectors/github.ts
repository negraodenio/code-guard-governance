import type { SourceConnector, ConnectorConfig, ConnectorRepoMeta, ConnectorFile } from './types';
import { cachedFetch } from '../core/github-cache';

export class GitHubConnector implements SourceConnector {
  readonly provider = 'github' as const;

  parseUrl(url: string): { owner: string; repo: string } {
    const m = url.replace(/\.git$/, '').match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
    if (!m) throw new Error(`Not a GitHub URL: ${url}`);
    return { owner: m[1], repo: m[2] };
  }

  async fetchMeta(cfg: ConnectorConfig): Promise<ConnectorRepoMeta> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    const meta = await cachedFetch(owner, repo, 'repo',
      `https://api.github.com/repos/${owner}/${repo}`, cfg.token);
    return {
      name: meta.name, owner: meta.owner?.login ?? owner,
      fullName: meta.full_name ?? `${owner}/${repo}`,
      description: meta.description ?? '', defaultBranch: meta.default_branch ?? 'main',
      language: meta.language ?? 'Unknown', stars: meta.stargazers_count ?? 0,
      forks: meta.forks_count ?? 0, createdAt: meta.created_at ?? '',
      updatedAt: meta.updated_at ?? '', hasLicense: !!meta.license,
      licenseName: meta.license?.spdx_id ?? null, fileCount: meta.size ?? 0,
      topics: meta.topics ?? [], provider: 'github', repoUrl: cfg.repoUrl,
    };
  }

  async fetchTree(cfg: ConnectorConfig, branch: string): Promise<ConnectorFile[]> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    let tree: any;
    try {
      tree = await cachedFetch(owner, repo, `tree:${branch}`,
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, cfg.token);
    } catch {
      tree = await cachedFetch(owner, repo, `tree:master`,
        `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`, cfg.token);
    }
    return (tree?.tree ?? [])
      .filter((f: any) => f.type === 'blob')
      .map((f: any) => ({ path: f.path, name: f.path.split('/').pop()!, type: 'file' as const, size: f.size }));
  }

  async fetchFile(cfg: ConnectorConfig, path: string, branch: string): Promise<string | null> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    try {
      const data = await cachedFetch(owner, repo, `content:${path}`,
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, cfg.token);
      if (data?.encoding === 'base64' && data.content)
        return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    } catch {}
    return null;
  }

  async fetchLanguages(cfg: ConnectorConfig): Promise<Record<string, number>> {
    const { owner, repo } = this.parseUrl(cfg.repoUrl);
    try {
      return await cachedFetch(owner, repo, 'languages',
        `https://api.github.com/repos/${owner}/${repo}/languages`, cfg.token);
    } catch { return {}; }
  }
}
