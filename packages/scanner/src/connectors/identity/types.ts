// ─────────────────────────────────────────────────────────────────────────────
// Identity Connector SDK — Core Types
// Normalises users and groups across Entra ID, Okta, Keycloak.
// Feeds into gov_repo.governance_users (external_id linkage).
// ─────────────────────────────────────────────────────────────────────────────

export type IdentityProvider = 'entra-id' | 'okta' | 'keycloak';

/** A user normalised from any identity provider. */
export interface IdentityUser {
  externalId: string;        // Provider-native unique ID
  email: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
  isActive: boolean;
  groups: string[];          // Group names this user belongs to
  provider: IdentityProvider;
  rawAttributes?: Record<string, unknown>;
}

/** A group / role normalised from any identity provider. */
export interface IdentityGroup {
  externalId: string;
  name: string;
  description?: string;
  memberCount?: number;
  provider: IdentityProvider;
}

/** Result of a full identity sync. */
export interface IdentitySyncResult {
  provider: IdentityProvider;
  syncedAt: string;
  users: IdentityUser[];
  groups: IdentityGroup[];
  /** Users that should map to AI-governance roles (heuristic: "AI", "ML", "Data", "Platform" in title/dept) */
  governanceUsers: IdentityUser[];
}

/** Credentials for each identity provider. */
export type IdentityConfig =
  | { provider: 'entra-id'; tenantId: string; clientId: string; clientSecret: string }
  | { provider: 'okta';     domain: string;   apiToken: string }
  | { provider: 'keycloak'; baseUrl: string;  realm: string; clientId: string; clientSecret: string };

export interface IdentityConnector {
  readonly provider: IdentityProvider;
  /** Fetch all users (paginated internally). */
  fetchUsers(cfg: IdentityConfig): Promise<IdentityUser[]>;
  /** Fetch all groups/roles. */
  fetchGroups(cfg: IdentityConfig): Promise<IdentityGroup[]>;
  /** Full sync — users + groups + governance heuristic. */
  sync(cfg: IdentityConfig): Promise<IdentitySyncResult>;
}

// Heuristic: is this user relevant to AI governance?
export function isGovernanceRelevant(user: IdentityUser): boolean {
  const haystack = [user.jobTitle ?? '', user.department ?? '', ...user.groups].join(' ').toLowerCase();
  return /\b(ai|ml|llm|machine.?learning|data.?science|platform|mlops|aiops|governance|compliance|security|agent)\b/.test(haystack);
}
