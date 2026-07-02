'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';

type UILang = 'pt' | 'en' | 'es';
function resolveUILang(locale: string): UILang {
    if (locale.startsWith('pt')) return 'pt';
    if (locale.startsWith('es')) return 'es';
    return 'en';
}

const L: Record<string, Record<UILang, string>> = {
    title: { pt: 'Câmara de Inteligência Estratégica', en: 'Strategic Intelligence Chamber', es: 'Câmara de Inteligencia Estratégica' },
    connecting: { pt: 'Conectando ao conselho...', en: 'Connecting to council...', es: 'Conectando al consejo...' },
    waiting: { pt: 'Aguardando especialistas...', en: 'Waiting for experts...', es: 'Esperando expertos...' },
    round1: { pt: 'Rodada 1 - Análise Inicial', en: 'Round 1 - Initial Analysis', es: 'Ronda 1 - Análise Inicial' },
    round2: { pt: 'Rodada 2 - Debate Cruzado', en: 'Round 2 - Cross-Debate', es: 'Ronda 2 - Debate Cruzado' },
    round3: { pt: 'Rodada 3 - Convergência', en: 'Round 3 - Convergence', es: 'Ronda 3 - Convergencia' },
    round4: { pt: 'Rodada 4 - Alinhamento de Consenso', en: 'Round 4 - Consensus Alignment', es: 'Ronda 4 - Alineación de Consenso' },
    round5: { pt: 'Rodada 5 - Teste de Estresse', en: 'Round 5 - Scenario Stress-Test', es: 'Ronda 5 - Prueba de Estrés' },
    round6: { pt: 'Rodada 6 - Roadmap de Execução', en: 'Round 6 - Execution Roadmap', es: 'Hoja de Ruta de Ejecución' },
    verdict: { pt: 'Parecer Executivo', en: 'Executive Verdict', es: 'Veredicto Ejecutivo' },
    complete: { pt: 'Sessão Finalizada', en: 'Session Complete', es: 'Sesión Finalizada' },
    consensus: { pt: 'Sincronia de Consenso', en: 'Consensus Sync', es: 'Sincronía de Consenso' },
    transcript: { pt: 'Transcrição Estratégica', en: 'Strategic Transcript', es: 'Transcripción Estratégica' },
    msgs: { pt: 'mensagens', en: 'messages', es: 'mensajes' },
    speaking: { pt: 'em síntese...', en: 'synthesizing...', es: 'sintetizando...' },
    interject: { pt: 'Intervir', en: 'Interject', es: 'Intervenir' },
    placeholder: { pt: 'Sua contribuição estratégica...', en: 'Your strategic input...', es: 'Tu aporte estratégico...' },
    redirect: { pt: 'Consolidando relatório final...', en: 'Consolidating final report...', es: 'Consolidando informe final...' },
};
function t(lang: UILang, key: string): string {
    return L[key]?.[lang] || L[key]?.en || key;
}

const PERSONAS: Record<string, { lbl: string; pt: string; em: string; c: string }> = {
    visionary: { lbl: 'Visionary', pt: 'Gestor de Inovação', em: '✨', c: '#0ECFB8' },
    technologist: { lbl: 'Technologist', pt: 'Cientista Analítico', em: '⚙️', c: '#5B50F0' },
    devil: { lbl: 'Devils Advocate', pt: 'Auditor de Qualidade', em: '🛡️', c: '#F87171' },
    marketeer: { lbl: 'Market Analyst', pt: 'Transferência de Tec.', em: '📊', c: '#F59E0B' },
    ethicist: { lbl: 'Ethics and Risk', pt: 'Estrategista Regulatório', em: '⚖️', c: '#94A3B8' },
    financier: { lbl: 'Financial', pt: 'Analista Financeiro', em: '💰', c: '#22C55E' },
    judge: { lbl: 'Executive Judge', pt: 'Juiz Executivo', em: '🏛️', c: '#F0F4FA' },
};

