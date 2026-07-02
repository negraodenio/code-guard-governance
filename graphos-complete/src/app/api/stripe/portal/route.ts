import { NextRequest, NextResponse } from "next/server";
import { stripe, getAbsoluteUrl } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .single();

        if (!profile?.stripe_customer_id) {
            return NextResponse.redirect(new URL("/pricing", req.url));
        }

        const return_url = getAbsoluteUrl("/dashboard", req.headers.get("origin") || undefined);

        const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url,
        });

        return NextResponse.redirect(session.url);
    } catch (error) {
        console.error("Stripe portal error:", error);
        return NextResponse.redirect(new URL("/dashboard?error=portal", req.url));
    }
}
