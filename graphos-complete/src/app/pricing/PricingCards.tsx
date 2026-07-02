"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Source of Truth: Plans ──────────────────────────────────────────────────
// These map 1:1 to the Stripe products and to src/config/limits.ts PlanType.
// free → no stripe product, routes to /login (2 sessions/mo)
// pro  → NEXT_PUBLIC_STRIPE_PRO_PRICE_ID  (30 sessions/mo, €29/mo)
// team → NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID (300 sessions/mo, €199/mo)
const plans = [
    {
        name: "Free",
        planKey: "free",
        price: "0",
        period: "",
        description: "Validate your first ideas",
        features: [
            "2 sessions / month",
            "Full 6-Agent Council",
            "3-round debate",
            "Consensus score",
        ],
        cta: "Start Free",
        href: "/login",
        highlighted: false,
        priceId: null as string | null,
    },
    {
        name: "Founder",
        planKey: "pro",
        price: "29",
        period: "/month",
        description: "Validate your next big move",
        features: [
            "30 sessions / month",
            "Full 6-Agent Council",
            "3-round debate",
            "Full PDF reports",
            "Score tracking",
            "Priority support",
        ],
        cta: "Start Founder",
        href: null as string | null,
        highlighted: false,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || null,
    },
    {
        name: "Operator",
        planKey: "team",
        price: "199",
        period: "/month",
        unitPrice: "€0.66 per session",
        description: "Enterprise decision support",
        features: [
            "300 sessions / month",
            "The 7th Expert (Your Data)",
            "Real-time Intervention",
            "Exportable PDF Reports",
            "Direct model calibration",
            "API & Webhooks",
            "Everything in Founder",
        ],
        cta: "Start Operator",
        href: null as string | null,
        highlighted: true,
        priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || null,
    },
];

export function PricingCards() {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleCheckout = useCallback(async (priceId: string, planKey: string, planName: string) => {
        setLoading(planName);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // planKey ('pro' | 'team') maps exactly to limits.ts PlanType
                body: JSON.stringify({ priceId, planName: planKey }),
            });

            if (res.status === 401) {
                router.push(`/login?returnTo=/pricing&checkout=${planName.toLowerCase()}`);
                return;
            }

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (error) {
            console.error("Checkout error:", error);
            alert("Erro ao processar pagamento. Tente novamente.");
        } finally {
            setLoading(null);
        }
    }, [router]);

    // Auto-trigger checkout when returning from login with ?checkout=<planName>
    useEffect(() => {
        const checkoutPlan = searchParams.get("checkout");
        if (!checkoutPlan) return;

        const plan = plans.find(p => p.name.toLowerCase() === checkoutPlan.toLowerCase());
        if (plan?.priceId) {
            const timer = setTimeout(() => {
                handleCheckout(plan.priceId!, plan.planKey, plan.name);
                window.history.replaceState(
                    { ...window.history.state, as: window.location.pathname, url: window.location.pathname },
                    "",
                    window.location.pathname
                );
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, handleCheckout]);

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`rounded-2xl p-8 text-left flex flex-col ${
                            plan.highlighted
                                ? "border-2 border-neutral-900 shadow-lg relative"
                                : "border border-neutral-200"
                        }`}
                    >
                        {plan.highlighted && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs px-4 py-1 rounded-full">
                                Most popular
                            </span>
                        )}

                        <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                        <p className="text-sm text-neutral-400 mb-4">{plan.description}</p>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold">
                                    {plan.price === "0" ? "Free" : `€${plan.price}`}
                                </span>
                                {plan.period && (
                                    <span className="text-neutral-400 text-sm">{plan.period}</span>
                                )}
                            </div>
                            {"unitPrice" in plan && plan.unitPrice && (
                                <div className="text-xs text-emerald-600 font-medium mt-1">
                                    {plan.unitPrice}
                                </div>
                            )}
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            {plan.features.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                                    <svg
                                        className="w-4 h-4 text-emerald-500 shrink-0"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {plan.href ? (
                            // Free plan — direct link, no Stripe
                            <a
                                href={plan.href}
                                className={`block text-center py-3 rounded-lg text-sm font-medium transition ${
                                    plan.highlighted
                                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                }`}
                            >
                                {plan.cta}
                            </a>
                        ) : (
                            // Paid plans — Stripe checkout
                            <button
                                onClick={() =>
                                    plan.priceId && handleCheckout(plan.priceId, plan.planKey, plan.name)
                                }
                                disabled={loading === plan.name || !plan.priceId}
                                className={`block w-full text-center py-3 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                                    plan.highlighted
                                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                }`}
                            >
                                {loading === plan.name ? "Redirecting..." : plan.cta}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}