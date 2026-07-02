import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        // Return a dummy client or throw a more helpful error that doesn't crash the build if not needed
        console.warn('Supabase credentials missing in browser client factory');
    }

    return createBrowserClient(
        url || 'http://placeholder.url',
        key || 'placeholder-key'
    );
}
