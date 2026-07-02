import type { Metadata } from "next";
import { Navbar } from "@/ui/Navbar";
import { Footer } from "@/ui/Footer";

export const metadata: Metadata = {
    title: "Privacy Policy — CouncilIA",
    description: "How CouncilIA collects, processes, and protects your data. GDPR-compliant.",
};

export default function PrivacyPage() {
    return (
        <main className="bg-white text-neutral-900 min-h-screen">
            <Navbar />

            <section className="pt-32 pb-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <a href="/" className="text-sm text-neutral-400 hover:text-neutral-600 transition mb-6 inline-block">{"<-"} Back to home</a>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
                    <p className="text-neutral-400 mb-12">Last updated: January 2025</p>

                    <div className="prose prose-neutral max-w-none space-y-8 text-neutral-600 leading-relaxed">

                        <Section title="1. Who We Are">
                            <p>
                                CouncilIA is operated by CouncilIA Lda. ({'"'}we{'"'}, {'"'}us{'"'}, {'"'}our{'"'}).
                                We are an EU-based company committed to GDPR compliance.
                            </p>
                            <p>Contact: <strong>privacy@council-ia.com</strong></p>
                        </Section>

                        <Section title="2. What Data We Collect">
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Account data:</strong> Email address and name (via Google OAuth through Supabase Auth).</li>
                                <li><strong>Session data:</strong> The prompts you submit, AI-generated debate transcripts, and scores.</li>
                                <li><strong>Usage data:</strong> Session count, plan tier, timestamps.</li>
                                <li><strong>Payment data:</strong> Processed by Stripe. We never see or store your card number.</li>
                                <li><strong>Technical data:</strong> IP address (for geo-routing), browser type, anonymized analytics.</li>
                            </ul>
                        </Section>

                        <Section title="3. How We Use Your Data">
                            <ul className="list-disc ml-6 space-y-2">
                                <li>To run AI debate sessions and generate reports.</li>
                                <li>To manage your account and subscription.</li>
                                <li>To route requests to appropriate AI providers (EU geo-routing for data sovereignty).</li>
                                <li>To improve the ACE Engine and debate quality.</li>
                                <li>We do <strong>NOT</strong> sell your data. Ever.</li>
                            </ul>
                        </Section>

                        <Section title="4. AI Providers & Data Routing">
                            <p>
                                CouncilIA sends your prompts to multiple AI providers via OpenRouter and direct APIs:
                                OpenAI (USA), Google Gemini (USA), DeepSeek (China), Qwen/Alibaba (China),
                                Moonshot/Kimi (China), Mistral (France), Meta/Llama (USA).
                            </p>
                            <p>
                                <strong>EU Data Sovereignty:</strong> If you enable the EU-only toggle or if we detect
                                sensitive data (PII, regulated content), we automatically route away from
                                Chinese-origin models and use only EU/US providers.
                            </p>
                        </Section>

                        <Section title="5. Data Storage">
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Database:</strong> Supabase (PostgreSQL), hosted in EU (Frankfurt).</li>
                                <li><strong>Auth:</strong> Supabase Auth with Google OAuth.</li>
                                <li><strong>Payments:</strong> Stripe (PCI-DSS Level 1 compliant).</li>
                                <li><strong>Cache:</strong> Upstash Redis (serverless, encrypted at rest).</li>
                            </ul>
                        </Section>

                        <Section title="6. Your Rights (GDPR)">
                            <p>Under GDPR, you have the right to:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Access:</strong> Request a copy of all data we hold about you.</li>
                                <li><strong>Rectification:</strong> Correct inaccurate data.</li>
                                <li><strong>Erasure:</strong> Request deletion of your account and all associated data.</li>
                                <li><strong>Portability:</strong> Receive your data in a machine-readable format.</li>
                                <li><strong>Objection:</strong> Object to processing for specific purposes.</li>
                            </ul>
                            <p>To exercise any right, email: <strong>privacy@council-ia.com</strong></p>
                            <p>We respond within 30 days as required by GDPR.</p>
                        </Section>

                        <Section title="7. Data Retention">
                            <p>
                                Session transcripts are retained for as long as your account is active.
                                Upon account deletion, all data is permanently removed within 30 days.
                                Anonymized, aggregated analytics may be retained indefinitely.
                            </p>
                        </Section>

                        <Section title="8. Cookies">
                            <p>
                                We use only essential cookies for authentication (Supabase session token).
                                We do not use tracking cookies, advertising cookies, or third-party analytics
                                that require cookie consent.
                            </p>
                        </Section>

                        <Section title="9. Changes">
                            <p>
                                We may update this policy. Material changes will be notified via email.
                                Continued use after notification constitutes acceptance.
                            </p>
                        </Section>

                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">{title}</h2>
            <div className="space-y-3">{children}</div>
        </div>
    );
}