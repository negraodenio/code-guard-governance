-- ============================================================
-- Migration 99: Enterprise Governance Hardening
-- Fixes: tenants table, FK constraints, RLS coverage,
--        audit triggers, CHECK constraints
-- ============================================================

-- 1. TENANTS TABLE (was missing — profiles.tenant_id had no parent)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. PROFILES FK
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_user
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_role
  CHECK (role IN ('member', 'admin', 'billing', 'viewer'));

-- 3. AUDIT LOGS FK + RLS
ALTER TABLE public.audit_logs
  ADD CONSTRAINT fk_audit_logs_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT fk_audit_logs_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs tenant access"
  ON public.audit_logs FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 4. CONSENTS FK + RLS
ALTER TABLE public.consents
  ADD CONSTRAINT fk_consents_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consents tenant access"
  ON public.consents FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.consents
  ADD CONSTRAINT chk_consents_status
  CHECK (status IN ('active', 'revoked', 'expired'));

-- 5. DATA SUBJECT REQUESTS FK + RLS
ALTER TABLE public.data_subject_requests
  ADD CONSTRAINT fk_dsr_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsr tenant access"
  ON public.data_subject_requests FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.data_subject_requests
  ADD CONSTRAINT chk_dsr_type
  CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'));

ALTER TABLE public.data_subject_requests
  ADD CONSTRAINT chk_dsr_status
  CHECK (status IN ('open', 'in_progress', 'fulfilled', 'rejected', 'withdrawn'));

-- 6. RETENTION POLICIES FK + RLS
ALTER TABLE public.retention_policies
  ADD CONSTRAINT fk_retention_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retention tenant access"
  ON public.retention_policies FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 7. BREACH NOTIFICATIONS FK + RLS
ALTER TABLE public.breach_notifications
  ADD CONSTRAINT fk_breach_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.breach_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "breach tenant access"
  ON public.breach_notifications FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.breach_notifications
  ADD CONSTRAINT chk_breach_severity
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- 8. PROCESSING ACTIVITIES FK + RLS
ALTER TABLE public.processing_activities
  ADD CONSTRAINT fk_processing_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processing tenant access"
  ON public.processing_activities FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 9. REPOSITORIES FK + RLS
ALTER TABLE public.repositories
  ADD CONSTRAINT fk_repos_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repos tenant access"
  ON public.repositories FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 10. SUBSCRIPTIONS FK + RLS
ALTER TABLE public.subscriptions
  ADD CONSTRAINT fk_subs_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions tenant access"
  ON public.subscriptions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 11. USAGE RECORDS FK + RLS
ALTER TABLE public.usage_records
  ADD CONSTRAINT fk_usage_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_records tenant access"
  ON public.usage_records FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 12. INVITES FK + RLS
ALTER TABLE public.invites
  ADD CONSTRAINT fk_invites_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites admin only"
  ON public.invites FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM public.profiles
    WHERE tenant_id = invites.tenant_id AND role = 'admin'
  ));

-- 13. WEBHOOK SUBSCRIPTIONS FK + RLS
ALTER TABLE public.webhook_subscriptions
  ADD CONSTRAINT fk_webhooks_tenant
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks admin only"
  ON public.webhook_subscriptions FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM public.profiles
    WHERE tenant_id = webhook_subscriptions.tenant_id AND role = 'admin'
  ));

-- 14. REPO PERMISSIONS FK + RLS
ALTER TABLE public.repo_permissions
  ADD CONSTRAINT fk_repo_perms_repo
  FOREIGN KEY (repo_id) REFERENCES public.repositories(id) ON DELETE CASCADE;

ALTER TABLE public.repo_permissions
  ADD CONSTRAINT fk_repo_perms_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.repo_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repo_permissions owner access"
  ON public.repo_permissions FOR ALL
  USING (user_id = auth.uid());

-- 15. REPO DOCUMENTS FK + RLS
ALTER TABLE public.repo_documents
  ADD CONSTRAINT fk_repo_docs_repo
  FOREIGN KEY (repo_id) REFERENCES public.repositories(id) ON DELETE CASCADE;

