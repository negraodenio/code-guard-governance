import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isInternalRequest } from '@/lib/security/internal-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEBUG_ENDPOINTS !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isInternalRequest(req.headers)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const runId = url.searchParams.get('runId');
  
  if (!runId) return NextResponse.json({ error: 'missing runId' }, { status: 400 });

  const supabase = createAdminClient();
  
  // First: get any row to see columns
  const { data: sample, error: sampleErr } = await supabase
    .from('debate_events')
    .select('*')
    .limit(1);

  const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];

  // Now fetch by runId without ordering
  const { data, error } = await supabase
    .from('debate_events')
    .select('*')
    .eq('run_id', runId);

  return NextResponse.json({ 
    columns,
    sampleError: sampleErr?.message,
    count: data?.length || 0, 
    error: error?.message, 
    events: data 
  });
}
