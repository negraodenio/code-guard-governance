import { GraphEngine } from '@council/graphos';
import type { ScannerResult } from '@/scanner/types';

interface CachedScan {
  engine: GraphEngine;
  result: ScannerResult;
  timestamp: number;
}

// Singleton via globalThis — Next.js compila cada rota em bundle separado,
// cada um com sua própria instância de módulo. globalThis garante cache compartilhado.
const scannerCache: Map<string, CachedScan> =
  (globalThis as any).__graphosScannerCache ?? new Map<string, CachedScan>();
(globalThis as any).__graphosScannerCache = scannerCache;

const MAX_CACHE_SIZE = 50;
const TTL_MS = 30 * 60 * 1000;

function normalizeRepoUrl(url: string): string {
  return url.replace(/\.git$/, '').replace(/\/$/, '').replace(/^https?:\/\/github\.com\//, '');
}

export function cacheScannerResult(repoUrl: string, engine: GraphEngine, result: ScannerResult): void {
  const key = normalizeRepoUrl(repoUrl);
  scannerCache.set(key, { engine, result, timestamp: Date.now() });

  if (scannerCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(scannerCache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    if (entries[0]) scannerCache.delete(entries[0][0]);
  }
}

export function getScannerResult(repoUrl: string): CachedScan | undefined {
  const key = normalizeRepoUrl(repoUrl);
  const entry = scannerCache.get(key);
  if (!entry) return undefined;

  if (Date.now() - entry.timestamp > TTL_MS) {
    scannerCache.delete(key);
    return undefined;
  }

  return entry;
}