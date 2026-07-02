'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPageV6() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-cyan-500/10 rounded flex items-center justify-center border border-cyan-500/20">
              <span className="text-cyan-400 font-bold">C</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white uppercase">Council<span className="text-cyan-400">IA</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#problem" className="hover:text-cyan-400 transition-colors">Problem</a>
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">Protocol</a>
            <a href="#compliance" className="hover:text-cyan-400 transition-colors">Compliance</a>
            <a href="#example" className="hover:text-cyan-400 transition-colors">Live Case</a>
            <Link href="/login" className="text-white bg-cyan-600 hover:bg-cyan-500 px-4 py-1.5 rounded-md transition-all shadow-lg shadow-cyan-900/20 text-center">Analyze Your Scenario</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            CouncilIA v7.0 — Global Decision Intelligence
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1] uppercase italic">
            Decisões Críticas <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Sem Margem de Erro.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Transforme complexidade institucional em decisões auditáveis e defensíveis. 
            <span className="block mt-2 text-cyan-400 font-bold uppercase tracking-widest text-sm">✓ 100% Compliance: LGPD, GDPR & AI ACT</span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-cyan-500 text-black rounded-lg font-bold text-lg hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 text-center">
              Analyze Your Scenario — Free
            </Link>
            <a href="#example" className="w-full sm:w-auto px-8 py-4 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-white rounded-lg font-bold text-lg transition-all active:scale-95 text-center">
              View Real Example
            </a>
          </div>
          
          <p className="mt-8 text-xs font-mono text-slate-500 uppercase tracking-widest">
            Used by research institutions · healthcare systems · government agencies
          </p>
        </div>
      </section>

      <section className="border-y border-white/5 bg-slate-950/50 backdrop-blur-sm py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-[0.3em] font-black">Certificações & Conformidade Institucional</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24">
            <div className="flex items-center gap-3 group">
              <div className="size-12 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30 group-hover:bg-green-500/20 transition-all">
                <span className="material-symbols-outlined text-green-400 text-2xl select-none">verified</span>
              </div>
              <div>
                <div className="text-white font-black text-xs uppercase tracking-tighter">LGPD</div>
                <div className="text-[10px] text-slate-500 font-medium">Lei 13.709/18 — Brasil</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 group">
              <div className="size-12 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-500/20 transition-all">
                <span className="material-symbols-outlined text-blue-400 text-2xl select-none">security</span>
              </div>
              <div>
                <div className="text-white font-black text-xs uppercase tracking-tighter">GDPR</div>
                <div className="text-[10px] text-slate-500 font-medium">European Privacy Shield</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 group">
              <div className="size-12 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-all">
                <span className="material-symbols-outlined text-cyan-400 text-2xl select-none">account_balance</span>
              </div>
              <div>
                <div className="text-white font-black text-xs uppercase tracking-tighter">EU AI Act</div>
                <div className="text-[10px] text-slate-500 font-medium">Reg. 2024/1689 Framework</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 group">
              <div className="size-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 group-hover:bg-red-500/20 transition-all">
                <span className="material-symbols-outlined text-red-400 text-2xl select-none">policy</span>
              </div>
              <div>
                <div className="text-white font-black text-xs uppercase tracking-tighter">BCB 4893</div>
                <div className="text-[10px] text-slate-500 font-medium">IA Regulada — Bacen</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Now Section */}
      <section id="problem" className="py-24 px-6 border-t border-white/5 bg-slate-900/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 border-l-4 border-cyan-500 pl-6">The Cost of "Expert Opinion" Is Rising</h2>
          
          <p className="text-lg text-slate-400 mb-12 leading-relaxed">
            In regulated industries — healthcare, finance, government — critical decisions must now be <strong>Explainable</strong>, <strong>Auditable</strong>, and <strong>Defensible</strong>. 
            Traditional committees and individual expertise cannot scale with complexity, and the cost of being wrong has never been higher.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-xl bg-slate-900/40 border border-white/5">
              <div className="text-cyan-400 font-bold mb-2">Explainable</div>
              <p className="text-sm text-slate-500">Who decided, and based on exactly what evidence?</p>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 border border-white/5">
              <div className="text-cyan-400 font-bold mb-2">Auditable</div>
              <p className="text-sm text-slate-500">Full traceability from ingestion to final verdict.</p>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/40 border border-white/5">
              <div className="text-cyan-400 font-bold mb-2">Defensible</div>
              <p className="text-sm text-slate-500">Stands up to rigorous regulatory scrutiny.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Traditional vs CouncilIA Section */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">This Is Not Another AI Tool</h2>
            <p className="text-slate-400">CouncilIA does not replace human judgment. It makes it defensible.</p>
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/20 backdrop-blur-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-8 py-6 text-sm font-bold text-slate-500 uppercase tracking-widest">Feature</th>
                  <th className="px-8 py-6 text-sm font-bold text-slate-300 uppercase tracking-widest">Traditional AI</th>
                  <th className="px-8 py-6 text-sm font-bold text-cyan-400 uppercase tracking-widest">CouncilIA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-8 py-6 font-medium text-white">Output</td>
                  <td className="px-8 py-6 text-slate-500">Generates answers</td>
                  <td className="px-8 py-6 text-slate-200 font-semibold">Structures decisions</td>
                </tr>
                <tr>
                  <td className="px-8 py-6 font-medium text-white">Evidence</td>
                  <td className="px-8 py-6 text-slate-500">Hallucination risk</td>
                  <td className="px-8 py-6 text-slate-200 font-semibold text-cyan-400">Evidence enforcement (RAG)</td>
                </tr>
                <tr>
                  <td className="px-8 py-6 font-medium text-white">Transparency</td>
                  <td className="px-8 py-6 text-slate-500">Black box</td>
                  <td className="px-8 py-6 text-slate-200 font-semibold">Full audit trail</td>
                </tr>
                <tr>
                  <td className="px-8 py-6 font-medium text-white">Accountability</td>
                  <td className="px-8 py-6 text-slate-500">No clear owner</td>
                  <td className="px-8 py-6 text-slate-200 font-semibold">Human validation required</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Regulatory Compliance Section */}
      <section id="compliance" className="py-24 px-6 border-t border-white/5 bg-gradient-to-r from-slate-950 to-cyan-950/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                Institutional Security v7.0
              </div>
              <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tight">Global Compliance <span className="text-cyan-400">Locked.</span></h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                CouncilIA is the only Decision Support System built from the ground up to comply with the strictest multi-national regulations. We translate legal constraints into technical guardrails.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-cyan-400 font-bold text-xs mb-1 uppercase tracking-widest">Brasil</div>
                  <div className="text-white font-bold text-lg text-center">LGPD & ANVISA</div>
                  <p className="text-[10px] text-slate-500 mt-2">Lei 13.709/18 & RDC 166/2017 Compliance Engine.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-cyan-400 font-bold text-xs mb-1 uppercase tracking-widest text-center">Europe</div>
                  <div className="text-white font-bold text-lg text-center">GDPR & AI ACT</div>
                  <p className="text-[10px] text-slate-500 mt-2">Reg. UE 2024/1689 classification for high-risk systems.</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-3xl border border-white/5 bg-slate-900/50 flex flex-col items-center justify-center text-center p-6">
                <span className="material-symbols-outlined text-4xl text-cyan-400 mb-4 select-none">gavel</span>
                <span className="text-xs font-bold text-white uppercase tracking-tighter italic">BCB 4893/2023</span>
                <span className="text-[9px] text-slate-600 mt-2 uppercase">Financial Governance</span>
              </div>
              <div className="aspect-square rounded-3xl border border-white/5 bg-slate-900/50 flex flex-col items-center justify-center text-center p-6">
                <span className="material-symbols-outlined text-4xl text-cyan-400 mb-4 select-none">clinical_notes</span>
                <span className="text-xs font-bold text-white uppercase tracking-tighter italic">ISO 17025</span>
                <span className="text-[9px] text-slate-600 mt-2 uppercase">Lab Reproducibility</span>
              </div>
              <div className="aspect-square rounded-3xl border border-white/5 bg-slate-900/50 flex flex-col items-center justify-center text-center p-6">
                <span className="material-symbols-outlined text-4xl text-cyan-400 mb-4 select-none">verified_user</span>
                <span className="text-xs font-bold text-white uppercase tracking-tighter italic">AES-256</span>
                <span className="text-[9px] text-slate-600 mt-2 uppercase">Immutable Logs</span>
              </div>
              <div className="aspect-square rounded-3xl border border-white/5 bg-slate-900/50 flex flex-col items-center justify-center text-center p-6">
                <span className="material-symbols-outlined text-4xl text-cyan-400 mb-4 select-none">rule</span>
                <span className="text-xs font-bold text-white uppercase tracking-tighter italic">DPIA Done</span>
                <span className="text-[9px] text-slate-600 mt-2 uppercase">Impact Assessment</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/5 bg-slate-900/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-white mb-4">How It Eliminates Risk</h2>
            <p className="text-slate-400">The 3-Round Adversarial Protocol</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="text-2xl font-black text-white/20">01</div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Multi-Agent Analysis</h3>
              <p className="text-sm text-slate-500 leading-relaxed">6 specialized perspectives evaluating strategy, technical risk, adoption, and ROI in isolation.</p>
            </div>
            <div className="space-y-4">
              <div className="text-2xl font-black text-cyan-500/40">02</div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Adversarial Debate</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Forced challenge protocol prevents groupthink by attacking weakest evidentiary points.</p>
            </div>
            <div className="space-y-4">
              <div className="text-2xl font-black text-white/20">03</div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Evidence Enforcement</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Every claim anchored to regulatory standards (ISO, RDC, MAPA, INMETRO).</p>
            </div>
            <div className="space-y-4">
              <div className="text-2xl font-black text-white/20">04</div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight text-cyan-400">Structured Verdict</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Final output includes consensus score, VaR, unrefuted risks, and a human-ready action plan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Example Section */}
      <section id="example" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">Live Example: Strategic Enterprise Expansion</h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                See how CouncilIA evaluated a complex proposal to deploy a global AI-driven operational framework across multiple regions. 
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-white/5">
                  <div className="size-10 rounded bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold">78</div>
                  <div className="text-sm">
                    <div className="text-white font-semibold">Consensus Score</div>
                    <div className="text-slate-500 text-xs">Technical: 22/30 · Regulatory: 18/25</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  <div className="size-10 rounded bg-red-500/10 flex items-center justify-center text-red-500 material-symbols-outlined shrink-0 select-none">warning</div>
                  <div className="text-sm">
                    <div className="text-white font-semibold">Critical Risk Identified</div>
                    <div className="text-slate-500 text-xs">Missing ISO 5725 inter-lab validation</div>
                  </div>
                </div>
              </div>
              
              <Link href="/login" className="inline-flex items-center gap-2 text-cyan-400 font-bold hover:text-cyan-300 transition-colors group">
                View Full Decision Report
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            
            <div className="relative">
              {/* Mockup of the v6.0 Judge Dashboard */}
              <div className="rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden aspect-[4/3] flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-slate-700"></div>
                    <div className="size-2.5 rounded-full bg-slate-700"></div>
                    <div className="size-2.5 rounded-full bg-slate-700"></div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Protocol v7.0 Auditor</div>
                </div>
                <div className="flex-1 p-8 flex flex-col justify-center items-center text-center">
                  <div className="mb-6 relative">
                    <svg className="size-48 rotate-[-90deg]">
                      <circle className="text-slate-800" cx="96" cy="96" fill="none" r="80" stroke="currentColor" strokeWidth="12"></circle>
                      <circle className="text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]" cx="96" cy="96" fill="none" r="80" stroke="currentColor" strokeDasharray="502" strokeDashoffset="110" strokeWidth="12"></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black text-white tracking-tighter">78</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Score</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 underline decoration-yellow-500/50 underline-offset-8">🟡 CONDITIONAL</h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed mt-4">
                    High Confidence: Technical Moat verified via industry standards. Mitigation required for operational consistency before full rollout.
                  </p>
                </div>
              </div>
              
              {/* Overlapping small cards for "flavor" */}
              <div className="absolute -bottom-6 -right-6 p-4 rounded-xl bg-slate-800 border border-white/10 shadow-xl max-w-[200px] animate-bounce-slow">
                <div className="text-[10px] font-bold text-red-400 uppercase mb-1">VaR: 32%</div>
                <div className="h-1 w-full bg-slate-700 rounded-full mb-2">
                  <div className="h-full bg-red-400 w-1/3"></div>
                </div>
                <p className="text-[9px] text-slate-400">Risk driver: Undefined regulatory pathway in MT region.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="py-32 px-6 border-t border-white/5 bg-gradient-to-b from-[#020617] to-cyan-950/20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight">Ready to Structure Your Decisions?</h2>
          <p className="text-xl text-slate-400 mb-12">Get a free scenario analysis. See how CouncilIA evaluates your specific proposal against 6 adversarial perspectives.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/login" className="w-full sm:w-auto px-10 py-5 bg-cyan-500 text-black rounded-lg font-black text-xl hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all active:scale-95 text-center">
              Analyze My Scenario — Free
            </Link>
          </div>
          
          <p className="mt-10 text-sm text-slate-500">
            *Used by research institutions, healthcare systems, and government agencies.*
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-[#020617]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-cyan-500/10 rounded flex items-center justify-center border border-cyan-500/20">
              <span className="text-cyan-400 text-xs font-bold">C</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-white uppercase">Council<span className="text-cyan-400">IA</span></span>
          </div>
          
          <div className="flex gap-8 text-xs font-medium text-slate-500">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security Audit</Link>
          </div>
          
          <div className="text-xs text-slate-600 font-mono">
            PROTOCOL v7.0-FINAL | © 2026 CouncilIA
          </div>
        </div>
      </footer>
      
      <style jsx global>{`
        @keyframes scan {
          0% { top: -100%; }
          100% { top: 100%; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
