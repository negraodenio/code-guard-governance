'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const isInternal = pathname?.startsWith('/dashboard') || pathname?.startsWith('/report') || pathname?.startsWith('/chamber');

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-20 border-b border-border bg-bg/60 backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-3 group">
                <div className="size-9 rounded-xl bg-gradient-to-br from-teal to-indigo flex items-center justify-center font-syne font-extrabold text-[15px] text-white shadow-lg">
                    C
                </div>
                <span className="font-syne font-extrabold text-xl tracking-tighter text-text group-hover:text-teal transition-colors">
                    CouncilIA
                </span>
            </Link>

            <div className="flex items-center gap-8">
                <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest">
                    {isInternal ? (
                        <>
                            <Link href="/dashboard" className="text-muted hover:text-text transition-colors">Workspace</Link>
                            <Link href="/dashboard/custom-persona" className="text-muted hover:text-text transition-colors">Experts</Link>
                        </>
                    ) : (
                        <>
                            <Link href="/#product" className="text-muted hover:text-text transition-colors">Product</Link>
                            <Link href="/#use-cases" className="text-muted hover:text-text transition-colors">Use Cases</Link>
                            <Link href="/methodology" className="text-muted hover:text-text transition-colors">Methodology</Link>
                            <Link href="/pricing" className="text-muted hover:text-text transition-colors">Pricing</Link>
                        </>
                    )}
                </div>
                
                <button 
                    onClick={() => router.push(isInternal ? '/dashboard' : '/login')}
                    className="px-5 py-2.5 rounded-xl bg-surface-2 border border-border-hover text-text text-xs font-bold uppercase tracking-widest hover:border-teal hover:text-teal transition-all"
                >
                    {isInternal ? 'Workspace →' : 'Start free →'}
                </button>
            </div>
        </nav>
    );
}
