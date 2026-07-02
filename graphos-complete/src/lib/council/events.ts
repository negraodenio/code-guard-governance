import { SupabaseClient } from '@supabase/supabase-js';

export async function addEvent(
    supabase: SupabaseClient,
    runId: string,
    type: string,
    personaId: string | null,
    data: Record<string, any>
) {
    try {
        const { error } = await supabase.from('debate_events').insert({
            run_id: runId,
            event_type: type,
            model: personaId,
            payload: data,
            // ts is auto-set by DEFAULT now()
        });
        if (error) {
            console.error(`[addEvent] DB error (${type}):`, error.message);
        }
    } catch (err: any) {
        console.error(`[addEvent] Failed (${type}):`, err.message);
    }
}
