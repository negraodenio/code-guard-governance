'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="min-h-screen bg-[#05050a] flex items-center justify-center p-6 text-slate-100 font-body relative overflow-hidden">
            {/* Background Grid & Glow */}
            <div className="absolute inset-0 tech-grid pointer-events-none opacity-20"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="bg-[#0a0f1e] border border-red-500/30 rounded-2xl p-8 max-w-lg w-full relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display uppercase tracking-widest text-red-400">System Error</h2>
                        <p className="text-[10px] uppercase font-mono tracking-widest text-red-500/50">Unhandled Exception</p>
                    </div>
                </div>

                <div className="bg-black/50 border border-slate-800 rounded-lg p-4 mb-8">
                    <p className="text-sm font-mono text-slate-300 break-words leading-relaxed">{error.message}</p>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/50 px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Reinitialize
                    </button>
                </div>
            </div>
        </div>
    );
}

