import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIdentityConnector } from '@council/scanner';
import type { IdentityConfig } from '@council/scanner';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/identity/sync
// Syncs users from Entra ID / Okta / Keycloak into gov_repo.governance_users.
// Body: IdentityConfig (provider + credentials)
// Returns: { synced, created, skipped, governanceUsers }
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TENANT_ID = '52f41339-a838-4d8f-b041-f9b7bf1ff305';
const ORG_ID = process.env.GRAPHOS_ORG_ID ?? DEFAULT_TENANT_ID;

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function govDML(sql: string) {
  const { data, error } = await getSupabase().rpc('gov_exec_dml', { sql });
  if (error) throw new Error(`gov_exec_dml: ${error.message}`);
  return data ?? [];
}

async function govQuery(sql: string) {
  const { data, error } = await getSupabase().rpc('gov_exec', { sql });
  if (error) throw new Error(`gov_exec: ${error.message}`);
  return data ?? [];
}

const esc = (s: string) => (s ?? '').replace(/'/g, "''").slice(0, 500);

export async function POST(req: NextRequest) {
  try {
    const cfg = await req.json() as IdentityConfig;
    if (!cfg?.provider) {
      return NextResponse.json({ ok: false, error: 'provider required (entra-id | okta | keycloak)' }, { status: 400 });
    }

    const connector = getIdentityConnector(cfg.provider);
    const result = await connector.sync(cfg);

    let created = 0, skipped = 0;

    for (const u of result.users) {
      if (!u.email) { skipped++; continue; }
      try {
        const rows = await govDML(
          `INSERT INTO gov_repo.governance_users
             (external_id, email, full_name, display_name, job_title, department, organisation_id, status)
           VALUES
             ('${esc(u.externalId)}', '${esc(u.email)}', '${esc(u.displayName)}',
              '${esc(u.givenName ?? u.displayName)}', ${u.jobTitle ? `'${esc(u.jobTitle)}'` : 'NULL'},
              ${u.department ? `'${esc(u.department)}'` : 'NULL'},
              '${ORG_ID}', '${u.isActive ? 'active' : 'inactive'}')
           ON CONFLICT (email)
           DO UPDATE SET
             external_id  = EXCLUDED.external_id,
             full_name    = EXCLUDED.full_name,
             job_title    = EXCLUDED.job_title,
             department   = EXCLUDED.department,
             status       = EXCLUDED.status,
             updated_at   = now()
           RETURNING user_id`
        );
        if (Array.isArray(rows) && rows.length > 0) created++; else skipped++;
      } catch { skipped++; }
    }

    // Return the governance-relevant users for review
    const gUsers = result.governanceUsers.map(u => ({
      email: u.email, displayName: u.displayName,
      jobTitle: u.jobTitle, department: u.department,
      groups: u.groups.slice(0, 5),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        provider: cfg.provider,
        syncedAt: result.syncedAt,
        totalUsers: result.users.length,
        totalGroups: result.groups.length,
        created, skipped,
        governanceUsers: gUsers,
        governanceUsersCount: gUsers.length,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
