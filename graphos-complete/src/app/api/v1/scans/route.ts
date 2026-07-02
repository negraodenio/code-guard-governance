import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
  return createClient(url, key);
}

const DEFAULT_TENANT_ID = '52f41339-a838-4d8f-b041-f9b7bf1ff305';
const TENANT_ID = process.env.GRAPHOS_TENANT_ID ?? process.env.GRAPHOS_ORG_ID ?? DEFAULT_TENANT_ID;

export async function GET() {
  try {
    const supabase = getSupabase();
    const q = supabase
      .from('graphos_entities')
      .select('id,kind,label,attributes,created_at', { count: 'exact' })
      .eq('kind', 'evidence')
      .filter('attributes->>type', 'eq', 'scan_session')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(50);
    const { data, count, error } = await q;
    if (error) console.error('[Scans] Query error:', error.message);
    console.log(`[Scans] Found ${count ?? data?.length ?? 0} sessions`);

    const scans = (data ?? []).map((s: any) => ({
      id: s.attributes?.scanId || s.id,
      target: s.label,
      scannedAt: s.attributes?.scannedAt || s.created_at,
      agents: s.attributes?.agents ?? 0,
      risks: s.attributes?.risks ?? 0,
      evidence: s.attributes?.evidence ?? 0,
      certLevel: s.attributes?.certLevel || 'none',
      score: s.attributes?.score ?? 0,
    }));

    console.log(`[Scans] Returning ${scans.length} sessions`);

    return NextResponse.json({ ok: true, data: scans });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

