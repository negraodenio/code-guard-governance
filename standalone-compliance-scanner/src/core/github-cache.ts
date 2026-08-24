import * as fs from 'fs';
import * as path from 'path';

const CACHE_DIR = path.join(__dirname, '..', '..', '.scanner-cache');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function cacheKey(owner: string, repo: string, resource: string): string {
  return `${owner}/${repo}/${resource}`.replace(/[^a-zA-Z0-9\/_-]/g, '_');
}

function cachePath(key: string): string {
  return path.join(CACHE_DIR, key + '.json');
}

export function getCached(key: string): any | null {
  const fp = cachePath(key);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = fs.readFileSync(fp, 'utf-8');
    const data = JSON.parse(raw);
    // Invalidate cache older than 1 hour
    if (Date.now() - data._cachedAt > 3600000) return null;
    return data._payload;
  } catch { return null; }
}

export function setCache(key: string, payload: any): void {
  try {
    ensureDir();
    const fp = cachePath(key);
    fs.writeFileSync(fp, JSON.stringify({ _cachedAt: Date.now(), _payload: payload }, null, 2));
  } catch {}
}

export function cachedFetch(owner: string, repo: string, resource: string, url: string, token?: string): Promise<any> {
  const key = cacheKey(owner, repo, resource);
  const cached = getCached(key);
  if (cached) {
    console.log(`[cache HIT] ${resource}`);
    return Promise.resolve(cached);
  }
  console.log(`[cache MISS] ${resource} — fetching from GitHub API`);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['User-Agent'] = 'graphos-scanner/1.0';
  return fetch(url, { headers }).then(async res => {
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    setCache(key, data);
    return data;
  });
}
