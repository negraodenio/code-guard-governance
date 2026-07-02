import type { Metadata } from "next";
import { Navbar } from "@/ui/Navbar";
import { Footer } from "@/ui/Footer";

export const metadata: Metadata = {
    title: "Enterprise Data Security — CouncilIA",
    description: "How CouncilIA protects your corporate data. Zero-training policy, GDPR-compliant, tenant-isolated, encrypted at rest and in transit.",
};

export default function SecurityPage() {
    return (
        <main className="bg-white text-neutral-900 min-h-screen">
            <Navbar />

            <section className="pt-32 pb-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <a href="/" className="text-sm text-neutral-400 hover:text-neutral-600 transition mb-6 inline-block">{"<-"} Back to home</a>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-6">
                        🔒 Enterprise Grade
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Data Security & Privacy</h1>
                    <p className="text-neutral-400 mb-4">Last updated: February 2025</p>
                    <p className="text-lg text-neutral-600 mb-12 leading-relaxed">
                        Your data is your competitive advantage. We treat it accordingly.
                        This page explains exactly how CouncilIA handles, protects, and isolates your corporate data — especially when using <strong>Custom Expert Personas</strong>.
                    </p>

                    <div className="prose prose-neutral max-w-none space-y-10 text-neutral-600 leading-relaxed">

                        {/* Zero Training - THE most important section */}
                        <Section title="1. Zero-Training Guarantee">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
                                <p className="text-emerald-800 font-semibold text-base mb-2">
                                    🚫 Your data is NEVER used to train AI models.
                                </p>
                                <p className="text-emerald-700 text-sm">
                                    Not ours. Not OpenAI{"'"}s. Not any third-party{"'"}s. Ever.
                                </p>
                            </div>
                            <ul className="list-disc ml-6 space-y-2">
                                <li>All AI API calls are made with <strong>training opt-out</strong> enabled (e.g., OpenAI{"'"}s <code className="bg-neutral-100 px-1 rounded text-sm">{"\""}store{"\""}: false</code> flag).</li>
                                <li>Uploaded documents are used <strong>exclusively</strong> for generating debate context within your session.</li>
                                <li>AI providers receive only the minimum context necessary for each round — never your full document library.</li>
                                <li>We do not aggregate, anonymize, or repurpose your corporate data for any other customer or internal use.</li>
                            </ul>
                        </Section>

                        <Section title="2. GDPR Compliance">
                            <p>CouncilIA is operated by CouncilIA Lda., an EU-based company subject to the General Data Protection Regulation (GDPR).</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-200">
                                            <th className="text-left py-2 pr-4 font-semibold text-neutral-900">Requirement</th>
                                            <th className="text-left py-2 font-semibold text-neutral-900">How We Comply</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        <tr><td className="py-2 pr-4 font-medium">Lawful Basis</td><td className="py-2">Contract performance (Art. 6(1)(b)) + Legitimate interest</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium">Data Minimization</td><td className="py-2">Only essential data collected; documents chunked and embedded, originals not permanently stored</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium">Right to Erasure</td><td className="py-2">Full account + all embeddings + all documents deleted within 30 days of request</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium">Right to Portability</td><td className="py-2">Export all session data, reports, and transcripts in JSON/PDF format</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium">Data Processing Agreement</td><td className="py-2">Available for Corporate plan customers upon request</td></tr>
                                        <tr><td className="py-2 pr-4 font-medium">Data Breach Notification</td><td className="py-2">72-hour notification to supervisory authority + affected users</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-4">Data Protection Contact: <strong>privacy@council-ia.com</strong></p>
                        </Section>

                        <Section title="3. Tenant Isolation">
                            <p>Every customer{"'"}s data is <strong>logically isolated</strong> at the database level:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Row-Level Security (RLS):</strong> PostgreSQL RLS policies enforce that users can only access their own data. This is enforced at the database engine level — not application code.</li>
                                <li><strong>Tenant ID binding:</strong> Every row in every table (sessions, embeddings, documents, personas) is bound to a <code className="bg-neutral-100 px-1 rounded text-sm">tenant_id</code>.</li>
                                <li><strong>Custom Expert isolation:</strong> Embeddings for your Custom Expert Persona are stored with your <code className="bg-neutral-100 px-1 rounded text-sm">persona_id</code> and <code className="bg-neutral-100 px-1 rounded text-sm">tenant_id</code>. Other tenants cannot query, access, or even know about your documents.</li>
                                <li><strong>No cross-contamination:</strong> AI debate context is assembled per-session and never shared between users or tenants.</li>
                            </ul>
                        </Section>

                        <Section title="4. Encryption">
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>In Transit:</strong> All data is transmitted over TLS 1.3 (HTTPS). API calls to AI providers use TLS-encrypted connections.</li>
                                <li><strong>At Rest:</strong> Database storage encrypted via Supabase (AES-256). Cache layer (Upstash Redis) encrypted at rest.</li>
                                <li><strong>Payments:</strong> Processed by Stripe (PCI-DSS Level 1 compliant). We never see, store, or process card numbers.</li>
                                <li><strong>Authentication:</strong> OAuth 2.0 via Google. Passwords are never stored in our system.</li>
                            </ul>
                        </Section>

                        <Section title="5. Data Routing & Sovereignty">
                            <p>CouncilIA uses multiple AI providers to power different council personas. We give you control over where your data goes:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Database:</strong> Supabase PostgreSQL hosted in <strong>EU (Frankfurt, Germany)</strong>.</li>
                                <li><strong>EU Sensitivity Mode:</strong> When enabled, prompts are routed exclusively to EU/US-based AI providers (Mistral France, OpenAI US, Google US). Non-EU providers are excluded.</li>
                                <li><strong>Standard Mode:</strong> Prompts may be routed to providers in US, EU, and Asia for best model performance.</li>
                                <li><strong>Custom Expert documents:</strong> Embeddings are stored exclusively in your EU-hosted database. They are <strong>never</strong> sent to AI providers — only the relevant text chunks are sent as context during a session.</li>
                            </ul>
                        </Section>

                        <Section title="6. Custom Expert Persona — Specific Safeguards">
                            <p>When you upload documents to train a Custom Expert Persona, additional protections apply:</p>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
                                <div className="flex items-start gap-3">
                                    <span className="text-blue-500 text-lg mt-0.5">→</span>
                                    <p className="text-blue-800 text-sm"><strong>Upload:</strong> Documents are chunked into segments and converted to mathematical vectors (embeddings). The original file content is processed in memory and not stored as raw files.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-blue-500 text-lg mt-0.5">→</span>
                                    <p className="text-blue-800 text-sm"><strong>Storage:</strong> Only embeddings (numerical vectors) and text chunks are stored in your tenant-isolated database. The embedding itself cannot be reverse-engineered back to the original document.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-blue-500 text-lg mt-0.5">→</span>
                                    <p className="text-blue-800 text-sm"><strong>Usage:</strong> During a debate, only the 5 most relevant text chunks are retrieved and sent as context. The AI never receives your full document library.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-blue-500 text-lg mt-0.5">→</span>
                                    <p className="text-blue-800 text-sm"><strong>Deletion:</strong> When you delete a Custom Expert Persona, all associated embeddings and document records are permanently deleted via database cascade. This is irreversible and complete.</p>
                                </div>
                            </div>
                        </Section>

                        <Section title="7. Data Retention & Deletion">
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Active account:</strong> Session transcripts, reports, and Custom Expert data are retained for as long as your account is active.</li>
                                <li><strong>Account deletion:</strong> All data (sessions, embeddings, personas, documents, payment metadata) is permanently deleted within 30 days.</li>
                                <li><strong>Custom Expert deletion:</strong> Immediate deletion of all embeddings and document records (cascade delete).</li>
                                <li><strong>Session expiry:</strong> Free tier sessions are auto-deleted after 90 days of inactivity.</li>
                                <li>We retain no backups of deleted data beyond the 30-day processing window.</li>
                            </ul>
                        </Section>

                        <Section title="8. Sub-Processors">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-200">
                                            <th className="text-left py-2 pr-4 font-semibold text-neutral-900">Provider</th>
                                            <th className="text-left py-2 pr-4 font-semibold text-neutral-900">Purpose</th>
                                            <th className="text-left py-2 font-semibold text-neutral-900">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        <tr><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Database, Auth</td><td className="py-2">EU (Frankfurt)</td></tr>
                                        <tr><td className="py-2 pr-4">Vercel</td><td className="py-2 pr-4">Hosting, Edge Functions</td><td className="py-2">Global CDN</td></tr>
                                        <tr><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">Payments</td><td className="py-2">US/EU</td></tr>
                                        <tr><td className="py-2 pr-4">Upstash</td><td className="py-2 pr-4">Redis Cache, QStash</td><td className="py-2">EU</td></tr>
                                        <tr><td className="py-2 pr-4">OpenAI</td><td className="py-2 pr-4">AI Model (GPT-4o)</td><td className="py-2">US</td></tr>
                                        <tr><td className="py-2 pr-4">Mistral</td><td className="py-2 pr-4">AI Model + Embeddings</td><td className="py-2">EU (France)</td></tr>
                                        <tr><td className="py-2 pr-4">Google</td><td className="py-2 pr-4">AI Model (Gemini)</td><td className="py-2">US</td></tr>
                                        <tr><td className="py-2 pr-4">OpenRouter</td><td className="py-2 pr-4">AI Model Routing</td><td className="py-2">US</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </Section>

                        <Section title="9. Security Practices">
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Access control:</strong> Internal access to production data requires multi-factor authentication and is logged.</li>
                                <li><strong>API security:</strong> All API endpoints are authenticated via Supabase JWT tokens with short expiry times.</li>
                                <li><strong>Rate limiting:</strong> API endpoints are rate-limited to prevent abuse and DDoS.</li>
                                <li><strong>Dependency monitoring:</strong> Automated vulnerability scanning for all npm dependencies.</li>
                                <li><strong>Infrastructure:</strong> Serverless architecture (Vercel + Supabase) — no long-running servers to compromise.</li>
                            </ul>
                        </Section>

                        <Section title="10. Contact & Incident Response">
                            <p>For security concerns, data requests, or to report a vulnerability:</p>
                            <ul className="list-disc ml-6 space-y-2">
                                <li><strong>Security:</strong> security@council-ia.com</li>
                                <li><strong>Privacy / GDPR:</strong> privacy@council-ia.com</li>
                                <li><strong>DPA requests (Corporate):</strong> legal@council-ia.com</li>
                            </ul>
                            <p className="mt-3">
                                We acknowledge security reports within 24 hours and aim to resolve critical issues within 72 hours.
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
