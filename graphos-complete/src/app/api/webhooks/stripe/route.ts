import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!webhookSecret || !stripeKey) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 200 });
    }

    const { stripe } = await import('@/lib/stripe');
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const Stripe = (await import('stripe')).default;

    const supabase = createAdminClient();
    const body = await req.text();
    const sig = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const subscriptionId = session.subscription as string;
            const tenantId = session.metadata?.tenant_id;
            const plan = session.metadata?.plan || 'pro';

            if (tenantId && subscriptionId) {
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                await supabase.from('subscriptions').upsert({
                    id: sub.id,
                    tenant_id: tenantId,
                    stripe_customer_id: sub.customer as string,
                    status: sub.status,
                    plan: plan,
                    current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
                    current_period_end: new Date((sub as any).current_period_end * 1000).toISOString()
                });
            }
            break;
        }

        case 'customer.subscription.updated': {
            const sub = event.data.object as Stripe.Subscription;
            const tenantId = sub.metadata?.tenant_id;
            const plan = sub.metadata?.plan || 'pro';

            if (tenantId) {
                // Determine status and set end period correctly
                const status = sub.status === 'past_due' || sub.status === 'unpaid' ? 'canceled' : sub.status;

                await supabase.from('subscriptions').upsert({
                    id: sub.id,
                    tenant_id: tenantId,
                    stripe_customer_id: sub.customer as string,
                    status: status,
                    plan: plan,
                    current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
                    current_period_end: new Date((sub as any).current_period_end * 1000).toISOString()
                });
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const sub = event.data.object as Stripe.Subscription;
            await supabase.from('subscriptions').update({ status: 'canceled' }).eq('id', sub.id);
            break;
        }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
