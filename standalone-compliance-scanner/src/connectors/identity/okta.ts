import type { IdentityConnector, IdentityConfig, IdentityUser, IdentityGroup, IdentitySyncResult } from './types';
import { isGovernanceRelevant } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Okta — Users + Groups via Okta Management API
// Docs: https://developer.okta.com/docs/reference/api/users/
// Auth: API Token (SSWS) — generated in Okta Admin → Security → API
// ─────────────────────────────────────────────────────────────────────────────

type OktaCfg = Extract<IdentityConfig, { provider: 'okta' }>;

export class OktaConnector implements IdentityConnector {
  readonly provider = 'okta' as const;

  private headers(cfg: OktaCfg): Record<string, string> {
    return { Authorization: `SSWS ${cfg.apiToken}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  }

  private async get(cfg: OktaCfg, path: string): Promise<any> {
    const res = await fetch(`https://${cfg.domain}/api/v1${path}`, { headers: this.headers(cfg) });
    if (!res.ok) throw new Error(`Okta ${res.status}: ${path}`);
    return res.json();
  }

  /** Okta uses Link headers for pagination */
  private async paginate(cfg: OktaCfg, path: string): Promise<any[]> {
    const results: any[] = [];
    let url: string | null = `https://${cfg.domain}/api/v1${path}`;
    while (url && results.length < 10000) {
      const res: Response = await fetch(url, { headers: this.headers(cfg) });
      if (!res.ok) break;
      const page: any[] = await res.json();
      results.push(...(Array.isArray(page) ? page : []));
      const link: string = res.headers.get('link') ?? '';
      const nextMatch: RegExpMatchArray | null = link.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    }
    return results;
  }

  async fetchUsers(cfg: IdentityConfig): Promise<IdentityUser[]> {
    const c = cfg as OktaCfg;
    // status=ACTIVE filter keeps only enabled users
    const rawUsers = await this.paginate(c, '/users?filter=status+eq+"ACTIVE"&limit=200');

    return Promise.all(rawUsers.map(async (u: any) => {
      const p = u.profile ?? {};
      let groups: string[] = [];
      try {
        const grps: any[] = await this.get(c, `/users/${u.id}/groups`);
        groups = grps.map(g => g.profile?.name ?? '').filter(Boolean);
      } catch {}
      return {
        externalId: u.id,
        email: p.email ?? p.login ?? '',
        displayName: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
        givenName: p.firstName ?? undefined,
        surname: p.lastName ?? undefined,
        jobTitle: p.title ?? undefined,
        department: p.department ?? undefined,
        isActive: u.status === 'ACTIVE',
        groups,
        provider: 'okta' as const,
        rawAttributes: { login: p.login, mobilePhone: p.mobilePhone },
      } satisfies IdentityUser;
    }));
  }

  async fetchGroups(cfg: IdentityConfig): Promise<IdentityGroup[]> {
    const c = cfg as OktaCfg;
    const raw = await this.paginate(c, '/groups?limit=200');
    return raw.map((g: any) => ({
      externalId: g.id,
      name: g.profile?.name ?? '',
      description: g.profile?.description ?? undefined,
      memberCount: g.objectClass?.includes('okta:user_group') ? undefined : undefined,
      provider: 'okta' as const,
    }));
  }

  async sync(cfg: IdentityConfig): Promise<IdentitySyncResult> {
    const [users, groups] = await Promise.all([this.fetchUsers(cfg), this.fetchGroups(cfg)]);
    return {
      provider: 'okta', syncedAt: new Date().toISOString(),
      users, groups, governanceUsers: users.filter(isGovernanceRelevant),
    };
  }
}
