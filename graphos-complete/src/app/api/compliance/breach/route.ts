import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerBreach, resolveBreach } from '@/lib/compliance/db';

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

    const body = await req.json();
    const { action, breachId, ...params } = body;

    if (action === 'register') {
      if (!params.breachType || !params.severity || !params.description) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }
      const breach = await registerBreach(params);
      return NextResponse.json({ success: true, data: breach });
    }

    if (action === 'resolve') {
      if (!breachId || !params.resolution) {
        return NextResponse.json({ success: false, error: 'Missing breachId or resolution' }, { status: 400 });
      }
      const ok = await resolveBreach(breachId, params.resolution);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[Breach API] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!await verifyInternal(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase()
      .from('breach_notifications')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error('[Breach API] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
