/**
 * CodeGuard API v1 - Stripe Webhook
 * 
 * POST /api/v1/webhook
 * 
 * Receives events from Stripe to update user credits automatically.
 * Handles 'checkout.session.completed'.
 */

import { getSupabaseClient } from '../../src/supabase/client';

// Simple Stripe Signature Verification (Mock for Edge, use 'stripe' npm in Node)
// In production Vercel Edge, we'd use 'stripe-edge' or similar
async function verifyStripeSignature(req: Request, secret: string) {
    const sigHeader = req.headers.get('stripe-signature');
    if (!sigHeader) return false;

    // Stripe-Signature: t=timestamp,v1=signature[,v1=signature2...]
    const parts = sigHeader.split(',').map(s => s.trim());
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Parts = parts.filter(p => p.startsWith('v1='));
    if (!tPart || v1Parts.length === 0) return false;

    const timestamp = tPart.slice(2);
    const signatures = v1Parts.map(p => p.slice(3)).filter(Boolean);
    if (!timestamp || signatures.length === 0) return false;

    // Replay protection (default 5 minutes)
    const toleranceSec = parseInt(process.env.STRIPE_WEBHOOK_TOLERANCE_SEC || '300', 10);
    const nowSec = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > toleranceSec) return false;

    // Body must be the raw payload used to compute signature. We'll accept it as req text read by caller.
    const rawBody = (req as any).__rawBody as string | undefined;
    if (!rawBody) return false;

    const signedPayload = `${timestamp}.${rawBody}`;
    const enc = new TextEncoder();

    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const mac = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
    const bytes = new Uint8Array(mac);
    let hex = '';
    for (const b of bytes) hex += b.toString(16).padStart(2, '0');

    // Constant-time-ish compare against any provided v1 signature
    const expected = hex.toLowerCase();
    for (const provided of signatures) {
        const a = expected;
        const b = (provided || '').toLowerCase();
        if (a.length !== b.length) continue;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        if (diff === 0) return true;
    }

    return false;
}

export async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const STRIPE_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

    if (!STRIPE_SECRET) {
        console.error('Missing STRIPE_WEBHOOK_SECRET');
        return new Response('Server Error', { status: 500 });
    }

    try {
        const signature = req.headers.get('stripe-signature');
        if (!signature) {
            return new Response('Missing signature', { status: 400 });
        }

        const text = await req.text();
        (req as any).__rawBody = text;
        const event = JSON.parse(text);

        // Security check: Verify Stripe Signature
        // In production, use 'stripe' library's constructEvent
        const isValidSignature = await verifyStripeSignature(req, STRIPE_SECRET);
        if (!isValidSignature) {
            console.warn('[Security] Invalid Stripe Signature. Rejecting.');
            return new Response('Invalid signature', { status: 400 });
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userEmail = session.customer_details?.email || session.metadata?.email;
            const amountPaid = session.amount_total; // in cents

            // Business Logic: €19.99 = 20 credits (approx)
            // Or use metadata for exact credit amount
            const creditsToAdd = session.metadata?.credits ? parseInt(session.metadata.credits) : 20;

            if (userEmail) {
                const supabase = getSupabaseClient();
                if (supabase) {
                    // Update user credits
                    // Using RPC to increment is safer for concurrency
                    // await supabase.rpc('increment_credits', { email: userEmail, amount: creditsToAdd });

                    // Simple select-update fallback
                    const { data: user } = await supabase
                        .from('user_credits')
                        .select('credits')
                        .eq('email', userEmail)
                        .single();

                    const newBalance = (user?.credits || 0) + creditsToAdd;

                    await supabase
                        .from('user_credits')
                        .upsert({ email: userEmail, credits: newBalance, last_updated: new Date().toISOString() });

                    console.log(`[Billing] Added ${creditsToAdd} credits to ${userEmail}`);
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });

    } catch (err) {
        console.error(`Webhook Error: ${(err as Error).message}`);
        return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
    }
}

export const config = { runtime: 'nodejs' };
export default handler;
