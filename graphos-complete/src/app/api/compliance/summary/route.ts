import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getComplianceSummary } from '@/lib/compliance/db';

export const dynamic = 'force-dynamic';

const supabase = () => createAdminClient();

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error } = await supabase().auth.getUser(authHeader);
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await getComplianceSummary(user.id);
    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    console.error('[Compliance Summary] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

