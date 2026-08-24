// ─────────────────────────────────────────────────────────────────────────────
// CodeGuard Connector SDK — Core Types
// Every source of truth that CodeGuard can read to govern AI agents.
// ─────────────────────────────────────────────────────────────────────────────

/** A file entry from any source control provider. */
export interface ConnectorFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size?: number;
}

/** Repository metadata — normalised across all providers. */
export interface ConnectorRepoMeta {
  name: string;
  owner: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  language: string;
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  hasLicense: boolean;
  licenseName: string | null;
  fileCount: number;
  topics: string[];
  provider: SourceProvider;
  /** Original URL used to locate this repo */
  repoUrl: string;
}

/** All supported source control platforms. */
export type SourceProvider =
  | 'github'
  | 'gitlab'
  | 'azure-devops'
  | 'bitbucket'
  | 'gitea'
  | 'forgejo';

/** CI/CD platform signals found in the repository. */
export interface CiCdSignal {
  platform:
    | 'github-actions'
    | 'gitlab-ci'
    | 'azure-pipelines'
    | 'jenkins'
    | 'argocd'
    | 'circle-ci'
    | 'travis-ci'
    | 'buildkite'
    | 'tekton';
  configPath: string;
  /** Whether AI-specific steps / plugins are referenced in the pipeline */
  hasAiSteps: boolean;
  evidence: string[];
}

/** Cloud / IaC AI resource signal found in the repo. */
export interface IacAiSignal {
  cloud: 'aws' | 'azure' | 'gcp' | 'unknown';
  service: string;       // e.g. "Bedrock", "Azure OpenAI", "Vertex AI"
  resource: string;      // e.g. "aws_bedrock_model_invocation_logging_configuration"
  configPath: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/** Full credential / connection config for a connector. */
export interface ConnectorConfig {
  provider: SourceProvider;
  /** Full repo URL — used as primary key */
  repoUrl: string;
  /** Branch to scan (defaults to default branch) */
  branch?: string;
  token?: string;
  /** For Azure DevOps: org name */
  organization?: string;
  /** For self-hosted GitLab / Gitea: custom base URL */
  baseUrl?: string;
}

// ── The core interface every provider must implement ─────────────────────────

export interface SourceConnector {
  readonly provider: SourceProvider;

  /** Parse a URL and return { owner, repo } for this provider. */
  parseUrl(url: string): { owner: string; repo: string };

  /** Fetch repo metadata (name, branch, language, stars…). */
  fetchMeta(config: ConnectorConfig): Promise<ConnectorRepoMeta>;

  /** Fetch the full file tree (recursive). */
  fetchTree(config: ConnectorConfig, branch: string): Promise<ConnectorFile[]>;

  /** Fetch raw content of a single file. Returns null if not found. */
  fetchFile(config: ConnectorConfig, path: string, branch: string): Promise<string | null>;

  /** Fetch dominant languages. Returns Record<lang, bytes>. */
  fetchLanguages(config: ConnectorConfig): Promise<Record<string, number>>;
}
