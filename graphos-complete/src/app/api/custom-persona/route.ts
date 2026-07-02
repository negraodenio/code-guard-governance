import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — List user's custom personas
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: personas, error } = await supabase
        .from("custom_personas")
        .select(`
            *,
            custom_persona_documents(id, filename, file_type, chunk_count, status, created_at)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ personas: personas || [] });
}

// POST — Create a new custom persona
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, role, description, color, emoji } = body;

        console.log(`[Custom Persona API] Create attempt by user ${user.id}`, { name, role });

        if (!name || !role) {
            return NextResponse.json({ error: "Name and role are required" }, { status: 400 });
        }

        // Get tenant_id from user metadata or profiles
        const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (profileErr) {
            console.error("[Custom Persona API] Profile fetch error:", profileErr);
        }

        const tenantId = profile?.tenant_id || user.id;
        console.log(`[Custom Persona API] User: ${user.id}, Tenant: ${tenantId}`);

        // 1. Get subscription for gating using ADMIN client to bypass RLS
        const adminSupabase = createAdminClient();
        const { data: sub, error: subErr } = await adminSupabase
            .from("subscriptions")
            .select("plan")
            .eq("tenant_id", tenantId)
            .maybeSingle();

        if (subErr) {
            console.error("[Custom Persona API] Admin Subscription check error:", subErr);
        }

        const plan = (sub?.plan || 'free').toLowerCase();
        console.log(`[Custom Persona API] Resolved plan: ${plan}`);

        // Note: Stripe 'team' plan corresponds to the 'Corporate' tier in UI
        if (plan !== 'team' && plan !== 'unlimited' && plan !== 'corporate') {
            console.log(`[Custom Persona API] Plan ${plan} not allowed for custom personas`);
            return NextResponse.json({
                error: "The 7th Protocol (Custom Experts) is exclusive to the Corporate plan. Please upgrade to unlock proprietary data training.",
                code: 'UPGRADE_REQUIRED'
            }, { status: 403 });
        }

        // 2. Check persona count limits using the normal authenticated client (safeguards against missing service_role grants)
        const { data: existing, error: countErr } = await supabase
            .from("custom_personas")
            .select("id")
            .eq("user_id", user.id);

        if (countErr) {
            console.error("[Custom Persona API] Admin Count check error:", countErr);
            return NextResponse.json({
                error: "Internal error validating account limits.",
                details: countErr.message
            }, { status: 500 });
        }

        const count = existing?.length || 0;
        console.log(`[Custom Persona API] Current persona count for ${plan} user: ${count}`);

        if (count >= 10) { // Limit for Team plan
            return NextResponse.json({ error: "Maximum personas reached (limit: 10). Delete old ones to create new." }, { status: 403 });
        }

        const { data: persona, error } = await supabase
            .from("custom_personas")
            .insert({
                tenant_id: tenantId,
                user_id: user.id,
                name,
                role: role || "Internal Strategic Advisor",
                description: description || "",
                color: color || "#6366f1",
                emoji: emoji || "🏢",
            })
            .select()
            .single();

        if (error) {
            console.error("[Custom Persona API] Insert error:", error);
            return NextResponse.json({ error: `Failed to insert persona: ${error.message}` }, { status: 500 });
        }

        console.log(`[Custom Persona API] Successfully created persona: ${persona.id}`);
        return NextResponse.json({ persona }, { status: 201 });

    } catch (err: any) {
        console.error("[Custom Persona API] Fatal error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

// DELETE — Delete a persona by ID (cascades to docs + embeddings)
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get("id");

    if (!personaId) {
        return NextResponse.json({ error: "Persona ID required" }, { status: 400 });
    }

    const { error } = await supabase
        .from("custom_personas")
        .delete()
        .eq("id", personaId)
        .eq("user_id", user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Persona and all associated data deleted" });
}
