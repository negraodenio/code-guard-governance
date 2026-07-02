"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_ts_1 = require("https://deno.land/std@0.168.0/http/server.ts");
const supabase_js_2_0_0_1 = require("https://esm.sh/@supabase/supabase-js@2.0.0");
const stripe_12_0_0_target_deno_1 = require("https://esm.sh/stripe@12.0.0?target=deno");
const stripe = new stripe_12_0_0_target_deno_1.default(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
    httpClient: stripe_12_0_0_target_deno_1.default.createFetchHttpClient(),
});
const cryptoProvider = stripe_12_0_0_target_deno_1.default.createSubtleCryptoProvider();
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
(0, server_ts_1.serve)(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        return new Response("No signature", { status: 400 });
    }
    const body = await req.text();
    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret, undefined, cryptoProvider);
    }
    catch (err) {
        console.error(`Webhook Signature Verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // Basic logic: R$ 29,90 = 10 credits (Example mapping)
        // Ideally, pass metadata in the payment link: metadata: { credits: 10 }
        const email = session.customer_details?.email || session.customer_email;
        const amountPaid = session.amount_total; // in cents
        let creditsToAdd = 0;
        // Simple Tier Logic based on amount
        if (amountPaid >= 2900 && amountPaid < 5000)
            creditsToAdd = 10;
        else if (amountPaid >= 5000 && amountPaid < 10000)
            creditsToAdd = 20;
        else if (amountPaid >= 10000)
            creditsToAdd = 50;
        else
            creditsToAdd = 5; // Minimum fallback
        if (email && creditsToAdd > 0) {
            const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
            const supabase = (0, supabase_js_2_0_0_1.createClient)(supabaseUrl, supabaseKey);
            const { error } = await supabase.rpc('add_credits', {
                user_email: email,
                credits_amount: creditsToAdd
            });
            if (error) {
                console.error('Failed to add credits:', error);
                return new Response("Database Error", { status: 500 });
            }
            console.log(`Added ${creditsToAdd} credits to ${email}`);
        }
    }
    return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
    });
});
//# sourceMappingURL=index.js.map