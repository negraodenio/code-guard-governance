'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface PDFReportTemplateProps {
    validation: any;
}

/**
 * PDF Strategic Report Template v12.0.0 (Elite)
 * Optimized for Executive Decision Support.
 */
export default function PDFReportTemplate({ validation }: PDFReportTemplateProps) {
    const result = validation.full_result || validation || {};
    const ev = result.executiveVerdict || {};
    const insight = result.insightLayer || {};
    
    const meanScore = Math.round(ev.score || 0);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const personas = result.fullTranscript?.round3?.responses || [];

    const cleanContent = (text: string): string => {
        if (!text) return '';
        return text
            .replace(/^\d+\.\s*(DECISÃO\s*IMEDIATA|SÍNTESE\s*TÉCNICA|FONTES\s*DE\s*EVIDÊNCIA|Decisão\s*Imediata|Síntese\s*Técnica|Fontes\s*de\s*Evidência)[:\-\s]*/gi, '')
            .trim();
    };

    return (
        <div id="pdf-report-v12" className="bg-[#050810] text-[#d1d5db] font-sans w-[210mm] min-h-[297mm] p-12 overflow-hidden relative">
            <style dangerouslySetInnerHTML={{
                __html: `
                #pdf-report-v12 { font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
                .pdf-section { margin-bottom: 2rem; page-break-inside: avoid; }
                .tech-border { border: 1px solid rgba(0, 242, 255, 0.1); border-radius: 24px; padding: 2rem; background: rgba(255, 255, 255, 0.02); }
                .glow-text { text-shadow: 0 0 10px rgba(0, 242, 255, 0.3); }
                h2 { color: #00f2ff; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.4em; font-weight: 900; margin-bottom: 1.5rem; }
            `}} />

            {/* 🤖 WATERMARK / HEADER */}
            <div className="flex justify-between items-start mb-16 opacity-40">
                <div className="font-black italic text-xl tracking-tighter text-white">CouncilIA <span className="text-[#00f2ff]">V12.0.0 Elite</span></div>
                <div className="text-right font-mono text-[9px] uppercase tracking-widest">
                    Audit Tracking ID: {validation.id || 'VAL-ST-001'}<br/>
                    {dateStr} // Institutional Protocol
                </div>
            </div>

            {/* 🏆 EXECUTIVE SUMMARY SECTION */}
            <div className="pdf-section">
                <div className="tech-border border-l-4 border-l-[#00f2ff]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-7xl font-black text-white italic tracking-tighter">{ev.verdict || 'GO'}</div>
                        <div className="text-right">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Audit Score</div>
                            <div className="text-5xl font-black text-[#00f2ff] italic">{meanScore}<span className="text-xl text-slate-600 not-italic">/100</span></div>
                        </div>
                    </div>
                    <div className="space-y-12">
                        {/* DECISÃO IMEDIATA */}
                        <div className="p-10 bg-emerald-500/[0.05] border-l-8 border-emerald-500 rounded-r-[40px]">
                            <h2 className="text-[12px] font-black tracking-[0.3em] text-emerald-400 mb-6 uppercase">
                                01. DECISÃO IMEDIATA
                            </h2>
                            <div className="prose prose-invert prose-lg max-w-none text-white font-semibold leading-tight mb-4">
                                <ReactMarkdown>{cleanContent(result.decisaoImediata || result.judgeRationale || 'PARECER PENDENTE')}</ReactMarkdown>
                            </div>
                        </div>

                        {/* SÍNTESE TÉCNICA */}
                        {(result.sinteseTecnica || result.judgeRationale) && (
                            <div className="px-10">
                                <h2 className="text-[12px] font-black tracking-[0.3em] text-[#ff00e5] mb-6 uppercase">
                                    02. SÍNTESE TÉCNICA
                                </h2>
                                <div className="prose prose-invert prose-base max-w-none text-slate-300 italic leading-relaxed">
                                    <ReactMarkdown>{cleanContent(result.sinteseTecnica || '')}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {/* FONTES DE EVIDÊNCIA */}
                        {result.fontesEvidencia && (
                            <div className="px-10 border-t border-white/5 pt-12">
                                <h2 className="text-[10px] font-black tracking-[0.3em] text-white/40 mb-4 uppercase">
                                    FONTES DE EVIDÊNCIA
                                </h2>
                                <div className="prose prose-invert prose-xs max-w-none text-slate-500 text-[10px]">
                                    <ReactMarkdown>{cleanContent(result.fontesEvidencia)}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 🧠 INTELLIGENCE LAYER (The Matrix) */}
            <div className="pdf-section mt-12">
                <h2>Intelligence Layer: Conflict Heatmap</h2>
                <div className="tech-border p-6 overflow-hidden">
                    <table className="w-full text-[10px] font-mono border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2"></th>
                                {personas.map((p: any, i: number) => (
                                    <th key={i} className="p-2 text-white/30 truncate max-w-[60px]">{p.persona.split(' ')[0]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(insight.conflictHeatmap || []).map((row: string[], i: number) => (
                                <tr key={i} className="border-t border-white/5">
                                    <td className="p-2 text-white/30 truncate max-w-[60px] font-bold">{personas[i]?.persona.split(' ')[0]}</td>
                                    {row.map((cell, j) => (
                                        <td key={j} className="p-2 text-center text-lg">{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 🔥 DELIBERATION HIGHLIGHTS */}
            <div className="pdf-section">
                <h2>Strategic Consensus Evolution</h2>
                <div className="flex justify-between gap-4 mb-8">
                    {(insight.timeline || []).map((t: any, i: number) => (
                        <div key={i} className="flex-1 tech-border p-4 text-center">
                            <div className="text-xl font-black text-white mb-1">{t.consensus}%</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-[#00f2ff]/60">{t.label}</div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
