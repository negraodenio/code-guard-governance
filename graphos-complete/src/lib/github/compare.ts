import { gh } from './client';

export async function compareCommits(owner: string, repo: string, base: string, head: string) {
    // GitHub Compare API retorna files changed
    const data = await gh(`/repos/${owner}/${repo}/compare/${base}...${head}`);

    return {
        ahead_by: data.ahead_by as number,
        files: (data.files || []).map((f: any) => ({
            filename: f.filename,
            status: f.status as 'added' | 'modified' | 'removed',
            additions: f.additions,
            deletions: f.deletions,
            sha: f.sha,
            blob_url: f.blob_url
        }))
    };
}
