'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { exportToPDF } from '@/lib/pdf-utils';
import PDFReportTemplate from './PDFReportTemplate';

// ─── UTILS: Strategic Perspectives ──────────
const PERSONA_META: Record<string, { color: string; emoji: string; label: string }> = {
    strategic: { color: '#0ECFB8', emoji: '🎯', label: 'Strategic Perspective' },
    technical: { color: '#5B50F0', emoji: '⚙️', label: 'Technical Perspective' },
    contrarian: { color: '#F87171', emoji: '⚖️', label: 'Contrarian Perspective' },
    market: { color: '#F59E0B', emoji: '📈', label: 'Market Perspective' },
    risk: { color: '#94A3B8', emoji: '🛡️', label: 'Risk & Compliance' },
    financial: { color: '#22C55E', emoji: '💰', label: 'Financial Perspective' },
    company: { color: '#5B50F0', emoji: '🏛️', label: 'Company Perspective' },
};

function getMeta(id: string) {
    const n = id.toLowerCase();
    if (n.includes('inovação') || n.includes('strategic') || n.includes('visionary')) return PERSONA_META.strategic;
    if (n.includes('cientista') || n.includes('technical') || n.includes('technologist')) return PERSONA_META.technical;
    if (n.includes('auditor') || n.includes('contrarian') || n.includes('devil')) return PERSONA_META.contrarian;
    if (n.includes('mercado') || n.includes('market')) return PERSONA_META.market;
    if (n.includes('regulatório') || n.includes('risk') || n.includes('ethic')) return PERSONA_META.risk;
    if (n.includes('financeiro') || n.includes('financial')) return PERSONA_META.financial;
    if (n.includes('company') || n.includes('internal')) return PERSONA_META.company;
    return { color: '#94A3B8', emoji: '🧠', label: id };
}

