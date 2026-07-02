'use client';
import { AllianceData } from '@/lib/verdict-engine';

export default function TensionMap({ alliances }: { alliances: AllianceData[] }) {
    if (!alliances || alliances.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 mt-8 animate-fade-up">
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em]">Strategic Tension Map</span>
                <span className="text-[9px] font-bold text-[var(--teal)]/50 tracking-widest animate-premium-pulse">LIVE TELEMETRY</span>
            </div>
            
            <div className="relative h-28 w-full bg-[var(--surface-2)]/30 rounded-2xl border border-[var(--border)] overflow-hidden flex items-end justify-around px-6 pb-6">
                {/* Decorative scanning line */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--teal)]/5 to-transparent w-1/2 h-full -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none"></div>
                
                {alliances.map((alliance, idx) => {
                    const height = 10 + (alliance.avgScore / 100) * 80;
                    return (
                        <div key={idx} className="flex flex-col items-center gap-3 group relative w-full max-w-[60px]">
                            {/* Score Tooltip */}
                            <div className="absolute -top-10 bg-[var(--bg)] border border-[var(--border-hover)] px-3 py-1 rounded-lg text-[10px] font-bold text-[var(--text)] opacity-0 group-hover:opacity-100 transition-all z-20 pointer-events-none shadow-xl">
                                {alliance.avgScore}% Sync
                            </div>
                            
                            <div 
                                className="w-full rounded-lg transition-all duration-1000 ease-out relative"
                                style={{ 
                                    height: `${height}%`, 
                                    backgroundColor: alliance.color + '15',
                                    border: `1px solid ${alliance.color}40`,
                                    boxShadow: `0 4px 20px ${alliance.color}05`
                                }}
                            >
                                <div className="absolute top-0 left-0 w-full h-1 rounded-t-lg" style={{ backgroundColor: alliance.color }}></div>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ color: alliance.color }}>
                                {alliance.category}
                            </span>
                        </div>
                    );
                })}
                
                {/* Horizontal reference lines */}
                <div className="absolute inset-0 flex flex-col justify-between py-8 pointer-events-none opacity-[0.03]">
                    <div className="w-full h-px bg-white"></div>
                    <div className="w-full h-px bg-white"></div>
                    <div className="w-full h-px bg-white"></div>
                </div>
            </div>
        </div>
    );
}
