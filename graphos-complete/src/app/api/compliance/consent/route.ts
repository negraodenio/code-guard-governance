import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyConsentInDb, storeConsent } from '@/lib/compliance/db';
import { LGPDComplianceManager } from '@/lib/compliance/lgpd';

const supabase = () => createAdminClient();

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!authHeader) {
    return NextResponse.json({ success: false, error: 'Missing authorization' }, { status: 401 });
  }
  const { data: { user }, error } = await supabase().auth.getUser(authHeader);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return user as NonNullable<typeof user>;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (user instanceof NextResponse) return user;

    const body = await req.json();
    const { action, consentId, purposes } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }

    if (action === 'verify') {
      if (!consentId || !purposes) {
        return NextResponse.json({ success: false, error: 'Missing consentId or purposes' }, { status: 400 });
      }
      const valid = await verifyConsentInDb(consentId, user.id, purposes);
      return NextResponse.json({ success: true, data: { valid } });
    }

    if (action === 'request') {
      const mgr = new LGPDComplianceManager();
      const consent = await mgr.requestConsent(user.id, purposes ?? ['DECISION_ANALYSIS'], {
        ip: req.headers.get('x-forwarded-for') ?? 'unknown',
        userAgent: req.headers.get('user-agent') ?? 'unknown',
      });
      return NextResponse.json({ success: true, data: consent });
    }

    if (action === 'withdraw') {
      if (!consentId) {
        return NextResponse.json({ success: false, error: 'Missing consentId' }, { status: 400 });
      }
      const mgr = new LGPDComplianceManager();
      const withdrawn = await mgr.withdrawConsent(consentId, user.id);
      return NextResponse.json({ success: true, data: { withdrawn } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[Consent API] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