export default function ConsensusReport({ validation }: { validation: any }) {
    const [activeTab, setActiveTab] = useState<'insights' | 'discussion' | 'alignment'>('insights');
    const [isExporting, setIsExporting] = useState(false);

    const result = validation.full_result || validation || {};
    const ev = result.executiveVerdict || {};
    const meanScore = Math.round(ev.score || 0);
    const statusLabel = ev.verdict || (meanScore >= 70 ? 'GO' : meanScore >= 40 ? 'CONDITIONAL' : 'NO-GO');
    
    const statusColor = meanScore >= 70 ? 'var(--teal)' : meanScore >= 40 ? '#F59E0B' : '#F87171';

    const perspectives = result.fullTranscript?.round3?.responses || [];

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await exportToPDF('pdf-report-v12', { 
                filename: `CouncilIA_Memo_${validation.id?.substring(0, 8)}.pdf` 
            });
        } catch (_err) {
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen">
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)] h-20 flex items-center justify-between px-8">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Dashboard</span>
                    </Link>
                    <div className="h-4 w-px bg-[var(--border)]"></div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted)]">Strategic Memo — ID: {validation.id?.substring(0,8)}</span>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="premium-button premium-button-secondary py-2 px-6"
                    >
                        <span className="material-symbols-outlined text-sm">download</span>
                        {isExporting ? 'Exporting...' : 'Export Memo'}
                    </button>
                </div>
            </header>

            <main className="max-w-[1160px] mx-auto py-16 px-6 animate-fade-up">

                {/* Hero Verdict */}
                <section className="premium-card premium-card-accent p-12 md:p-20 mb-12 text-center relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full mb-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--muted-2)]">Strategic Recommendation</span>
                        </div>
                        
                        <h1 className="premium-heading text-7xl md:text-9xl mb-8 tracking-tighter" style={{ color: statusColor }}>
                            {statusLabel}
                        </h1>

                        <div className="max-w-3xl mx-auto space-y-8">
                            <p className="text-2xl md:text-3xl font-syne font-bold text-[var(--text)] leading-tight">
                                {result.decisaoImediata || 'Advisory consensus has been reached on the core initiative.'}
                            </p>
                            <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--border-hover)] to-transparent mx-auto"></div>
                            <div className="prose prose-invert mx-auto text-[var(--muted-2)] leading-relaxed italic text-lg font-light">
                                <ReactMarkdown>{result.sinteseTecnica || 'Final synthesis consolidating all perspective inputs...'}</ReactMarkdown>
                            </div>
                        </div>

                        <div className="mt-16 flex justify-center gap-16 md:gap-24">
                            <div className="text-center">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Decision Confidence</div>
                                <div className="text-5xl font-extrabold font-syne text-[var(--text)] tracking-tighter">{meanScore}%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Strategic Alignment</div>
                                <div className="text-5xl font-extrabold font-syne text-[var(--teal)] tracking-tighter">High</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Tabs */}
                <div className="flex justify-center gap-10 mb-16 border-b border-[var(--border)]">
                    {[
                        { id: 'insights', label: 'Strategic Insights' },
                        { id: 'discussion', label: 'Perspective Logic' },
                        { id: 'alignment', label: 'Synthesis Map' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-5 text-[11px] font-bold uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--teal)] to-[var(--indigo)]"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Layers */}
                <div className="animate-fade-up">
                    {activeTab === 'insights' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="premium-card p-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <span className="material-symbols-outlined text-[#F87171]">warning</span>
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[var(--muted)]">Critical Risks</h3>
                                </div>
                                <div className="space-y-8">
                                    {(result.criticalRisks || []).length > 0 ? (
                                        result.criticalRisks.map((risk: any) => (
                                            <div key={risk.id} className="relative pl-6">
                                                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#F87171]/40 via-[#F87171]/10 to-transparent"></div>
                                                <h4 className="font-syne font-bold text-base mb-2 text-[var(--text)]">{risk.name}</h4>
                                                <p className="text-sm text-[var(--muted-2)] font-light leading-relaxed">{risk.evidence}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-[var(--muted)] italic font-light">No immediate blockers identified by the council.</p>
                                    )}
                                </div>
                            </div>
                            <div className="premium-card p-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <span className="material-symbols-outlined text-[var(--teal)]">bolt</span>
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[var(--muted)]">Strategic Actions</h3>
                                </div>
                                <div className="space-y-8">
                                    {(result.actionPlan?.actions || []).length > 0 ? (
                                        result.actionPlan.actions.map((action: any) => (
                                            <div key={action.id} className="flex gap-5">
                                                <div className="size-6 rounded-lg bg-[var(--teal-dim)] border border-[var(--teal)]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <div className="size-1.5 bg-[var(--teal)] rounded-full"></div>
                                                </div>
                                                <div>
                                                    <h4 className="font-syne font-bold text-base mb-1 text-[var(--text)]">{action.name}</h4>
                                                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest font-bold">Priority Alignment: {action.deadline}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-[var(--muted)] italic font-light">No mandatory actions for current stage.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'discussion' && (
                        <div className="space-y-8">
                            {perspectives.map((r: any, idx: number) => {
                                const meta = getMeta(r.persona);
                                return (
                                    <div key={r.persona} className="premium-card p-10 md:p-14 animate-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <div className="flex items-center gap-5 mb-10">
                                            <div className="size-14 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-2xl border border-[var(--border)]">
                                                {meta.emoji}
                                            </div>
                                            <div>
                                                <h3 className="font-syne font-bold text-xl tracking-tight text-[var(--text)]">{meta.label}</h3>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Confidence Index: <span className="text-[var(--teal)]">{r.score}%</span></div>
                                            </div>
                                        </div>
                                        <div className="prose prose-invert max-w-none text-[var(--text)]/80 leading-relaxed italic text-lg text-justify font-light">
                                            <ReactMarkdown>{r.analysis}</ReactMarkdown>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'alignment' && (
                        <div className="premium-card p-16 md:p-24 text-center">
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-[var(--muted)] mb-16">Decision Synthesis Map</h3>
                            <div className="max-w-3xl mx-auto space-y-16">
                                <div className="flex justify-between items-center px-4 md:px-12 relative">
                                    <div className="absolute top-1/2 left-12 right-12 h-px bg-gradient-to-r from-[var(--border)] via-[var(--border-hover)] to-[var(--border)] -translate-y-1/2 -z-10"></div>
                                    
                                    <div className="flex flex-col items-center gap-3 bg-[var(--surface)] px-4">
                                        <div className="size-5 bg-[var(--muted)]/20 rounded-full border border-[var(--border)]"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Thesis</span>
                                    </div>
                                    
                                    <div className="flex flex-col items-center gap-3 bg-[var(--surface)] px-4">
                                        <div className="size-5 bg-[var(--muted)]/40 rounded-full border border-[var(--border)]"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Antithesis</span>
                                    </div>
                                    
                                    <div className="flex flex-col items-center gap-3 bg-[var(--surface)] px-4">
                                        <div className="size-8 bg-gradient-to-br from-[var(--teal)] to-[var(--indigo)] rounded-full shadow-xl shadow-[var(--teal-dim)] flex items-center justify-center">
                                            <div className="size-2 bg-white rounded-full"></div>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text)]">Synthesis</span>
                                    </div>
                                </div>
                                <p className="text-[var(--muted-2)] italic leading-relaxed text-lg font-light max-w-2xl mx-auto">
                                    The final synthesis represents the emergence of strategic clarity after resolving 5 rounds of adversarial challenge across specialized board-level perspectives.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Quote */}
                <div className="mt-32 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-[var(--muted)]/30">Generated by CouncilIA v14.0 — Strategic Intelligence Layer</p>
                </div>

            </main>

            {/* Hidden PDF Support */}
            <div className="fixed -left-[2000px] top-0 pointer-events-none">
                <PDFReportTemplate validation={validation} />
            </div>
        </div>
    );
}
