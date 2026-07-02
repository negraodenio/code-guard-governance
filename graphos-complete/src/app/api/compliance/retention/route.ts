import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveRetentionPolicies, enforceRetentionPolicy } from '@/lib/compliance/db';

const supabase = () => createAdminClient();

async function verifyInternal(req: NextRequest) {
  const secret = process.env.INTERNAL_WORKER_SECRET;
  if (!secret) return true;
  return req.headers.get('x-internal-secret') === secret;
}

export async function POST(req: NextRequest) {
  try {
    if (!await verifyInternal(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const policies = await getActiveRetentionPolicies();
    const results = await Promise.all(policies.map(enforceRetentionPolicy));

    return NextResponse.json({
      success: true,
      data: {
        executedAt: new Date().toISOString(),
        policiesProcessed: policies.length,
        results,
      },
    });
  } catch (err) {
    console.error('[Retention API] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!await verifyInternal(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase()
      .from('retention_policies')
      .select('*')
      .eq('enabled', true);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error('[Retention API] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
