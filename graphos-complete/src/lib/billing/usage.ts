import { createAdminClient } from '@/lib/supabase/admin';

export async function trackUsage(params: {
    tenant_id: string;
    validation_id: string;
}) {
    const supabase = createAdminClient();
    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get AI logs cost for this validation
    const { data: logs } = await supabase
        .from('ai_logs')
        .select('cost_usd')
        .eq('validation_id', params.validation_id);

    const totalCost = logs?.reduce((sum, l) => sum + (Number(l.cost_usd) || 0), 0) || 0;

    // Get patches count
    const { count: patchesCount } = await supabase
        .from('code_patches')
        .select('*', { count: 'exact', head: true })
        .eq('validation_id', params.validation_id);

    // Get AI calls count
    const { count: aiCallsCount } = await supabase
        .from('ai_logs')
        .select('*', { count: 'exact', head: true })
        .eq('validation_id', params.validation_id);

    // Upsert usage record
    const { data: existing } = await supabase
        .from('usage_records')
        .select('*')
        .eq('tenant_id', params.tenant_id)
        .eq('period_month', periodMonth)
        .maybeSingle();

    if (existing) {
        await supabase
            .from('usage_records')
            .update({
                validations_count: existing.validations_count + 1,
                patches_count: existing.patches_count + (patchesCount || 0),
                ai_calls_count: existing.ai_calls_count + (aiCallsCount || 0),
                total_cost_usd: Number(existing.total_cost_usd) + totalCost,
                updated_at: now.toISOString()
            })
            .eq('id', existing.id);
    } else {
        await supabase.from('usage_records').insert({
            tenant_id: params.tenant_id,
            period_month: periodMonth,
            validations_count: 1,
            patches_count: patchesCount || 0,
            ai_calls_count: aiCallsCount || 0,
            total_cost_usd: totalCost
        });
    }
}
