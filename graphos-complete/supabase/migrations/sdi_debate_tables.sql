-- SDI Protocol v2.3: Debate tables for Council
-- Creates debate_runs and debate_events tables

-- 1. debate_runs — tracks each debate session
CREATE TABLE IF NOT EXISTS public.debate_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id uuid REFERENCES public.validations(id) ON DELETE CASCADE,
    tenant_id uuid,
    user_id uuid,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'error')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.debate_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own debate runs" ON public.debate_runs
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Service can manage debate runs" ON public.debate_runs
    FOR ALL USING (true) WITH CHECK (true);

-- 2. debate_events — stores every event in the debate
CREATE TABLE IF NOT EXISTS public.debate_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES public.debate_runs(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    model text,
    payload jsonb DEFAULT '{}'::jsonb,
    ts timestamptz DEFAULT now()
);

ALTER TABLE public.debate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read debate events" ON public.debate_events
    FOR SELECT USING (
        run_id IN (
            SELECT id FROM debate_runs 
            WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Service can manage debate events" ON public.debate_events
    FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_debate_events_run_id ON public.debate_events(run_id);
CREATE INDEX IF NOT EXISTS idx_debate_events_run_ts ON public.debate_events(run_id, ts);
CREATE INDEX IF NOT EXISTS idx_debate_runs_validation ON public.debate_runs(validation_id);
