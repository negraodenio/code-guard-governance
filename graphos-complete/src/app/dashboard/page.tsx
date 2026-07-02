import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Navbar } from '@/ui/Navbar';

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    const { data: validations } = await supabase
        .from('validations')
        .select('*')
        .eq('tenant_id', profile?.tenant_id)
        .order('created_at', { ascending: false });

    const totalValidations = validations?.length || 0;
    const scoredValidations = validations?.filter(v => v.consensus_score !== null) || [];
    const averageScore = scoredValidations.length > 0
        ? Math.round(scoredValidations.reduce((acc, v) => acc + v.consensus_score, 0) / scoredValidations.length)
        : 0;
    const viableIdeas = scoredValidations.filter(v => v.consensus_score >= 70).length;

    const recentValidations = validations?.slice(0, 10) || [];

    return (
        <div className="min-h-screen">
            <Navbar />
            
            <main className="max-w-[1160px] mx-auto px-6 md:px-12 py-32 animate-fade-up">
                
                {/* Hero Header */}
                <div className="mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-border rounded-full mb-8">
                        <div className="size-1.5 bg-teal rounded-full animate-premium-pulse shadow-[0_0_8px_var(--teal)]"></div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">Strategic Workspace v14.0</span>
                    </div>
                    <h1 className="premium-heading text-6xl md:text-7xl text-text mb-6">Strategic Dashboard</h1>
                    <p className="text-xl text-muted-2 font-light max-w-2xl leading-relaxed">
                        Portfolio Overview & Strategic Intelligence. Monitor your organization's simulated outcomes and decision confidence.
                    </p>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
                    <div className="premium-card premium-card-accent">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-muted text-lg">folder_open</span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Total Simulations</span>
                        </div>
                        <div className="text-5xl font-extrabold font-syne tracking-tighter text-text">{totalValidations}</div>
                    </div>

                    <div className="premium-card premium-card-accent">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-muted text-lg">analytics</span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Avg Confidence</span>
                        </div>
                        <div className="text-5xl font-extrabold font-syne tracking-tighter text-teal">{averageScore}%</div>
                    </div>

                    <div className="premium-card premium-card-accent">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-muted text-lg">verified</span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Viable Outcomes</span>
                        </div>
                        <div className="text-5xl font-extrabold font-syne tracking-tighter text-indigo">{viableIdeas}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                    {/* LEFT COLUMN: History */}
                    <div className="lg:col-span-8">
                        <div className="flex items-center justify-between mb-10 pb-4 border-b border-border">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Simulation History</h2>
                            <Link href="/new" className="text-[10px] font-bold uppercase tracking-widest text-teal hover:opacity-80 transition-opacity">New Simulation +</Link>
                        </div>

                        {recentValidations && recentValidations.length > 0 ? (
                            <div className="space-y-4">
                                {recentValidations.map((v, idx) => (
                                    <Link 
                                        key={v.id} 
                                        href={`/report/${v.id}`} 
                                        className="premium-card block group hover:border-teal/40 hover:bg-surface-2 transition-all animate-fade-up"
                                        style={{ animationDelay: `${idx * 0.05}s` }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0 pr-8">
                                                <h3 className="text-xl font-bold font-syne tracking-tight mb-2 truncate group-hover:text-teal transition-colors">
                                                    {v.idea}
                                                </h3>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                                        v.status === 'complete' ? 'text-teal' : 
                                                        v.status === 'error' ? 'text-red-400' :
                                                        'text-muted-2'
                                                    }`}>
                                                        {v.status === 'complete' ? 'Deliberated' : v.status}
                                                    </span>
                                                    <span className="text-[10px] text-muted tracking-widest uppercase">
                                                        {new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {v.consensus_score !== null && (
                                                <div className="text-right">
                                                    <div className="text-3xl font-extrabold font-syne tracking-tighter text-text">
                                                        {Math.round(v.consensus_score)}%
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="premium-card py-32 text-center border-dashed border-border bg-transparent">
                                <span className="material-symbols-outlined text-4xl text-border-hover mb-6">history_edu</span>
                                <h3 className="text-2xl font-syne font-bold mb-2">Workspace Empty</h3>
                                <p className="text-muted-2 mb-10 max-w-xs mx-auto font-light">No strategic simulations detected. Start a new session to begin deliberation.</p>
                                <Link href="/new" className="premium-button premium-button-primary inline-flex mx-auto">
                                    Start First Session
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Resources & Account */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-32 space-y-12">
                            {/* Strategic Resources */}
                            <section>
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mb-8">Strategic Resources</h2>
                                <div className="space-y-4">
                                    <Link href="/dashboard/custom-persona" className="premium-card block group hover:border-teal/30 hover:bg-surface-2">
                                        <div className="flex items-center gap-5">
                                            <div className="size-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-xl group-hover:scale-110 transition-all group-hover:border-teal/30">
                                                🏛️
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-text mb-1 group-hover:text-teal transition-colors">Perspective Training</p>
                                                <p className="text-[9px] text-muted font-bold uppercase tracking-widest">Add Internal Data</p>
                                            </div>
                                            <span className="material-symbols-outlined text-muted group-hover:text-teal group-hover:translate-x-1 transition-all">arrow_forward</span>
                                        </div>
                                    </Link>

                                    <button className="w-full premium-card block group hover:border-indigo/30 hover:bg-surface-2 text-left">
                                        <div className="flex items-center gap-5">
                                            <div className="size-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-xl group-hover:scale-110 transition-all group-hover:border-indigo/30">
                                                📊
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-text mb-1 group-hover:text-indigo transition-colors">Executive Export</p>
                                                <p className="text-[9px] text-muted font-bold uppercase tracking-widest">Generate Portfolio</p>
                                            </div>
                                            <span className="material-symbols-outlined text-muted group-hover:text-indigo group-hover:translate-y-1 transition-all">download</span>
                                        </div>
                                    </button>
                                </div>
                            </section>

                            {/* Account section */}
                            <section>
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted mb-8">Account Management</h2>
                                <div className="space-y-4">
                                    <Link href="/api/stripe/portal" className="premium-card block group hover:border-white/20 hover:bg-surface-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className="material-symbols-outlined text-muted group-hover:text-text transition-colors">credit_card</span>
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-2 group-hover:text-text transition-colors">Subscription & Billing</span>
                                            </div>
                                            <span className="material-symbols-outlined text-muted group-hover:text-text transition-all group-hover:scale-110">open_in_new</span>
                                        </div>
                                    </Link>
                                    
                                    <form action="/api/auth/signout" method="post" className="mt-6">
                                        <button type="submit" className="w-full premium-card py-4 text-center group border-red-500/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 group-hover:text-red-500">End Session (Sign Out)</span>
                                        </button>
                                    </form>
                                </div>
                            </section>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}
