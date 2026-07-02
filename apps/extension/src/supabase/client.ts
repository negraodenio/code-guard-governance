
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// SECURITY: never ship hardcoded Supabase credentials in client-distributed artifacts.
// Configure via environment variables in the runtime (VS Code extension host / server).
const PROJECT_URL = process.env.SUPABASE_URL || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
    if (!PROJECT_URL || !ANON_KEY) {
        console.warn('[CodeGuard] Supabase credentials not configured (SUPABASE_URL/SUPABASE_ANON_KEY).');
        return null;
    }

    if (!client) {
        try {
            client = createClient(PROJECT_URL, ANON_KEY);
        } catch (error) {
            console.error('[CodeGuard] Failed to initialize Supabase client:', error);
            return null;
        }
    }
    return client;
};
