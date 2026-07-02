export async function gh(path: string, options: RequestInit = {}) {
    const r = await fetch(`https://api.github.com${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            'User-Agent': 'CouncilIA',
            'Accept': 'application/vnd.github.v3+json',
            ...(options.headers || {})
        }
    });

    if (!r.ok) {
        const body = await r.text();
        console.error(`GITHUB_DEBUG: error on ${path}`);
        console.error(`GITHUB_DEBUG: status ${r.status}`);
        console.error(`GITHUB_DEBUG: body ${body}`);
        throw new Error(`GitHub API error ${r.status}: ${body}`);
    }

    // Return json if content-type is json, otherwise return text or blob as needed
    const contentType = r.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return r.json();
    }
    return r.text();
}

export function parseGitHubRepo(url: string) {
    const cleaned = url.replace('https://github.com/', '').replace(/^\/+/, '').replace(/\/+$/, '');
    const [owner, repo] = cleaned.split('/');
    if (!owner || !repo) throw new Error('Invalid repo_url. Use https://github.com/owner/repo');
    return { owner, repo };
}

export async function getBlobText(owner: string, repo: string, sha: string) {
    const blob = await gh(`/repos/${owner}/${repo}/git/blobs/${sha}`);
    if (blob.encoding !== 'base64') return '';
    return Buffer.from(blob.content, 'base64').toString('utf8');
}
