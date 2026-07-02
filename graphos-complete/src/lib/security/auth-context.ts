import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuthContext = {
  user: User;
  tenantId: string;
  role: string;
};

export async function requireAuthContext(): Promise<
  | { ok: true; ctx: AuthContext; supabase: Awaited<ReturnType<typeof createClient>>; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createAdminClient();

  let tenantId = user.id;
  let role = 'member';

  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('tenant_id,role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.tenant_id) tenantId = profile.tenant_id;
    if (profile?.role) role = profile.role;
  } catch {
    // Fail closed on tenant context? For now, isolate to the user's personal scope.
    tenantId = user.id;
    role = 'member';
  }

  return { ok: true, ctx: { user, tenantId, role }, supabase, admin };
}

export function forbid() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

