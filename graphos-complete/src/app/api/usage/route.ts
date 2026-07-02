import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLimitForPlan } from '@/config/limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // 2. Get Tenant
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .maybeSingle();

        const t_id = profile?.tenant_id || user.id;

        // 3. Fetch Usage & Subscription (Using Admin to bypass RLS)
        const now = new Date();
        const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const { data: subscription } = await adminSupabase
            .from('subscriptions')
            .select('plan')
            .eq('tenant_id', t_id)
            .maybeSingle();

        const { data: usage } = await adminSupabase
            .from('usage_records')
            .select('validations_count')
            .eq('tenant_id', t_id)
            .eq('period_month', periodMonth)
            .maybeSingle();

        const limit = getLimitForPlan(subscription?.plan);
        const currentUsage = usage?.validations_count || 0;

        return NextResponse.json({
            usage: currentUsage,
            limit,
            plan: subscription?.plan || 'free',
            userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Council Member'
        });
    } catch (e) {
        console.error('[Usage API Error]', e);
        return NextResponse.json({
            usage: 0,
            limit: 2,
            plan: 'free',
            userName: user.email?.split('@')[0] || 'Council Member'
        });
    }
}
