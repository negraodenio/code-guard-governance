'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const redirectTo = searchParams.get('redirect') || '/dashboard';
    const checkout = searchParams.get('checkout');

    async function handleLogin() {
        if (!email || !password) {
            setError('Enter email and password.');
            return;
        }
        setLoading(true);
        setError('');
        setInfo('');
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
            setError(err.message);
            setLoading(false);
            return;
        }

        const finalRedirect = checkout ? `${redirectTo}?checkout=${checkout}` : redirectTo;
        router.push(finalRedirect);
    }

    async function handleSignup() {
        if (!email || !password) {
            setError('Enter email and password to create account.');
            return;
        }
        setLoading(true);
        setError('');
        setInfo('');

        const finalNext = checkout ? `${redirectTo}?checkout=${checkout}` : redirectTo;
        const confirmUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(finalNext)}`;

        const { error: err } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: confirmUrl,
            },
        });
        if (err) {
            setError(err.message);
            setLoading(false);
            return;
        }
        setInfo('Confirmation email sent. Please check your inbox.');
        setLoading(false);
    }

    return (
        <div className="w-full max-w-sm mx-auto">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold font-syne tracking-tighter mb-3">Welcome</h1>
                <p className="text-muted-2 font-light text-sm">Access the Strategic Intelligence Workspace</p>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2 ml-1">Work Email</label>
                    <input
                        type="email"
                        placeholder="founder@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className="w-full bg-surface-2 border border-border rounded-xl p-4 text-white placeholder-white/10 focus:outline-none focus:border-teal/50 transition-all text-sm font-light"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2 ml-1">Password</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className="w-full bg-surface-2 border border-border rounded-xl p-4 text-white placeholder-white/10 focus:outline-none focus:border-indigo/50 transition-all text-sm font-light"
                    />
                </div>
            </div>

            <div className="mt-8">
                {error && (
                    <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-xs flex items-center gap-3">
                        <span>{error}</span>
                    </div>
                )}

                {info && (
                    <div className="bg-teal-dim border border-teal/20 text-teal p-4 rounded-xl mb-6 text-xs flex items-center gap-3">
                        <span>{info}</span>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full premium-button rounded-xl py-4 font-bold text-sm text-white disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                    
                    <button
                        onClick={handleSignup}
                        disabled={loading}
                        className="w-full bg-transparent border border-border-hover hover:bg-surface-2 text-white font-medium py-4 rounded-xl text-sm transition-all"
                    >
                        Create Account
                    </button>
                </div>

                <div className="mt-10 pt-8 border-t border-border flex items-center justify-center gap-3 text-muted text-[10px] uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></div>
                    Secure Simulation Environment
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-bg text-text relative flex items-center justify-center p-6 overflow-hidden">
            {/* Grid Background */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            {/* Background Orbs */}
            <div className="fixed top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 w-full">
                <div className="flex justify-center mb-12">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-indigo flex items-center justify-center text-white font-syne font-extrabold text-lg shadow-lg group-hover:scale-105 transition-transform">
                            C
                        </div>
                        <span className="font-syne font-extrabold text-xl tracking-tighter">CouncilIA</span>
                    </Link>
                </div>

                <div className="premium-card max-w-md mx-auto p-8 md:p-12">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-6 h-6 border-2 border-white/5 border-t-teal rounded-full animate-spin mb-4" />
                            <div className="text-muted text-[10px] uppercase tracking-widest">Terminal Initializing...</div>
                        </div>
                    }>
                        <LoginForm />
                    </Suspense>
                </div>

                <div className="text-center mt-12 text-muted text-xs font-light">
                    &copy; {new Date().getFullYear()} CouncilIA Strategic Intelligence.
                </div>
            </div>
        </main>
    );
}
