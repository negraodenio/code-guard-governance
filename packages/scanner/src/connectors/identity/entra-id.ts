import type { IdentityConnector, IdentityConfig, IdentityUser, IdentityGroup, IdentitySyncResult } from './types';
import { isGovernanceRelevant } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Entra ID (Azure AD) — Microsoft Graph API v1.0
// Docs: https://learn.microsoft.com/graph/api/resources/user
// Auth: Client Credentials flow → Bearer token (no user interaction needed)
// ─────────────────────────────────────────────────────────────────────────────

type EntraCfg = Extract<IdentityConfig, { provider: 'entra-id' }>;

async function getToken(cfg: EntraCfg): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  );
  if (!res.ok) throw new Error(`Entra token error: ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

async function graphGet(token: string, path: string): Promise<any> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Graph API ${res.status}: ${path}`);
  return res.json();
}

async function paginate(token: string, initialUrl: string): Promise<any[]> {
  const results: any[] = [];
  let url: string | null = initialUrl;
  while (url && results.length < 10000) {
    const page = await graphGet(token, url.replace('https://graph.microsoft.com/v1.0', ''));
    results.push(...(page.value ?? []));
    url = page['@odata.nextLink'] ?? null;
  }
  return results;
}

export class EntraIdConnector implements IdentityConnector {
  readonly provider = 'entra-id' as const;

  async fetchUsers(cfg: IdentityConfig): Promise<IdentityUser[]> {
    const c = cfg as EntraCfg;
    const token = await getToken(c);

    // Fetch all users with relevant fields + their transitive group memberships
    const rawUsers = await paginate(token,
      '/users?$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,accountEnabled&$top=999'
    );

    return Promise.all(rawUsers.map(async (u: any) => {
      let groups: string[] = [];
      try {
        const mem = await graphGet(token, `/users/${u.id}/transitiveMemberOf/microsoft.graph.group?$select=displayName`);
        groups = (mem.value ?? []).map((g: any) => g.displayName as string);
      } catch {}
      return {
        externalId: u.id,
        email: u.mail ?? u.userPrincipalName ?? '',
        displayName: u.displayName ?? '',
        givenName: u.givenName ?? undefined,
        surname: u.surname ?? undefined,
        jobTitle: u.jobTitle ?? undefined,
        department: u.department ?? undefined,
        isActive: u.accountEnabled !== false,
        groups,
        provider: 'entra-id' as const,
        rawAttributes: { userPrincipalName: u.userPrincipalName },
      } satisfies IdentityUser;
    }));
  }

  async fetchGroups(cfg: IdentityConfig): Promise<IdentityGroup[]> {
    const c = cfg as EntraCfg;
    const token = await getToken(c);
    const raw = await paginate(token, '/groups?$select=id,displayName,description,members&$top=999');
    return raw.map((g: any) => ({
      externalId: g.id,
      name: g.displayName ?? '',
      description: g.description ?? undefined,
      provider: 'entra-id' as const,
    }));
  }

  async sync(cfg: IdentityConfig): Promise<IdentitySyncResult> {
    const [users, groups] = await Promise.all([this.fetchUsers(cfg), this.fetchGroups(cfg)]);
    return {
      provider: 'entra-id', syncedAt: new Date().toISOString(),
      users, groups, governanceUsers: users.filter(isGovernanceRelevant),
    };
  }
}
