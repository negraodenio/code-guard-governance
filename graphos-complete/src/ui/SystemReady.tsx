'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { t, type UILang } from '@/lib/i18n/ui-strings';

export default function SystemReady() {
    const router = useRouter();
    const [idea, setIdea] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [lang] = useState<UILang>('English');

    const [profileLoading, setProfileLoading] = useState(true);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [usageInfo, setUsageInfo] = useState<{ usage: number, limit: number, plan: string, userName: string } | null>(null);

    // Context / RAG variables
    const [showContextModal, setShowContextModal] = useState(false);
    const [contextText, setContextText] = useState("");
    const [repoName, setRepoName] = useState("");
    const [ingestingContext, setIngestingContext] = useState(false);

    // Custom Persona variable
    const [customPersonas, setCustomPersonas] = useState<any[]>([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        (async () => {
            setProfileLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setProfileLoading(false);
                return;
            }
            setUserId(user.id);
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();
            if (profile) setTenantId(profile.tenant_id);

            const { data: personaData } = await supabase
                .from('custom_personas')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

            if (personaData && personaData.length > 0) {
                setCustomPersonas(personaData);
                setSelectedPersonaId(personaData[0].id);
            }

            setProfileLoading(false);

            try {
                const res = await fetch('/api/usage');
                const data = await res.json();
                if (data.usage !== undefined) setUsageInfo(data);
            } catch (_e) {
                console.error("Failed to fetch usage:", _e);
            }
        })();
    }, []);

    async function handleBilling() {
        try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                router.push('/pricing');
            }
        } catch (_e) {
            router.push('/pricing');
        }
    }

    async function start() {
        setLoading(true);
        try {
            const payload = {
                idea: idea || t(lang, 'sys_placeholder'),
                topic: 'Strategic Perspective Simulation',
                region: 'Global',
                sensitivity: 'high',
                tenant_id: tenantId,
                user_id: userId,
                useCustomExpert: !!selectedPersonaId,
                customPersonaId: selectedPersonaId,
            };

            const res = await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.status === 403 && data.error === 'LIMIT_REACHED') {
                setShowUpgrade(true);
                return;
            }

            if (!data?.runId) throw new Error(data.error || 'Missing runId');

            fetch('/api/session/worker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    validationId: data.validationId,
                    runId: data.runId,
                })
            }).catch(console.error);

            router.push('/chamber/' + data.runId);
        } catch (err: any) {
            alert(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    async function handleIngestContext() {
        if (!contextText.trim() || !repoName.trim()) return;
        setIngestingContext(true);
        try {
            const res = await fetch('/api/repo/ingest-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uId: userId,
                    name: repoName,
                    content: contextText,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setShowContextModal(false);
            setContextText("");
        } catch (err: any) {
            alert(err.message || 'Failed to ingest context');
        } finally {
            setIngestingContext(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row relative bg-bg" suppressHydrationWarning>
            
            {/* Sidebar */}
            <aside className="w-full md:w-24 lg:w-80 bg-bg border-b md:border-b-0 md:border-r border-border flex flex-row md:flex-col shrink-0 px-8 py-10 z-10">
                <div className="flex items-center gap-4 mb-16">
                    <div className="size-11 rounded-xl bg-gradient-to-br from-teal to-indigo flex items-center justify-center font-syne font-extrabold text-white shadow-lg">
                        C
                    </div>
                    <div className="hidden lg:block">
                        <h1 className="premium-heading text-xl tracking-tighter leading-none mb-1">CouncilIA</h1>
                        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted">Strategic Chamber</span>
                    </div>
                </div>

                <nav className="flex-1 flex flex-col gap-3 hidden md:flex">
                    <button 
                        onClick={() => router.push('/dashboard')} 
                        className="flex items-center gap-5 px-5 py-4 rounded-xl hover:bg-surface-2 transition-all text-muted-2 hover:text-text group"
                    >
                        <span className="material-symbols-outlined text-[22px] group-hover:text-teal transition-colors">grid_view</span>
                        <span className="hidden lg:block font-bold text-[10px] uppercase tracking-[0.2em]">Workspace</span>
                    </button>
                    <button className="flex items-center gap-5 px-5 py-4 rounded-xl bg-surface-2 text-teal transition-all border border-teal/20">
                        <span className="material-symbols-outlined text-[22px]">add_circle</span>
                        <span className="hidden lg:block font-bold text-[10px] uppercase tracking-[0.2em]">New Session</span>
                    </button>
                </nav>

                <div className="mt-auto pt-10 border-t border-border hidden lg:block">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="size-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center font-syne font-extrabold text-text shadow-sm">
                            {usageInfo?.userName?.charAt(0) || 'E'}
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-tight text-text leading-tight mb-0.5">{usageInfo?.userName || 'Executive'}</p>
                            <p className="text-[9px] text-muted font-bold uppercase tracking-widest">{usageInfo?.plan || 'Standard'} Access</p>
                        </div>
                    </div>
                    {usageInfo && (
                        <div className="space-y-5">
                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted">
                                <span>Monthly Quota</span>
                                <span className="text-muted-2">{usageInfo.usage} / {usageInfo.limit}</span>
                            </div>
                            <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-teal to-indigo transition-all duration-1000" style={{ width: `${(usageInfo.usage / usageInfo.limit) * 100}%` }}></div>
                            </div>
                            <button onClick={handleBilling} className="w-full py-4 text-[10px] font-bold uppercase tracking-[0.2em] border border-border rounded-xl hover:border-teal/50 hover:text-teal transition-all bg-surface/30">
                                Management Hub
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col xl:flex-row relative">
                
                {/* Input Stream */}
                <section className="flex-1 p-8 md:p-12 lg:p-20 flex flex-col animate-fade-up">
                    <div className="mb-14">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-border rounded-full mb-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-2">Strategic Input Stream</span>
                        </div>
                        <h2 className="premium-heading text-5xl md:text-7xl text-text mb-4 leading-[1.1]">
                            Define your <span className="text-muted italic font-light">objective.</span>
                        </h2>
                        <p className="text-lg text-muted-2 font-light max-w-xl">Describe the strategic move, dilemma, or board-level opportunity you wish to simulate.</p>
                    </div>

                    <div className="flex-1 flex flex-col relative group">
                        <div className="flex-1 premium-card premium-card-accent p-0 overflow-hidden flex flex-col border-border focus-within:border-teal/40 transition-all duration-500 shadow-2xl">
                            <div className="px-8 py-5 border-b border-border bg-bg/40 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Executive Directive</span>
                                <button onClick={() => setShowContextModal(true)} className="text-[10px] font-bold uppercase tracking-widest text-teal hover:opacity-80 transition-opacity flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">attachment</span>
                                    Link Context
                                </button>
                            </div>
                            <textarea
                                className="flex-1 w-full bg-transparent border-none focus:ring-0 p-10 text-2xl md:text-3xl text-text placeholder:text-white/5 resize-none font-syne font-medium leading-[1.4]"
                                placeholder="E.g. Acquisition of competitor 'Alpha' to secure 40% market share in EMEA..."
                                value={idea}
                                onChange={(e) => setIdea(e.target.value)}
                            />
                            <div className="px-8 py-5 border-t border-border bg-bg/20 flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted">
                                <span>{idea.length} / 2500 characters</span>
                                <span className="text-teal/80">Chamber Status: Ready</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Sidebar: Perspectives */}
                <section className="xl:w-[420px] p-8 md:p-12 lg:p-16 bg-white/[0.01] border-l border-border flex flex-col animate-fade-up" style={{ animationDelay: '0.1s' }}>
                    <div className="mb-14">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mb-10">Board Composition</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { name: 'Strategic', icon: '🎯', role: 'Visionary Lead' },
                                { name: 'Technical', icon: '🔬', role: 'Systems Lead' },
                                { name: 'Risk / Audit', icon: '⚖️', role: 'Contrarian' },
                                { name: 'ROI / Growth', icon: '📈', role: 'Market Lead' },
                            ].map(p => (
                                <div key={p.name} className="premium-card p-5 flex items-center gap-5 hover:border-white/10 transition-all cursor-default group">
                                    <div className="size-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        {p.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-text mb-1">{p.name}</p>
                                        <p className="text-[9px] text-muted font-bold uppercase tracking-widest">{p.role}</p>
                                    </div>
                                    <div className="size-1.5 rounded-full bg-teal shadow-[0_0_8px_var(--teal)] animate-premium-pulse"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-14">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mb-10">Neural Extensions</h3>
                        <div className="space-y-5">
                            {customPersonas.length > 0 ? (
                                <div className="space-y-3">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted ml-1">Select Custom Specialist</label>
                                    <select 
                                        value={selectedPersonaId || ''} 
                                        onChange={(e) => setSelectedPersonaId(e.target.value)}
                                        className="premium-input text-xs h-14"
                                    >
                                        {customPersonas.map(p => (
                                            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <button onClick={() => router.push('/dashboard/custom-persona')} className="w-full premium-card py-6 text-[10px] font-bold uppercase tracking-[0.3em] border-dashed border-muted/30 hover:border-teal/40 hover:bg-teal/5 transition-all flex flex-col items-center gap-3">
                                    <span className="material-symbols-outlined text-muted text-3xl">psychology_alt</span>
                                    <span>Define Specialist</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto space-y-8">
                        <div className="space-y-4 pt-8 border-t border-border">
                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted">
                                <span>Logic Consistency</span>
                                <span className="text-teal">VERIFIED</span>
                            </div>
                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted">
                                <span>Audit Readiness</span>
                                <span className="text-text">HIGH-TRUST</span>
                            </div>
                        </div>
                        <button
                            onClick={start}
                            disabled={loading || profileLoading || !idea.trim()}
                            className="w-full premium-button premium-button-primary py-7 text-[12px] font-extrabold font-syne uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? 'Initializing Chamber...' : 'Initiate Simulation'}
                        </button>
                    </div>
                </section>
            </main>

            {/* Upgrade Overlay */}
            {showUpgrade && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/95 backdrop-blur-2xl p-6">
                    <div className="premium-card premium-card-accent max-w-lg w-full p-12 text-center">
                        <div className="size-20 rounded-2xl bg-indigo/10 border border-indigo/20 flex items-center justify-center text-4xl mx-auto mb-8">
                            ⚡
                        </div>
                        <h2 className="premium-heading text-4xl text-text mb-4">Capacity Reached</h2>
                        <p className="text-muted-2 mb-10 leading-relaxed">Your account has reached its strategic session limit for this period. Upgrade to Pro for unlimited adversarial audits.</p>
                        <div className="flex flex-col gap-4">
                            <button onClick={handleBilling} className="premium-button premium-button-primary py-5">Upgrade to Pro</button>
                            <button onClick={() => setShowUpgrade(false)} className="premium-button premium-button-secondary py-4">Close Workspace</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Modal */}
            {showContextModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/90 backdrop-blur-2xl p-6 animate-fade-up">
                    <div className="premium-card premium-card-accent max-w-2xl w-full p-12 shadow-3xl">
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted mb-3">Intelligence Core</h3>
                                <h2 className="premium-heading text-4xl text-text tracking-tighter">Strategic Context</h2>
                            </div>
                            <button onClick={() => setShowContextModal(false)} className="size-10 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:text-text transition-colors border border-border">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        
                        <div className="space-y-10">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-4">Document Title</label>
                                <input
                                    type="text"
                                    value={repoName}
                                    onChange={(e) => setRepoName(e.target.value)}
                                    placeholder="e.g. M&A Target Analysis — Project Alpha"
                                    className="premium-input h-14"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-4">Data Stream (Paste Intelligence)</label>
                                <textarea
                                    value={contextText}
                                    onChange={(e) => setContextText(e.target.value)}
                                    placeholder="Paste raw research, meeting transcripts, or financial projections..."
                                    className="premium-input h-72 resize-none p-6 leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="mt-14 flex gap-5">
                            <button onClick={() => setShowContextModal(false)} className="flex-1 premium-button premium-button-secondary py-5 uppercase tracking-widest font-bold text-[10px]">Discard</button>
                            <button
                                onClick={handleIngestContext}
                                disabled={ingestingContext || !contextText.trim() || !repoName.trim()}
                                className="flex-[2] premium-button premium-button-primary px-12 uppercase tracking-[0.2em] font-bold text-[11px]"
                            >
                                {ingestingContext ? 'Optimizing Data...' : 'Ingest Intelligence'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
