export interface GitHubRepoDetails {
  owner: string;
  repo: string;
  defaultBranch: string;
  description?: string;
  stars?: number;
  files: Map<string, string>;
  totalFiles: number;
}

export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/\.git$/, '');
  const match = cleaned.match(/(?:github\.com\/|^)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

const INTERESTING_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.ipynb', '.json', '.yaml', '.yml', '.env.example', '.md'
];

const EXCLUDED_DIRS = [
  'node_modules', 'dist', 'build', '.git', 'coverage', '__pycache__', '.next', '.nuxt', 'venv', '.venv'
];

export async function fetchGitHubRepo(
  repoUrl: string,
  onProgress?: (msg: string, percent: number) => void,
  token?: string
): Promise<GitHubRepoDetails> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('URL do GitHub inválida. Exemplo válido: https://github.com/owner/repo');
  }

  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers['Authorization'] = `token ${token.trim()}`;
  }

  onProgress?.(`Consultando metadados de ${owner}/${repo}...`, 10);
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    if (repoRes.status === 403 || repoRes.status === 429) {
      throw new Error('Limite de requisições da API pública do GitHub atingido. Adicione um GitHub Token nas configurações para continuar.');
    }
    if (repoRes.status === 404) {
      throw new Error(`Repositório "${owner}/${repo}" não encontrado ou é privado.`);
    }
    throw new Error(`Erro ao acessar GitHub (${repoRes.status}): ${await repoRes.text()}`);
  }

  const repoMeta = await repoRes.json();
  const defaultBranch = repoMeta.default_branch || 'main';

  onProgress?.(`Obtendo árvore de arquivos (${defaultBranch})...`, 25);
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
  if (!treeRes.ok) {
    throw new Error(`Erro ao carregar árvore de arquivos (${treeRes.status})`);
  }

  const treeData = await treeRes.json();
  const allTree: Array<{ path: string; type: string; size?: number; url: string }> = treeData.tree || [];

  // Filter relevant files
  const relevantFiles = allTree.filter(item => {
    if (item.type !== 'blob') return false;
    const path = item.path;
    if (EXCLUDED_DIRS.some(dir => path.startsWith(`${dir}/`) || path.includes(`/${dir}/`))) return false;
    if (item.size && item.size > 500000) return false; // skip files > 500KB for speed
    return INTERESTING_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext)) ||
           path.toLowerCase().includes('mcp') ||
           path.toLowerCase().includes('docker') ||
           path.toLowerCase().includes('agent');
  });

  // Prioritize key files first, limit to max 80 files for speed
  const prioritized = [
    ...relevantFiles.filter(f => f.path === 'package.json' || f.path.endsWith('/package.json') || f.path.includes('agent') || f.path.includes('mcp')),
    ...relevantFiles.filter(f => !f.path.includes('package.json') && !f.path.includes('agent') && !f.path.includes('mcp')),
  ].slice(0, 80);

  const fileMap = new Map<string, string>();
  const total = prioritized.length;
  let loaded = 0;

  onProgress?.(`Baixando ${total} arquivos para análise de conformidade...`, 40);

  // Concurrently fetch file contents in batches of 8
  const batchSize = 8;
  for (let i = 0; i < prioritized.length; i += batchSize) {
    const batch = prioritized.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async item => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`;
          const res = await fetch(rawUrl);
          if (res.ok) {
            const content = await res.text();
            fileMap.set(item.path, content);
          }
        } catch (err) {
          console.warn(`Falha ao ler ${item.path}:`, err);
        } finally {
          loaded++;
          const pct = Math.round(40 + (loaded / total) * 50);
          onProgress?.(`Carregando (${loaded}/${total}): ${item.path}`, pct);
        }
      })
    );
  }

  onProgress?.('Preparando motor de análise de 13 regulações...', 95);

  return {
    owner,
    repo,
    defaultBranch,
    description: repoMeta.description,
    stars: repoMeta.stargazers_count,
    files: fileMap,
    totalFiles: allTree.length,
  };
}