function gp(name: string, lang: UILang) {
    const n = name.toLowerCase();
    if (n.includes('inovação')) return { ...PERSONAS.visionary, dn: name };
    if (n.includes('cientista')) return { ...PERSONAS.technologist, dn: name };
    if (n.includes('auditor')) return { ...PERSONAS.devil, dn: name };
    if (n.includes('transferência')) return { ...PERSONAS.marketeer, dn: name };
    if (n.includes('regulatório')) return { ...PERSONAS.ethicist, dn: name };
    if (n.includes('financeiro') || n.includes('fomento')) return { ...PERSONAS.financier, dn: name };
    if (n.includes('visionary')) return { ...PERSONAS.visionary, dn: lang === 'pt' ? PERSONAS.visionary.pt : PERSONAS.visionary.lbl };
    if (n.includes('technologist')) return { ...PERSONAS.technologist, dn: lang === 'pt' ? PERSONAS.technologist.pt : PERSONAS.technologist.lbl };
    if (n.includes('devil')) return { ...PERSONAS.devil, dn: lang === 'pt' ? PERSONAS.devil.pt : PERSONAS.devil.lbl };
    if (n.includes('market')) return { ...PERSONAS.marketeer, dn: lang === 'pt' ? PERSONAS.marketeer.pt : PERSONAS.marketeer.lbl };
    if (n.includes('ethic')) return { ...PERSONAS.ethicist, dn: lang === 'pt' ? PERSONAS.ethicist.pt : PERSONAS.ethicist.lbl };
    if (n.includes('financial')) return { ...PERSONAS.financier, dn: lang === 'pt' ? PERSONAS.financier.pt : PERSONAS.financier.lbl };
    if (n.includes('judge')) return { ...PERSONAS.judge, dn: lang === 'pt' ? PERSONAS.judge.pt : PERSONAS.judge.lbl };
    return { lbl: name, pt: name, em: '🤖', c: '#5B50F0', dn: name };
}

const HEX = [
    { left: '50%', top: '15%' }, // Top
    { left: '85%', top: '30%' }, // Top Right
    { left: '85%', top: '70%' }, // Bottom Right
    { left: '50%', top: '85%' }, // Bottom
    { left: '15%', top: '70%' }, // Bottom Left
    { left: '15%', top: '30%' }, // Top Left
];

const ORBIT_POSITION = { left: '50%', top: '50%' };

interface Msg {
    id: string;
    expert_name: string;
    content: string;
    round: number;
    created_at: string;
    is_judge: boolean;
}

