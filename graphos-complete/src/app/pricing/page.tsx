import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/ui/Navbar";
import { Footer } from "@/ui/Footer";
import { PricingCards } from "./PricingCards";
import Link from 'next/link';

export const metadata: Metadata = {
    title: "Pricing — CouncilIA",
    description: "Simple, transparent pricing. Start free with 2 sessions, scale when ready.",
};

export default function PricingPage() {
    return (
        <main className="bg-bg text-text min-h-screen relative overflow-hidden">
            {/* Grid Background */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            <Navbar />

            <section className="pt-40 pb-20 px-6 relative z-10">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal/20 bg-teal-dim text-teal text-[10px] font-bold uppercase tracking-widest mb-6">
                        Transparent Economics
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold font-syne tracking-tighter mb-6">
                        Simple, transparent pricing.
                    </h1>
                    <p className="text-lg text-muted-2 mb-16 max-w-2xl mx-auto font-light leading-relaxed">
                        Start with 2 free sessions. Upgrade when your decisions need the full
                        power of 7 AI models debating in real-time.
                    </p>

                    <Suspense fallback={<div className="h-96 flex items-center justify-center text-muted">Loading plans...</div>}>
                        <PricingCards />
                    </Suspense>

                    {/* Compare plans */}
                    <div className="mt-32 max-w-4xl mx-auto">
                        <h2 className="text-3xl font-extrabold font-syne tracking-tighter mb-12">Compare in detail</h2>
                        <div className="premium-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="py-6 px-6 font-bold text-text uppercase text-[10px] tracking-widest">Feature</th>
                                            <th className="py-6 px-6 font-bold text-text text-center uppercase text-[10px] tracking-widest">Free</th>
                                            <th className="py-6 px-6 font-bold text-text text-center uppercase text-[10px] tracking-widest">Founder</th>
                                            <th className="py-6 px-6 font-bold text-text text-center uppercase text-[10px] tracking-widest">Operator</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-light">
                                        <TableRow label="Sessions/month" free="2" founder="30" operator="300" />
                                        <TableRow label="Cost per session" free="—" founder="€0.97" operator="€0.33" />
                                        <TableRow label="7 AI models" free="✓" founder="✓" operator="✓" isCheck />
                                        <TableRow label="3-round debate" free="✓" founder="✓" operator="✓" isCheck />
                                        <TableRow label="Full PDF reports" free="✕" founder="✓" operator="✓" isCheck />
                                        <TableRow label="Score evolution" free="✕" founder="✓" operator="✓" isCheck />
                                        <TableRow label="Live streaming" free="✕" founder="✓" operator="✓" isCheck />
                                        <TableRow label="GitHub integration" free="✕" founder="✓" operator="✓" isCheck />
                                        <TableRow label="SSO + audit logs" free="✕" founder="✕" operator="✓" isCheck />
                                        <TableRow label="Custom personas" free="✕" founder="✕" operator="✓" isCheck />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Why this price? */}
                    <div className="mt-32 max-w-3xl mx-auto text-left">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-extrabold font-syne tracking-tighter mb-4">Why this price?</h2>
                            <p className="text-muted-2 font-light">We believe in radical transparency. No hidden markups.</p>
                        </div>

                        <div className="premium-card overflow-hidden p-0">
                            <div className="p-10 border-b border-border">
                                <h3 className="font-bold text-muted uppercase text-[10px] tracking-widest mb-8">Direct Operational Costs</h3>
                                <div className="space-y-6">
                                    <CostRow label="6 Experts (Multi-Model)" sub="DeepSeek, Qwen, Mistral, Llama, Gemini" cost="~€0.06" />
                                    <CostRow label="1 Head Judge" sub="GPT-4o latest reasoning model" cost="~€0.05" />
                                    <CostRow label="Infrastructure" sub="Sovereign routing & storage" cost="~€0.002" />
                                    <div className="pt-6 border-t border-border flex justify-between items-center">
                                        <span className="font-bold text-lg">Total Baseline AI Cost</span>
                                        <span className="font-syne font-extrabold text-xl text-teal">~€0.11</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-10 bg-surface-2/50">
                                <h3 className="font-bold text-muted uppercase text-[10px] tracking-widest mb-6">Sustainable Software</h3>
                                <p className="text-sm text-muted-2 leading-relaxed mb-6">
                                    We don't hide fees behind "contact sales" or train AI on your data. 
                                    Our margins fund development, 24/7 reliability, and continuous protocol innovation.
                                </p>
                                <div className="flex items-center gap-3 p-4 bg-bg rounded-xl border border-border">
                                    <div className="w-2 h-2 rounded-full bg-teal"></div>
                                    <p className="text-xs text-muted font-medium uppercase tracking-widest">No VC-funded growth traps. Just stable, premium intelligence.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Common questions */}
                    <div className="mt-32 max-w-2xl mx-auto text-left">
                        <h2 className="text-3xl font-extrabold font-syne tracking-tighter mb-12 text-center">Questions</h2>
                        <div className="space-y-10">
                            <FAQItem
                                q="What counts as one session?"
                                a="One complete 3-round debate + judicial verdict. Starting a new topic or re-running a prompt counts as one session."
                            />
                            <FAQItem
                                q="Is my data used to train AI models?"
                                a="Never. We use Zero Data Retention (ZDR) endpoints. Your strategy is your property alone."
                            />
                            <FAQItem
                                q="Can I cancel anytime?"
                                a="Yes. Manage your subscription through the billing portal. You keep access until the end of your current period."
                            />
                        </div>
                    </div>

                    {/* Data & Privacy */}
                    <div className="mt-32 premium-card p-12 text-left bg-surface-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal opacity-[0.05] blur-3xl"></div>
                        <h2 className="text-2xl font-extrabold font-syne tracking-tight mb-8">Data Sovereignty</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 text-sm">
                            <DataPoint label="Storage" value="Supabase EU (Frankfurt)" />
                            <DataPoint label="AI Nodes" value="Mistral (FR), Azure (NL), OpenRouter" />
                            <DataPoint label="Encryption" value="AES-256 at rest, TLS 1.3 in transit" />
                            <DataPoint label="Retention" value="Hard deletion 30 days after account closure" />
                        </div>
                        <div className="mt-12 pt-8 border-t border-border flex gap-6 text-[10px] uppercase tracking-widest font-bold">
                            <Link href="/privacy" className="text-muted hover:text-teal transition">Privacy Policy</Link>
                            <Link href="/terms" className="text-muted hover:text-teal transition">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

function TableRow({ label, free, founder, operator, isCheck = false }: any) {
    return (
        <tr className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
            <td className="py-5 px-6 text-muted-2">{label}</td>
            <td className={`py-5 px-6 text-center ${isCheck && free === '✓' ? 'text-teal font-bold' : 'text-muted'}`}>{free}</td>
            <td className={`py-5 px-6 text-center ${isCheck && founder === '✓' ? 'text-teal font-bold' : 'text-text font-medium'}`}>{founder}</td>
            <td className={`py-5 px-6 text-center ${isCheck && operator === '✓' ? 'text-teal font-bold' : 'text-text font-medium'}`}>{operator}</td>
        </tr>
    );
}

function CostRow({ label, sub, cost }: any) {
    return (
        <div className="flex justify-between items-center text-sm">
            <div className="flex flex-col">
                <span className="text-text font-medium">{label}</span>
                <span className="text-muted text-[10px] uppercase tracking-widest mt-1">{sub}</span>
            </div>
            <span className="font-mono text-text">{cost}</span>
        </div>
    );
}

function FAQItem({ q, a }: { q: string; a: string }) {
    return (
        <div className="group">
            <h4 className="font-bold text-text mb-3 group-hover:text-teal transition-colors">{q}</h4>
            <p className="text-sm text-muted-2 leading-relaxed font-light">{a}</p>
        </div>
    );
}

function DataPoint({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <span className="text-muted uppercase text-[9px] tracking-[0.2em] font-bold">{label}</span>
            <p className="font-light">{value}</p>
        </div>
    );
}