import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createDataSubjectRequest, getUserRequests, collectUserData, executeErasure } from '@/lib/compliance/db';

const supabase = () => createAdminClient();

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!authHeader) return null;

  const { data: { user }, error } = await supabase().auth.getUser(authHeader);
  if (error || !user) return null;
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, details } = body;

    if (!type || !['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'OBJECTION', 'RESTRICTION'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid request type' }, { status: 400 });
    }

    if (type === 'ERASURE') {
      const result = await executeErasure(user.id);
      await createDataSubjectRequest(user.id, 'ERASURE', { result });
      return NextResponse.json({ success: true, data: result });
    }

    if (type === 'ACCESS') {
      const userData = await collectUserData(user.id);
      await createDataSubjectRequest(user.id, 'ACCESS', { dataCategories: Object.keys(userData) });
      return NextResponse.json({ success: true, data: userData });
    }

    if (type === 'PORTABILITY') {
      const userData = await collectUserData(user.id);
      await createDataSubjectRequest(user.id, 'PORTABILITY', { exported: true });
      return NextResponse.json({
        success: true,
        data: {
          format: 'application/json',
          exportedAt: new Date().toISOString(),
          data: userData,
        },
      });
    }

    const request = await createDataSubjectRequest(user.id, type, details);
    return NextResponse.json({ success: true, data: request });
  } catch (err) {
    console.error('[Compliance API] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await getUserRequests(user.id);
    return NextResponse.json({ success: true, data: requests });
  } catch (err) {
    console.error('[Compliance API] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
