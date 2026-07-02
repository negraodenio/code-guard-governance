import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        const msg = 'Supabase admin credentials missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)';
        if (process.env.NODE_ENV === 'production') {
            throw new Error(msg);
        }
        console.warn(msg);
    }

    return createSupabaseClient(
        url || 'http://placeholder.url',
        key || 'placeholder-key'
    );
}
