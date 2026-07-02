import type { Metadata } from "next";
import { Navbar } from "@/ui/Navbar";
import { Footer } from "@/ui/Footer";
import Link from 'next/link';

export const metadata: Metadata = {
    title: "Methodology — CouncilIA Scientific Protocol",
    description: "Explore the scientific foundations of CouncilIA's AI-DOS. Learn about Adversarial Consensus, Multi-Agent Deliberation, and Deterministic Governance.",
};

export default function MethodologyPage() {
    return (
        <main className="bg-bg text-text min-h-screen relative overflow-hidden">
            {/* Grid Background */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-48 pb-24 px-6 z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal/20 bg-teal-dim text-teal text-[10px] font-bold uppercase tracking-widest mb-10">
                        Scientific Protocol v14.0.0 — ACE Engine
                    </div>
                    <h1 className="text-5xl md:text-8xl font-extrabold font-syne tracking-tighter mb-8 leading-[0.95]">
                        The Science of<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal to-indigo">
                            Strategic Stability.
                        </span>
                    </h1>
                    <p className="text-xl text-muted-2 max-w-2xl mx-auto leading-relaxed font-light">
                        CouncilIA replaces "AI chats" with a structured adversarial protocol. We don't just ask an AI; we simulate a conflict of perspectives to find the truth.
                    </p>
                </div>
            </section>

            {/* The 3-Round Protocol */}
            <section className="py-32 px-6 relative z-10 border-t border-border">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
                        <div className="max-w-xl text-left">
                            <h2 className="text-4xl md:text-5xl font-extrabold font-syne tracking-tighter mb-6 text-text">The Protocol Cycle.</h2>
                            <p className="text-muted-2 font-light">Every simulation follows a strict 3-round adversarial sequence to eliminate hallucinations and group-think.</p>
                        </div>
                        <div className="hidden md:block text-[10px] font-bold text-teal uppercase tracking-[0.3em]">
                            Deterministic / Non-Recursive
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ProtocolStep 
                            num="01"
                            title="Adversarial Opening"
                            desc="Agents are tasked to isolate 'fatal failure' assumptions. They must identify why the idea will fail before they are allowed to support it."
                            badge="R1: Isolation"
                        />
                        <ProtocolStep 
                            num="02"
                            title="Cross-Examination"
                            desc="Experts must address the dissent points raised in R1. Real-time deliberation forces agents to defend their logic against opposing models."
                            badge="R2: Deliberation"
                        />
                        <ProtocolStep 
                            num="03"
                            title="Recursive Audit"
                            desc="The Arbitrator synthesizes only the arguments that survived R1/R2. Hallucinations are discarded; only the stable core remains."
                            badge="R3: Synthesis"
                        />
                    </div>
                </div>
            </section>

            {/* Scientific Components */}
            <section className="py-32 px-6 bg-surface relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="premium-card p-10 bg-bg">
                                <h4 className="text-teal font-bold text-[10px] uppercase tracking-widest mb-4">ACE Engine</h4>
                                <p className="text-2xl font-extrabold font-syne tracking-tight mb-4 text-text">Adversarial Consensus</p>
                                <p className="text-sm text-muted-2 font-light leading-relaxed">
                                    Inspired by Game Theory, our engine measures the "tension" between models. High tension indicates hidden strategic risk.
                                </p>
                            </div>
                            <div className="premium-card p-10 bg-bg">
                                <h4 className="text-indigo font-bold text-[10px] uppercase tracking-widest mb-4">BTS Proxy</h4>
                                <p className="text-2xl font-extrabold font-syne tracking-tight mb-4 text-text">Bayesian Truth Serum</p>
                                <p className="text-sm text-muted-2 font-light leading-relaxed">
                                    We filter for "surprisingly common" answers to separate true expert insights from standard LLM training data noise.
                                </p>
                            </div>
                        </div>
                        <div className="text-left">
                            <h2 className="text-4xl md:text-5xl font-extrabold font-syne tracking-tighter mb-8 leading-tight text-text">Built on Peer-Reviewed Decision Science.</h2>
                            <p className="text-muted-2 text-lg mb-10 leading-relaxed font-light">
                                CouncilIA operationalizes established principles from Multi-Agent Systems (MAS) and Rational Choice Theory. We use 7 different models (GPT-4o, Claude 3.5, Gemini 1.5, Llama 3) to ensure total cognitive diversity.
                            </p>
                            <div className="space-y-4">
                                <Metric label="Sync Stability" value="0.92" />
                                <Metric label="Bias Correction" value="-42%" />
                                <Metric label="Protocol Version" value="v14.0.0" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Practice vs Theory */}
            <section className="py-32 px-6 relative z-10 border-t border-border">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-4xl font-extrabold font-syne tracking-tighter mb-16 text-text">From Opinion to Verified Intel.</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="premium-card p-10 text-left border-red-500/20">
                            <h4 className="text-red-400 font-bold text-[10px] uppercase tracking-widest mb-6">Before CouncilIA</h4>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-sm text-muted-2 font-light line-through decoration-red-500/30">Recursive, biased meetings</li>
                                <li className="flex items-center gap-3 text-sm text-muted-2 font-light line-through decoration-red-500/30">Confirmation bias in leadership</li>
                                <li className="flex items-center gap-3 text-sm text-muted-2 font-light line-through decoration-red-500/30">No clear accountability trail</li>
                                <li className="flex items-center gap-3 text-sm text-muted-2 font-light line-through decoration-red-500/30">"Gut feel" strategic bets</li>
                            </ul>
                        </div>
                        <div className="premium-card p-10 text-left border-teal/20">
                            <h4 className="text-teal font-bold text-[10px] uppercase tracking-widest mb-6">After CouncilIA</h4>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-sm text-text font-medium"><span className="text-teal">✓</span> 15-minute adversarial audit</li>
                                <li className="flex items-center gap-3 text-sm text-text font-medium"><span className="text-teal">✓</span> Measurable Consensus Stability</li>
                                <li className="flex items-center gap-3 text-sm text-text font-medium"><span className="text-teal">✓</span> Complete Decision Lineage</li>
                                <li className="flex items-center gap-3 text-sm text-text font-medium"><span className="text-teal">✓</span> Audit-ready strategic defense</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Outcomes Summary */}
            <section className="py-32 px-6 bg-surface-2 relative z-10">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl font-extrabold font-syne tracking-tighter mb-16 text-text uppercase">Outcome Gallery.</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Outcome 
                            title="FinTech Acquisition"
                            verdict="REJECTED"
                            result="Saved €12M"
                            desc="Identified tech debt that single-agent analysis missed."
                            color="red-400"
                        />
                        <Outcome 
                            title="Global Expansion"
                            verdict="VALIDATED"
                            result="88% Confidence"
                            desc="Confirmed Portugal as the optimal entry point over Brazil."
                            color="teal"
                        />
                        <Outcome 
                            title="Product Pivot"
                            verdict="CONDITIONAL"
                            result="Pivot Approved"
                            desc="Required 20% holdback based on risk mitigation plan."
                            color="indigo"
                        />
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-40 px-6 relative z-10 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-5xl md:text-7xl font-extrabold font-syne tracking-tighter mb-10 text-text leading-[0.95]">
                        Simulate before you commit.
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link href="/login" className="premium-button px-10 py-5 rounded-2xl font-bold text-sm uppercase tracking-widest">
                            Run Simulation →
                        </Link>
                        <Link href="/pricing" className="px-10 py-5 border border-border-hover hover:bg-surface-2 rounded-2xl font-bold text-sm uppercase tracking-widest text-text transition-all">
                            View Plans
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

function ProtocolStep({ num, title, desc, badge }: any) {
    return (
        <div className="premium-card p-10 flex flex-col group hover:border-teal/30 transition-all">
            <div className="flex justify-between items-start mb-8">
                <div className="text-4xl font-extrabold font-syne text-muted/20">{num}</div>
                <div className="px-3 py-1 rounded bg-surface-2 border border-border text-[9px] font-bold text-muted uppercase tracking-widest">{badge}</div>
            </div>
            <h3 className="text-2xl font-extrabold font-syne mb-4 uppercase tracking-tighter text-text">{title}</h3>
            <p className="text-muted-2 text-sm leading-relaxed font-light">{desc}</p>
        </div>
    );
}

function Metric({ label, value }: any) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{label}</span>
            <span className="text-lg font-extrabold font-syne text-text">{value}</span>
        </div>
    );
}

function Outcome({ title, verdict, result, desc, color }: any) {
    return (
        <div className="premium-card p-10 text-left bg-bg hover:border-border-hover transition-all">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h4 className="font-bold text-text mb-1">{title}</h4>
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `var(--${color.split('-')[0]})` }}>{verdict}</div>
                </div>
                <div className="text-lg font-extrabold font-syne text-text">{result}</div>
            </div>
            <p className="text-xs text-muted-2 font-light leading-relaxed">{desc}</p>
        </div>
    );
}