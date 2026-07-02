import type { IdentityConnector, IdentityConfig, IdentityUser, IdentityGroup, IdentitySyncResult } from './types';
import { isGovernanceRelevant } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Keycloak — Admin REST API
// Docs: https://www.keycloak.org/docs-api/latest/rest-api/
// Auth: Client Credentials (service account) → Bearer token
// ─────────────────────────────────────────────────────────────────────────────

type KcCfg = Extract<IdentityConfig, { provider: 'keycloak' }>;

async function getToken(cfg: KcCfg): Promise<string> {
  const res = await fetch(
    `${cfg.baseUrl.replace(/\/$/, '')}/realms/${cfg.realm}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }),
    }
  );
  if (!res.ok) throw new Error(`Keycloak token error: ${res.status}`);
  return (await res.json()).access_token as string;
}

export class KeycloakConnector implements IdentityConnector {
  readonly provider = 'keycloak' as const;

  private admin(cfg: KcCfg) {
    return `${cfg.baseUrl.replace(/\/$/, '')}/admin/realms/${cfg.realm}`;
  }

  private async get(token: string, url: string): Promise<any> {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Keycloak ${res.status}: ${url}`);
    return res.json();
  }

  private async paginate(token: string, base: string, endpoint: string): Promise<any[]> {
    const all: any[] = [];
    let first = 0;
    const max = 200;
    while (all.length < 20000) {
      const page: any[] = await this.get(token, `${base}${endpoint}?first=${first}&max=${max}`);
      if (!page.length) break;
      all.push(...page);
      if (page.length < max) break;
      first += max;
    }
    return all;
  }

  async fetchUsers(cfg: IdentityConfig): Promise<IdentityUser[]> {
    const c = cfg as KcCfg;
    const token = await getToken(c);
    const base = this.admin(c);
    const raw = await this.paginate(token, base, '/users?enabled=true');

    return Promise.all(raw.map(async (u: any) => {
      let groups: string[] = [];
      try {
        const grps: any[] = await this.get(token, `${base}/users/${u.id}/groups`);
        groups = grps.map(g => g.name ?? '').filter(Boolean);
      } catch {}
      return {
        externalId: u.id,
        email: u.email ?? '',
        displayName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username,
        givenName: u.firstName ?? undefined,
        surname: u.lastName ?? undefined,
        jobTitle: u.attributes?.jobTitle?.[0] ?? undefined,
        department: u.attributes?.department?.[0] ?? undefined,
        isActive: u.enabled !== false,
        groups,
        provider: 'keycloak' as const,
        rawAttributes: { username: u.username, attributes: u.attributes },
      } satisfies IdentityUser;
    }));
  }

  async fetchGroups(cfg: IdentityConfig): Promise<IdentityGroup[]> {
    const c = cfg as KcCfg;
    const token = await getToken(c);
    const raw = await this.paginate(token, this.admin(c), '/groups');
    return raw.map((g: any) => ({
      externalId: g.id, name: g.name ?? '',
      description: g.attributes?.description?.[0] ?? undefined,
      memberCount: g.subGroups?.length,
      provider: 'keycloak' as const,
    }));
  }

  async sync(cfg: IdentityConfig): Promise<IdentitySyncResult> {
    const [users, groups] = await Promise.all([this.fetchUsers(cfg), this.fetchGroups(cfg)]);
    return {
      provider: 'keycloak', syncedAt: new Date().toISOString(),
      users, groups, governanceUsers: users.filter(isGovernanceRelevant),
    };
  }
}
