export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCouncilConfig } from '@/config/council';
import { isInternalRequest } from '@/lib/security/internal-auth';

async function addEvent(supabase: any, run_id: string, event_type: string, model: string | null, payload: any) {
    await supabase.from('debate_events').insert({ run_id, event_type, model, payload });
}

async function callJudge(messages: any[], zdr: boolean) {
    const providerConfig: any = {
        sort: { by: 'latency', partition: 'none' }
    };

    if (zdr) {
        providerConfig.data_collection = 'deny';
    }

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || '',
            'X-Title': process.env.OPENROUTER_X_TITLE || 'CouncilIA'
        },
        body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages,
            provider: providerConfig
        })
    });
    if (!r.ok) throw new Error(`OpenRouter judge failed: ${r.status}`);
    return r.json();
}

export async function POST(req: Request) {
    // Legacy endpoint: keep disabled in production by default.
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEBUG_ENDPOINTS !== 'true') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!isInternalRequest(req.headers)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { run_id, user_input, region, sensitivity } = await req.json();
        if (!run_id || !user_input) {
            return NextResponse.json({ error: 'run_id and user_input required' }, { status: 400 });
        }

        const config = getCouncilConfig(region || 'EU', sensitivity || 'business');

        await addEvent(supabase, run_id, 'user_interject', null, { text: user_input });

        const messages = [
            { role: 'system', content: 'You are the Judge responding to a user interjection during live debate. Be concise.' },
            { role: 'user', content: user_input }
        ];

        const out = await callJudge(messages, config.judge.zdr);
        const judgeText = out?.choices?.[0]?.message?.content ?? '';

        await addEvent(supabase, run_id, 'judge_note', 'judge', { text: judgeText, type: 'interject_response' });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Interject Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
