import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getLimitForPlan } from '@/config/limits';
import { requireAuthContext } from '@/lib/security/auth-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const auth = await requireAuthContext();
    if (!auth.ok) return auth.response;

    const supabase = auth.admin;
    const { idea, region, sensitivity, topic } = await req.json() || {};

    if (!idea) return NextResponse.json({ error: 'Missing idea' }, { status: 400 });

    const u_id = auth.ctx.user.id;
    const t_id = auth.ctx.tenantId;

    // SAFETY: Ensure tenant and profile records exist to avoid FK violations (validations_tenant_id_fkey)
    await supabase.from('tenants').upsert({ id: t_id, name: 'Personal Workspace' }, { onConflict: 'id' });
    await supabase.from('profiles').upsert({ id: u_id, tenant_id: t_id }, { onConflict: 'id' });

    // 3. Verify Usage & Subscription
    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('tenant_id', t_id)
        .maybeSingle();

    const { data: usage } = await supabase
        .from('usage_records')
        .select('validations_count')
        .eq('tenant_id', t_id)
        .eq('period_month', periodMonth)
        .maybeSingle();

    const limit = getLimitForPlan(subscription?.plan);
    const currentUsage = usage?.validations_count || 0;

    if (currentUsage >= limit) {
        console.log(`[Limit] Blocked. Tenant: ${t_id} | Usage: ${currentUsage} | Limit: ${limit} | Plan: ${subscription?.plan}`);
        return NextResponse.json(
            {
                error: 'LIMIT_REACHED',
                message: 'Your monthly session limit has been reached.',
                limit,
                usage: currentUsage,
                debug: {
                    tenant: t_id,
                    user: u_id,
                    plan: subscription?.plan || 'free',
                    month: periodMonth,
                    currentUsage,
                    limit
                }
            },
            { status: 403 }
        );
    }

    // 4. Create Validation
    const validationId = `val_${nanoid(10)}`;
    const runId = `run_${nanoid(10)}`;

    const { error: valError } = await supabase.from('validations').insert({
        id: validationId,
        tenant_id: t_id,
        user_id: u_id,
        region,
        sensitivity,
        idea,
        status: 'running',
    });

    if (valError) return NextResponse.json({ error: valError.message }, { status: 500 });

    await supabase.from('debate_runs').insert({
        id: runId,
        validation_id: validationId,
        tenant_id: t_id,
        user_id: u_id,
        topic: topic ?? 'CouncilIA Live Debate',
        status: 'running',
    });

    console.log(`[Start] Session created. Run ID: ${runId}`);

    return NextResponse.json({ validationId, runId });
}
