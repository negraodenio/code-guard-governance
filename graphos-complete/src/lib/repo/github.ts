import { Octokit } from '@octokit/rest';

// You can use a fine-grained token for private repos, or no token for public ones.
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
});

export interface RepoFile {
    path: string;
    content: string;
    size: number;
}

export async function fetchGithubRepoTree(owner: string, repo: string, branch = 'main'): Promise<RepoFile[]> {
    console.log(`[Repo Intel] Fetching remote tree for ${owner}/${repo} on branch: ${branch}`);

    try {
        // Get the tree SHA for the branch
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
        });

        const commitSha = refData.object.sha;

        // Fetch the recursive tree
        const { data: treeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: commitSha,
            recursive: "true",
        });

        const files: RepoFile[] = [];

        // Filter out directories and unwanted files (images, binaries)
        const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.md', '.json', '.html', '.css'];

        for (const item of treeData.tree) {
            if (item.type === 'blob' && item.path) {
                const ext = item.path.substring(item.path.lastIndexOf('.'));

                // Allow specific texts or those without extension if it's a known config like Dockerfile
                if (validExtensions.includes(ext) || item.path.endsWith('Dockerfile') || item.path.endsWith('Makefile')) {

                    // We shouldn't fetch node_modules or dist folders
                    if (item.path.includes('node_modules/') || item.path.includes('dist/') || item.path.includes('.git/')) {
                        continue;
                    }

                    // We need to fetch the blob content
                    if (item.sha) {
                        const { data: blobData } = await octokit.rest.git.getBlob({
                            owner,
                            repo,
                            file_sha: item.sha
                        });

                        // Github returns base64
                        const content = Buffer.from(blobData.content, 'base64').toString('utf-8');

                        files.push({
                            path: item.path,
                            content,
                            size: blobData.size || 0
                        });
                    }
                }
            }
        }

        console.log(`[Repo Intel] Successfully fetched ${files.length} valid source files.`);
        return files;

    } catch (error) {
        console.error('[Repo Intel] Error fetching repo tree:', error);
        throw error;
    }
}