ALTER TABLE public.repo_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repo_documents via repo"
  ON public.repo_documents FOR ALL
  USING (repo_id IN (
    SELECT id FROM public.repositories
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

-- 16. REPO EMBEDDINGS FK + RLS
ALTER TABLE public.repo_embeddings
  ADD CONSTRAINT fk_repo_embeddings_doc
  FOREIGN KEY (document_id) REFERENCES public.repo_documents(id) ON DELETE CASCADE;

ALTER TABLE public.repo_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repo_embeddings via repo"
  ON public.repo_embeddings FOR ALL
  USING (document_id IN (
    SELECT d.id FROM public.repo_documents d
    JOIN public.repositories r ON r.id = d.repo_id
    WHERE r.tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

-- 17. REPO FILES FK + RLS
ALTER TABLE public.repo_files
  ADD CONSTRAINT fk_repo_files_repo
  FOREIGN KEY (repo_id) REFERENCES public.repositories(id) ON DELETE CASCADE;

ALTER TABLE public.repo_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repo_files via repo"
  ON public.repo_files FOR ALL
  USING (repo_id IN (
    SELECT id FROM public.repositories
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

-- 18. REPO SYNC HISTORY FK + RLS
ALTER TABLE public.repo_sync_history
  ADD CONSTRAINT fk_sync_history_repo
  FOREIGN KEY (repo_id) REFERENCES public.repositories(id) ON DELETE CASCADE;

ALTER TABLE public.repo_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_history via repo"
  ON public.repo_sync_history FOR ALL
  USING (repo_id IN (
    SELECT id FROM public.repositories
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

-- 19. CODING MEMORY FK + RLS
ALTER TABLE public.coding_memory
  ADD CONSTRAINT fk_coding_memory_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.coding_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coding_memory own"
  ON public.coding_memory FOR ALL
  USING (user_id = auth.uid());

-- 20. DEBATE RUNS + EVENTS RLS
ALTER TABLE public.debate_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debate_runs tenant access"
  ON public.debate_runs FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.debate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debate_events via run"
  ON public.debate_events FOR ALL
  USING (run_id IN (
    SELECT id FROM public.debate_runs
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

-- 21. COUNCIL TEMPLATES RLS
ALTER TABLE public.council_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "council_templates tenant access"
  ON public.council_templates FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 22. CUSTOM PERSONAS + DOCUMENTS RLS
ALTER TABLE public.custom_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_personas tenant access"
  ON public.custom_personas FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.custom_persona_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "persona_docs via persona"
  ON public.custom_persona_documents FOR ALL
  USING (persona_id IN (
    SELECT id FROM public.custom_personas
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

-- 23. GRAPHOS ENTITIES + RELATIONSHIPS RLS
ALTER TABLE public.graphos_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "graphos_entities tenant access"
  ON public.graphos_entities FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.graphos_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "graphos_relationships tenant access"
  ON public.graphos_relationships FOR ALL
  USING (source_id IN (
    SELECT id FROM public.graphos_entities
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  ));

-- 24. UPDATED_AT TRIGGER (generic, for any table with updated_at)
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT IN ('graphos_entities', 'graphos_relationships') -- skip if no trigger yet
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I; CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- 25. TENANTS RLS POLICIES
CREATE POLICY "tenants member select"
  ON public.tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenants admin update"
  ON public.tenants FOR UPDATE
  USING (id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 26. Audit: track schema changes
CREATE TABLE IF NOT EXISTS public.schema_audit (
  id bigint generated always as identity primary key,
  operation text not null check (operation in ('DDL', 'DML', 'SECURITY')),
  table_name text,
  description text,
  performed_by text default current_user,
  performed_at timestamptz default now()
);
ALTER TABLE public.schema_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schema_audit admin only"
  ON public.schema_audit FOR SELECT
  USING (auth.role() = 'service_role');

-- Final: re-apply FK on profiles now that tenants exists
-- (handles edge case where tenant_id was created as random UUID before tenants table)
UPDATE public.profiles p
SET tenant_id = t.id
FROM (
  SELECT id FROM public.tenants WHERE slug = 'default'
) t
WHERE p.tenant_id NOT IN (SELECT id FROM public.tenants);

INSERT INTO public.tenants (id, name, slug, plan)
SELECT DISTINCT p.tenant_id, 'Auto-created', 'auto-' || p.tenant_id, 'free'
FROM public.profiles p
WHERE p.tenant_id NOT IN (SELECT id FROM public.tenants)
ON CONFLICT (id) DO NOTHING;
