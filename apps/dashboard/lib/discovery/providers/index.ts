import type { RepositoryProvider, RepoFile } from "@/lib/discovery/types";
import { createAzureDevOpsProvider } from "./azure-devops";

export function createGitHubProvider(token?: string): RepositoryProvider {
  const apiToken = token ?? process.env.GITHUB_TOKEN ?? "";
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  return {
    name: "github",
    async fetchFiles(owner: string, repo: string, branch?: string, path: string = ""): Promise<RepoFile[]> {
      const url = path
        ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch ?? "main"}`
        : `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch ?? "main"}?recursive=1`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      const data = await res.json();

      if (data.tree) {
        return data.tree
          .filter((item: { type: string }) => item.type === "blob")
          .map((item: { path: string }) => ({
            path: item.path,
            name: item.path.split("/").pop() ?? item.path,
            type: "file" as const,
          }));
      }

      return (Array.isArray(data) ? data : [data])
        .filter((item: { type: string }) => item.type === "file")
        .map((item: { path: string; name: string }) => ({
          path: item.path,
          name: item.name,
          type: "file" as const,
        }));
    },

    async fetchFileContent(owner: string, repo: string, path: string, branch?: string): Promise<string> {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch ?? "main"}/${path}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
      return res.text();
    },
  };
}

export function createGitLabProvider(token?: string): RepositoryProvider {
  const apiToken = token ?? process.env.GITLAB_TOKEN ?? "";
  const headers: Record<string, string> = {};
  if (apiToken) headers["PRIVATE-TOKEN"] = apiToken;

  return {
    name: "gitlab",
    async fetchFiles(owner: string, repo: string, branch?: string, path: string = ""): Promise<RepoFile[]> {
      const projectId = encodeURIComponent(`${owner}/${repo}`);
      const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?ref=${branch ?? "main"}&recursive=true&per_page=100`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);

      const data = await res.json();
      return (data as Array<{ path: string; name: string; type: string }>)
        .filter((item) => item.type === "blob")
        .map((item) => ({
          path: item.path,
          name: item.name,
          type: "file" as const,
        }));
    },

    async fetchFileContent(owner: string, repo: string, path: string, branch?: string): Promise<string> {
      const projectId = encodeURIComponent(`${owner}/${repo}`);
      const filePath = encodeURIComponent(path);
      const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${filePath}/raw?ref=${branch ?? "main"}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
      return res.text();
    },
  };
}

export function createBitbucketProvider(token?: string): RepositoryProvider {
  const apiToken = token ?? process.env.BITBUCKET_TOKEN ?? "";
  const username = process.env.BITBUCKET_USERNAME ?? "";
  const auth = apiToken ? Buffer.from(`${username}:${apiToken}`).toString("base64") : "";
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Basic ${auth}`;

  return {
    name: "bitbucket",
    async fetchFiles(owner: string, repo: string, branch?: string, path: string = ""): Promise<RepoFile[]> {
      const url = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/src/${branch ?? "main"}/${path}?pagelen=100`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Bitbucket API error: ${res.status}`);

      const data = await res.json();
      return (data.values as Array<{ path: string; type: string }>)
        .filter((item) => item.type === "commit_file")
        .map((item) => ({
          path: item.path,
          name: item.path.split("/").pop() ?? item.path,
          type: "file" as const,
        }));
    },

    async fetchFileContent(owner: string, repo: string, path: string, branch?: string): Promise<string> {
      const url = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/src/${branch ?? "main"}/${path}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
      return res.text();
    },
  };
}

export function getProvider(provider: string, token?: string, baseUrl?: string): RepositoryProvider {
  switch (provider.toLowerCase()) {
    case "github": return createGitHubProvider(token);
    case "github-enterprise": return createGitHubProvider(token);
    case "gitlab": return createGitLabProvider(token);
    case "gitlab-self-hosted": return createGitLabProvider(token);
    case "bitbucket": return createBitbucketProvider(token);
    case "azure-devops": return createAzureDevOpsProvider(token, baseUrl);
    case "azure_devops": return createAzureDevOpsProvider(token, baseUrl);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}