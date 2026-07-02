import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export async function middleware(req: NextRequest) {
    let supabaseResponse = NextResponse.next({ request: req });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 1) Supabase Session Sync (needed for everything else)
    if (!supabaseUrl || !supabaseAnonKey) {
        return supabaseResponse;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({ request: req });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // 2) Auth Redirects
    const isLoginPage = req.nextUrl.pathname === '/login';
    const isRootPage = req.nextUrl.pathname === '/';

    // Redirect logged-in users away from /login or / to /dashboard
    if (user && (isLoginPage || isRootPage)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // 3) Route Protection
    const protectedPaths = [
        '/chamber',
        '/report',
        '/api/chamber',
        '/api/session',
        '/api/patch',
        '/api/repo',
        '/api/rag',
        '/api/stripe',
        '/api/admin',
        '/api/audit',
        '/api/debug',
        '/dashboard',
        '/new'
    ];
    const isProtected = protectedPaths.some(p => req.nextUrl.pathname.startsWith(p));

    // Allow internal worker calls to bypass auth
    const internalSecret = process.env.INTERNAL_WORKER_SECRET;
    const isInternal = req.headers.get('x-internal') === internalSecret && !!internalSecret;

    if (isProtected && !user && !isInternal) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // 4) Rate Limiting (API Only)
    if (req.nextUrl.pathname.startsWith('/api/')) {
        try {
            const redis = Redis.fromEnv();
            const ratelimit = new Ratelimit({
                redis,
                limiter: Ratelimit.slidingWindow(30, '1 m'),
                analytics: true,
                prefix: 'councilia:rl'
            });

            const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anonymous';
            const { success } = await ratelimit.limit(ip);
            if (!success) {
                return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
            }
        } catch (error) {
            console.warn('Rate limiting error:', error);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
