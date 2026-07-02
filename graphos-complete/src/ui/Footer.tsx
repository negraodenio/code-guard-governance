'use client';

import Link from 'next/link';

export function Footer() {
    return (
        <footer className="py-24 px-8 border-t border-border bg-bg relative overflow-hidden">
            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] pointer-events-none"></div>
            
            <div className="max-w-[1160px] mx-auto relative z-10">
                {/* Top row */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-16 mb-20">
                    {/* Company info */}
                    <div className="space-y-8 max-w-sm">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="size-9 rounded-xl bg-gradient-to-br from-teal to-indigo flex items-center justify-center font-syne font-extrabold text-[15px] text-white shadow-lg">
                                C
                            </div>
                            <span className="font-syne font-extrabold text-xl tracking-tighter text-text group-hover:text-teal transition-colors">
                                CouncilIA
                            </span>
                        </Link>
                        
                        <p className="text-sm text-muted-2 font-light leading-relaxed">
                            Strategic Intelligence Layer for board-level decision support. Part of the Antigravity Ecosystem. Built in Lisbon, Portugal for high-stakes decision validation.
                        </p>
                        
                        <div className="space-y-4 pt-4">
                            <div className="flex items-start gap-3 text-xs text-muted leading-relaxed">
                                <span className="text-base">🇵🇹</span>
                                <span>Av. Álvares Cabral 13, 1250-015 Lisboa, Portugal</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted">
                                <svg className="size-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                <a href="mailto:support@councilia.com" className="hover:text-text transition-colors">
                                    support@councilia.com
                                </a>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted">
                                <svg className="size-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                <span>DPO: <a href="mailto:dpo@ia4all.eu" className="hover:text-text transition-colors">dpo@ia4all.eu</a></span>
                            </div>
                        </div>
                    </div>

                    {/* Links Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-16 gap-y-12">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Platform</h4>
                            <div className="flex flex-col gap-4 text-sm text-muted-2 font-light">
                                <Link href="/#how-it-works" className="hover:text-teal transition-colors">Process</Link>
                                <Link href="/#the-council" className="hover:text-teal transition-colors">The Council</Link>
                                <Link href="/methodology" className="hover:text-teal transition-colors">Methodology</Link>
                                <Link href="/pricing" className="hover:text-teal transition-colors">Pricing</Link>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Resources</h4>
                            <div className="flex flex-col gap-4 text-sm text-muted-2 font-light">
                                <Link href="#" className="hover:text-teal transition-colors">Documentation</Link>
                                <Link href="#" className="hover:text-teal transition-colors">Case Studies</Link>
                                <Link href="#" className="hover:text-teal transition-colors">Research Papers</Link>
                                <Link href="#" className="hover:text-teal transition-colors">API Reference</Link>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Legal</h4>
                            <div className="flex flex-col gap-4 text-sm text-muted-2 font-light">
                                <Link href="/privacy" className="hover:text-teal transition-colors">Privacy Policy</Link>
                                <Link href="/terms" className="hover:text-teal transition-colors">Terms of Service</Link>
                                <Link href="/security" className="hover:text-teal transition-colors">Data Security</Link>
                                <Link href="/cookies" className="hover:text-teal transition-colors">Cookies Policy</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom row */}
                <div className="border-t border-border pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6 text-[10px] text-muted uppercase tracking-widest font-bold">
                        <span>© {new Date().getFullYear()} CouncilIA Strategic Intelligence.</span>
                        <span className="hidden md:block opacity-30">|</span>
                        <span className="hidden md:block">Part of Antigravity Labs.</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted">
                        <span className="flex items-center gap-2">
                            Founded by{" "}
                            <a href="https://linkedin.com/in/denionegrao" target="_blank" rel="noopener noreferrer" className="text-text font-bold hover:text-teal transition-colors">
                                Denio Negrao
                            </a>
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
