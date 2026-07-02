import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = await createClient();

    // Check if we have a session before attempting to sign out
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        await supabase.auth.signOut();
    }

    const url = new URL(request.url);
    return NextResponse.redirect(new URL('/login', url.origin), {
        status: 302,
    });
}
