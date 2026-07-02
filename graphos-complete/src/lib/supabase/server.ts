import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        const msg = 'Supabase server credentials missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)';
        if (process.env.NODE_ENV === 'production') {
            throw new Error(msg);
        }
        console.warn(msg);
    }

    const cookieStore = await cookies();

    return createServerClient(
        url || 'http://placeholder.url',
        key || 'placeholder-key',
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            const secureOptions = {
                                ...options,
                                secure: process.env.NODE_ENV === 'production',
                                httpOnly: true,
                                sameSite: 'lax' as const,
                            };
                            cookieStore.set(name, value, secureOptions);
                        });
                    } catch { }
                },
            },
        }
    );
}
