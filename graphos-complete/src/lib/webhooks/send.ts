import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function triggerWebhook(params: {
    tenant_id: string;
    event: string;
    payload: any;
}) {
    const supabase = createAdminClient();

    const { data: subs } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('tenant_id', params.tenant_id)
        .eq('active', true)
        .contains('events', [params.event]);

    if (!subs || subs.length === 0) return;

    for (const sub of subs) {
        const body = JSON.stringify({ event: params.event, payload: params.payload, timestamp: Date.now() });
        const signature = crypto.createHmac('sha256', sub.secret).update(body).digest('hex');

        fetch(sub.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CouncilIA-Signature': signature
            },
            body
        }).catch((err) => console.error(`Webhook failed for ${sub.url}:`, err));
    }
}
