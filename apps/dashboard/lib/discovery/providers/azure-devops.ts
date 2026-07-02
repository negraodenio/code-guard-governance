import type { RepositoryProvider, RepoFile } from "@/lib/discovery/types";

export function createAzureDevOpsProvider(token?: string, baseUrl?: string): RepositoryProvider {
  const apiToken = token ?? process.env.AZURE_DEVOPS_TOKEN ?? "";
  const orgUrl = baseUrl ?? process.env.AZURE_DEVOPS_ORG_URL ?? "";
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (apiToken) headers.Authorization = `Basic ${Buffer.from(`:${apiToken}`).toString("base64")}`;

  return {
    name: "azure_devops",
    async fetchFiles(owner: string, repo: string, branch?: string, path: string = ""): Promise<RepoFile[]> {
      const orgName = owner;
      const projectName = repo;

      const baseApiUrl = orgUrl
        ? `${orgUrl}/${projectName}/_apis/git/repositories`
        : `https://dev.azure.com/${orgName}/${projectName}/_apis/git/repositories`;

      const reposRes = await fetch(`${baseApiUrl}?api-version=7.1`, { headers });
      if (!reposRes.ok) throw new Error(`Azure DevOps API error: ${reposRes.status}`);
      const reposData = await reposRes.json();
      const repositoryId = reposData.value?.[0]?.id;
      if (!repositoryId) throw new Error("Repository not found");

      const version = branch ?? "main";
      const itemsUrl = orgUrl
        ? `${orgUrl}/${projectName}/_apis/git/repositories/${repositoryId}/items`
        : `https://dev.azure.com/${orgName}/${projectName}/_apis/git/repositories/${repositoryId}/items`;

      const params = new URLSearchParams({
        "api-version": "7.1",
        recursionLevel: "full",
        versionDescriptorVersion: version,
        versionDescriptorVersionType: "branch",
      });

      if (path) params.set("scopePath", path);

      const res = await fetch(`${itemsUrl}?${params}`, { headers });
      if (!res.ok) throw new Error(`Azure DevOps items API error: ${res.status}`);

      const data = await res.json();
      return (data.value as Array<{ path: string; gitObjectType: string }>)
        .filter((item) => item.gitObjectType === "blob")
        .map((item) => ({
          path: item.path,
          name: item.path.split("/").pop() ?? item.path,
          type: "file" as const,
        }));
    },

    async fetchFileContent(owner: string, repo: string, path: string, branch?: string): Promise<string> {
      const orgName = owner;
      const projectName = repo;

      const baseApiUrl = orgUrl
        ? `${orgUrl}/${projectName}/_apis/git/repositories`
        : `https://dev.azure.com/${orgName}/${projectName}/_apis/git/repositories`;

      const reposRes = await fetch(`${baseApiUrl}?api-version=7.1`, { headers });
      if (!reposRes.ok) throw new Error(`Azure DevOps API error: ${reposRes.status}`);
      const reposData = await reposRes.json();
      const repositoryId = reposData.value?.[0]?.id;
      if (!repositoryId) throw new Error("Repository not found");

      const version = branch ?? "main";
      const itemUrl = orgUrl
        ? `${orgUrl}/${projectName}/_apis/git/repositories/${repositoryId}/items`
        : `https://dev.azure.com/${orgName}/${projectName}/_apis/git/repositories/${repositoryId}/items`;

      const params = new URLSearchParams({
        "api-version": "7.1",
        path,
        versionDescriptorVersion: version,
        versionDescriptorVersionType: "branch",
        includeContent: "true",
      });

      const res = await fetch(`${itemUrl}?${params}`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
      const data = await res.json();
      return data.content ?? "";
    },
  };
}