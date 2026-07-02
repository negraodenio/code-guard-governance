// ─────────────────────────────────────────────────────────────────────────────
// Connector Registry — auto-detects provider from URL, returns the right connector.
// ─────────────────────────────────────────────────────────────────────────────
import type { SourceConnector, ConnectorConfig, SourceProvider } from './types';
import { GitHubConnector } from './github';
import { GitLabConnector } from './gitlab';
import { GiteaConnector, ForgejoConnector } from './gitea';
import { BitbucketConnector } from './bitbucket';
import { AzureDevOpsConnector } from './azure-devops';

// Singleton instances
const CONNECTORS: Record<SourceProvider, SourceConnector> = {
  'github': new GitHubConnector(),
  'gitlab': new GitLabConnector(),
  'gitea': new GiteaConnector(),
  'forgejo': new ForgejoConnector(),
  'bitbucket': new BitbucketConnector(),
  'azure-devops': new AzureDevOpsConnector(),
};

const URL_PATTERNS: Array<{ pattern: RegExp; provider: SourceProvider }> = [
  { pattern: /github\.com/i, provider: 'github' },
  { pattern: /gitlab\.com/i, provider: 'gitlab' },
  { pattern: /bitbucket\.org/i, provider: 'bitbucket' },
  { pattern: /dev\.azure\.com|\.visualstudio\.com/i, provider: 'azure-devops' },
  // Codeberg is the most popular Forgejo instance
  { pattern: /codeberg\.org/i, provider: 'forgejo' },
  // Gitea Cloud (gitea.com) and self-hosted instances that say gitea
  { pattern: /gitea\.com|\/gitea\//i, provider: 'gitea' },
];

/**
 * Detect provider from URL. Returns the provider enum or null if unknown.
 */
export function detectProvider(url: string): SourceProvider | null {
  for (const { pattern, provider } of URL_PATTERNS) {
    if (pattern.test(url)) return provider;
  }
  return null;
}

/**
 * Get the connector instance for a given provider.
 */
export function getConnector(provider: SourceProvider): SourceConnector {
  const c = CONNECTORS[provider];
  if (!c) throw new Error(`No connector registered for provider: ${provider}`);
  return c;
}

/**
 * Auto-detect provider from URL and return the matching connector.
 * Falls back to GitHub if unrecognised (safe default for most git hosts).
 */
export function getConnectorForUrl(url: string): { connector: SourceConnector; provider: SourceProvider } {
  const provider = detectProvider(url) ?? 'github';
  return { connector: getConnector(provider), provider };
}

/**
 * Build a ConnectorConfig from a raw URL + optional credentials.
 */
export function buildConfig(
  repoUrl: string,
  opts: { token?: string; branch?: string; organization?: string; baseUrl?: string } = {},
): ConnectorConfig {
  const provider = detectProvider(repoUrl) ?? 'github';
  return { provider, repoUrl, ...opts };
}

/**
 * Resolve the canonical repoUrl for a given URL.
 * Strips .git suffix, normalises slashes.
 */
export function normaliseRepoUrl(url: string): string {
  return url.trim().replace(/\.git$/, '').replace(/\/$/, '');
}

export { CONNECTORS };
export type { SourceConnector, ConnectorConfig, SourceProvider };
