import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
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
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            endpointSecret,
            undefined,
            cryptoProvider
        );
    } catch (err) {
        console.error(`Webhook Signature Verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;
        const amountPaid = session.amount_total;
        let creditsToAdd = 0;

        console.log(`Processing payment of ${amountPaid} for ${email}`);

        // Logic check: Accepts ANY payment > 0
        if (amountPaid > 0) creditsToAdd = 20;

        // Higher tiers
        if (amountPaid >= 3000) creditsToAdd = 50;
        if (amountPaid >= 10000) creditsToAdd = 100;

        if (email && creditsToAdd > 0) {
            const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
            const supabase = createClient(supabaseUrl, supabaseKey);

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