export default function DebateChamber({ runId }: { runId: string }) {
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [experts, setExperts] = useState<string[]>([]);
    const [speaking, setSpeaking] = useState('');
    const [phase, setPhase] = useState('');
    const [done, setDone] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [interjection, setInterjection] = useState('');
    const [sending, setSending] = useState(false);
    const [consensus, setConsensus] = useState(0);
    const [lang] = useState<UILang>(() =>
        resolveUILang(typeof navigator !== 'undefined' ? navigator.language : 'en')
    );

    useEffect(() => {
        if (done) return;
        const iv = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(iv);
    }, [done]);

    const fmt = (s: number) => {
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return mm + ':' + ss;
    };

    useEffect(() => {
        const supabase = createClient();
        let on = true;

        async function poll() {
            while (on) {
                const { data: events } = await supabase
                    .from('debate_events')
                    .select('*')
                    .eq('run_id', runId)
                    .order('ts', { ascending: true });

                if (events && events.length > 0 && on) {
                    const parsed: Msg[] = events
                        .filter(e => e.event_type === 'model_msg' || e.event_type === 'judge_note')
                        .map(e => {
                            const p = (e.payload || {}) as Record<string, unknown>;
                            return {
                                id: e.id,
                                expert_name: (e.model as string) || (p.persona as string) || 'system',
                                content: (p.text as string) || '',
                                round: (p.round as number) || 1,
                                created_at: (e.ts as string) || new Date().toISOString(),
                                is_judge: e.event_type === 'judge_note',
                            };
                        });

                    setMessages(parsed);

                    const names = Array.from(
                        new Set(parsed.filter(m => !m.is_judge && m.expert_name.toLowerCase() !== 'founder').map(m => m.expert_name))
                    );
                    setExperts(names);

                    const last = parsed[parsed.length - 1];
                    if (last) {
                        setSpeaking(last.expert_name);
                        if (last.is_judge) setPhase(t(lang, 'verdict'));
                        else if (last.round === 1) setPhase(t(lang, 'round1'));
                        else if (last.round === 2) setPhase(t(lang, 'round2'));
                        else if (last.round === 3) setPhase(t(lang, 'round3'));
                        else if (last.round === 4) setPhase(t(lang, 'round4'));
                        else if (last.round === 5) setPhase(t(lang, 'round5'));
                        else if (last.round === 6) setPhase(t(lang, 'round6'));
                    }

                    const ce = events.filter(e => e.event_type === 'consensus');
                    if (ce.length > 0) {
                        const cp = (ce[ce.length - 1].payload || {}) as Record<string, unknown>;
                        setConsensus(Math.round((cp.global as number) || (cp.consensus_score as number) || 0));
                    } else {
                        setConsensus(Math.min(95, parsed.length * 4));
                    }

                    const comp = events.find(e => e.event_type === 'complete');
                    if (comp && on) {
                        const cp = (comp.payload || {}) as Record<string, unknown>;
                        setDone(true);
                        if (cp.consensus_score) setConsensus(Math.round(cp.consensus_score as number));
                        const vid = (cp.validationId || cp.validationId || cp.validation_id) as string; if (vid) {
                            setTimeout(() => router.push('/report/' + vid), 3000);
                        }
                        break;
                    }
                }

                const { data: run } = await supabase
                    .from('debate_runs')
                    .select('status, validation_id')
                    .eq('id', runId)
                    .single();

                if (run && run.status === 'complete' && on) {
                    setDone(true);
                    if (run.validation_id) {
                        setTimeout(() => router.push('/report/' + run.validation_id), 3000);
                    }
                    break;
                }

                if (on) await new Promise(r => setTimeout(r, 2000));
            }
        }

        poll();
        return () => { on = false; };
    }, [runId, router, lang]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    async function sendInterject() {
        if (!interjection.trim()) return;
        setSending(true);
        try {
            await fetch('/api/session/interject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ runId, message: interjection }),
            });
            setInterjection('');
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col relative" suppressHydrationWarning>
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)] px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard')} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </button>
                    <div className="size-9 rounded-lg bg-gradient-to-br from-[var(--teal)] to-[var(--indigo)] flex items-center justify-center font-bold text-white shadow-lg">
                        C
                    </div>
                    <div>
                        <h1 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
                            {t(lang, 'title')}
                        </h1>
                        <h2 className="text-[14px] font-syne font-bold text-[var(--text)] tracking-tight">
                            {phase || t(lang, 'connecting')}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!done ? (
                        <div className="flex items-center gap-3 px-4 py-1.5 bg-red-500/5 border border-red-500/20 rounded-full">
                            <span className="size-1.5 bg-red-500 rounded-full animate-premium-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                            <span className="text-red-400 text-[10px] font-bold tracking-[0.2em]">LIVE ENGINE</span>
                            <span className="text-[var(--muted)] text-[10px] font-mono">{fmt(elapsed)}</span>
                        </div>
                    ) : (
                        <div className="px-4 py-1.5 bg-[var(--teal-dim)] border border-[var(--teal)]/20 text-[var(--teal)] rounded-full text-[10px] font-bold tracking-[0.2em]">
                            {t(lang, 'complete').toUpperCase()}
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-[1160px] mx-auto w-full px-6">
                
                {/* Simulation Map */}
                <div className="relative w-full max-w-md aspect-square flex items-center justify-center mx-auto my-8 animate-fade-up">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="relative size-24">
                            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                                <circle cx={50} cy={50} r={44} fill="none" stroke="var(--border)" strokeWidth={4} />
                                <circle
                                    cx={50} cy={50} r={44} fill="none"
                                    stroke="url(#consensus-grad)" strokeWidth={4} strokeLinecap="round"
                                    strokeDasharray={consensus * 2.76 + ' 276'}
                                    className="transition-all duration-1000"
                                />
                                <defs>
                                    <linearGradient id="consensus-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="var(--teal)" />
                                        <stop offset="100%" stopColor="var(--indigo)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-extrabold font-syne text-[var(--text)] tracking-tighter" suppressHydrationWarning>
                                    {consensus}%
                                </span>
                                <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-widest">sync</span>
                            </div>
                        </div>
                    </div>

                    {experts.map((name, i) => {
                        const isOrbiting = i >= 6;
                        const pos = isOrbiting ? ORBIT_POSITION : HEX[i % 6];
                        const persona = gp(name, lang);
                        const active = speaking === name;

                        let hint = t(lang, 'speaking');
                        if (active) {
                            hint = lang === 'pt' ? 'Sintetizando tese...' : lang === 'es' ? 'Sintetizando tesis...' : 'Synthesizing thesis...';
                        } else {
                            const lastMsg = [...messages].reverse().find(m => m.expert_name === name);
                            if (lastMsg && lastMsg.content) {
                                const cleanText = lastMsg.content.replace(/\*/g, '').replace(/\[.*\]/g, '').trim();
                                const words = cleanText.split(' ');
                                hint = `"${words.slice(0, 4).join(' ')}..."`;
                            } else {
                                hint = lang === 'pt' ? 'Aguardando...' : 'Waiting...';
                            }
                        }

                        return (
                            <div
                                key={name}
                                className={`absolute flex flex-col items-center gap-2 ${isOrbiting ? 'animate-[spin_20s_linear_infinite]' : ''}`}
                                style={{
                                    left: pos.left,
                                    top: pos.top,
                                    transform: isOrbiting ? 'translate(-50%, -50%) translateX(120px) rotate(0deg)' : 'translate(-50%, -50%)',
                                    transformOrigin: '0 0'
                                }}
                            >
                                <div className={`relative ${isOrbiting ? 'animate-[spin_20s_linear_infinite_reverse]' : ''}`}>
                                    {active && (
                                        <div
                                            className="absolute inset-0 rounded-full animate-ping opacity-20"
                                            style={{ backgroundColor: persona.c }}
                                        />
                                    )}
                                    <div
                                        className={'relative z-10 size-14 rounded-2xl flex items-center justify-center border transition-all duration-500 ' +
                                            (active ? 'scale-110 border-[var(--teal)] shadow-2xl shadow-[var(--teal-dim)]' : 'scale-100 border-[var(--border)] opacity-60')}
                                        style={{
                                            backgroundColor: active ? persona.c + '20' : 'var(--surface-2)',
                                        }}
                                    >
                                        <span className="text-xl">{persona.em}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-center max-w-[100px] truncate transition-all duration-500 border
                                        ${active ? 'text-white border-[var(--teal)] bg-[var(--surface)]' : 'text-[var(--muted)] border-transparent bg-transparent'}`}>
                                        {persona.dn}
                                    </span>
                                    <div
                                        className={`px-2 py-1 rounded-lg border max-w-[140px] text-center transition-all duration-500 bg-[var(--surface-2)]/80 backdrop-blur-sm ${active ? 'opacity-100 border-[var(--border-hover)]' : 'opacity-0 scale-90'}`}
                                    >
                                        <span className="text-[10px] font-light leading-tight line-clamp-2 text-[var(--muted-2)]">
                                            {hint}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {experts.length === 0 && (
                        <div className="flex flex-col items-center gap-4 z-20">
                            <div className="size-10 border-2 border-[var(--teal)]/20 border-t-[var(--teal)] rounded-full animate-spin" />
                            <p className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-widest">{t(lang, 'waiting')}</p>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="px-8 py-4 border border-[var(--border)] rounded-2xl bg-[var(--surface)]/50 backdrop-blur-sm mb-6 animate-fade-up">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em]">
                            {t(lang, 'consensus')}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--teal)] tracking-[0.2em]">{consensus}% SYNC</span>
                    </div>
                    <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[var(--teal)] to-[var(--indigo)] transition-all duration-1000 rounded-full"
                            style={{ width: consensus + '%' }}
                        />
                    </div>
                </div>

                {/* Transcript */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 space-y-4 mb-32 custom-scrollbar animate-fade-up">
                    <div className="flex items-center gap-4 mb-6">
                        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.3em]">
                            {t(lang, 'transcript')} — {messages.length} {t(lang, 'msgs')}
                        </h3>
                        <div className="flex-1 h-px bg-[var(--border)]"></div>
                    </div>

                    {messages.map((msg, idx) => {
                        const persona = gp(msg.expert_name, lang);
                        return (
                            <div key={msg.id} className="flex gap-4 animate-fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div
                                    className="size-9 rounded-xl flex items-center justify-center shrink-0 border mt-1"
                                    style={{ borderColor: persona.c + '30', backgroundColor: persona.c + '10' }}
                                >
                                    <span className="text-lg">{persona.em}</span>
                                </div>
                                <div className="flex-1 premium-card p-5 bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]/60 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: persona.c }}>
                                            {persona.dn} {msg.is_judge ? `— ${t(lang, 'verdict')}` : ''}
                                        </span>
                                        <span className="text-[var(--muted)] text-[9px] font-bold tracking-widest uppercase">
                                            ROUND {msg.round}
                                        </span>
                                    </div>
                                    <div className="text-sm text-[var(--text)]/90 leading-relaxed font-light prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown>{typeof msg.content === 'string' ? msg.content.replace(/\\n/g, '\n') : msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {messages.length === 0 && (
                        <div className="text-center py-20 animate-premium-pulse">
                            <p className="text-[var(--muted)] text-[11px] font-bold uppercase tracking-[0.4em]">{t(lang, 'connecting')}</p>
                        </div>
                    )}

                    {done && (
                        <div className="text-center py-12 text-[var(--teal)] text-[11px] font-bold uppercase tracking-[0.4em] animate-premium-pulse">
                            {t(lang, 'redirect')}
                        </div>
                    )}
                </div>
            </main>

            {/* Interjection Bar */}
            {!done && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)]/90 backdrop-blur-xl border-t border-[var(--border)] px-8 py-6">
                    <div className="max-w-[1160px] mx-auto flex items-center gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                className="premium-input pr-12"
                                placeholder={t(lang, 'placeholder')}
                                value={interjection}
                                onChange={(e) => setInterjection(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendInterject()}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 size-2 bg-[var(--teal)] rounded-full animate-premium-pulse"></div>
                        </div>
                        <button
                            onClick={sendInterject}
                            disabled={sending || !interjection.trim()}
                            className="premium-button premium-button-primary px-8"
                        >
                            {sending ? '...' : t(lang, 'interject')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
