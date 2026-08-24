import type { RepoMetadata } from './types';
import { cachedFetch } from './github-cache';

interface GitHubFile {
  path: string;
  type: 'blob' | 'tree';
  size: number;
}

interface GitHubTreeItem {
  path: string;
  type: string;
  size: number;
}

export async function fetchRepoMetadata(owner: string, repo: string, token?: string): Promise<RepoMetadata> {
  const meta = await cachedFetch(owner, repo, 'repo', `https://api.github.com/repos/${owner}/${repo}`, token);
  let treeData: any;
  try {
    treeData = await cachedFetch(owner, repo, 'tree', `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, token);
  } catch {
    treeData = await cachedFetch(owner, repo, 'tree', `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`, token);
  }
  const tree: GitHubTreeItem[] = treeData?.tree ?? [];

  return {
    name: meta.name,
    owner: meta.owner?.login ?? owner,
    fullName: meta.full_name ?? `${owner}/${repo}`,
    description: meta.description ?? '',
    homepage: meta.homepage,
    stars: meta.stargazers_count ?? 0,
    forks: meta.forks_count ?? 0,
    language: meta.language ?? 'Unknown',
    defaultBranch: meta.default_branch ?? 'main',
    createdAt: meta.created_at ?? '',
    updatedAt: meta.updated_at ?? '',
    pushedAt: meta.pushed_at ?? '',
    hasLicense: !!meta.license,
    licenseName: meta.license?.spdx_id ?? null,
    fileCount: tree.length,
    totalSize: meta.size ?? 0,
    topics: meta.topics ?? [],
  };
}

export async function fetchFileContent(owner: string, repo: string, filePath: string, token?: string): Promise<string | null> {
  try {
    const data = await cachedFetch(owner, repo, `content:${filePath}`, `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, token);
    if (data.encoding === 'base64' && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchFileTree(owner: string, repo: string, branch = 'main', token?: string): Promise<GitHubFile[]> {
  try {
    const data = await cachedFetch(owner, repo, `tree:${branch}`, `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token);
    return (data.tree ?? []).filter((i: GitHubTreeItem) => i.type === 'blob');
  } catch {
    return [];
  }
}

export async function fetchLanguages(owner: string, repo: string, token?: string): Promise<Record<string, number>> {
  try {
    return await cachedFetch(owner, repo, 'languages', `https://api.github.com/repos/${owner}/${repo}/languages`, token);
  } catch {
    return {};
  }
}

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const clean = url.replace(/\.git$/, '').replace(/\/$/, '');
  const parts = clean.split('/');
  const repo = parts.pop()!;
  const owner = parts.pop()!;
  return { owner, repo };
}
