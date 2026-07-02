-- ============================================================
-- Migration: gov_repo Bridge → public schema
-- Purpose: Make gov_repo tables accessible via PostgREST
--          without needing to expose the schema in API settings.
--          Creates views in public schema + grants needed.
-- ============================================================

-- 1. Helper function: SELECT queries (wraps in subquery)
CREATE OR REPLACE FUNCTION public.gov_exec(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, gov_repo
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT json_agg(r) FROM (' || sql || ') r' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.gov_exec(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gov_exec(text) TO service_role;

-- 1b. Helper function: DML statements (INSERT/UPDATE/DELETE with RETURNING)
--     PostgreSQL does NOT allow INSERT in a subquery; must use CTE instead.
CREATE OR REPLACE FUNCTION public.gov_exec_dml(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, gov_repo
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE 'WITH _result AS (' || sql || ') SELECT json_agg(r) FROM _result r' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.gov_exec_dml(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gov_exec_dml(text) TO service_role;

-- 2. Bridge: gov_repo.organisations → public.gov_organisations
CREATE OR REPLACE VIEW public.gov_organisations AS
  SELECT * FROM gov_repo.organisations;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_organisations TO service_role;

-- 3. Bridge: gov_repo.governance_users → public.gov_governance_users
CREATE OR REPLACE VIEW public.gov_governance_users AS
  SELECT * FROM gov_repo.governance_users;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_governance_users TO service_role;

-- 4. Bridge: gov_repo.agents → public.gov_agents
CREATE OR REPLACE VIEW public.gov_agents AS
  SELECT * FROM gov_repo.agents;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_agents TO service_role;

-- 5. Bridge: gov_repo.governance_ledger → public.gov_governance_ledger
CREATE OR REPLACE VIEW public.gov_governance_ledger AS
  SELECT * FROM gov_repo.governance_ledger;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_governance_ledger TO service_role;

-- 6. Bridge: gov_repo.risk_entries → public.gov_risk_entries
CREATE OR REPLACE VIEW public.gov_risk_entries AS
  SELECT * FROM gov_repo.risk_entries;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_risk_entries TO service_role;

-- 7. Bridge: gov_repo.governance_policies → public.gov_governance_policies
CREATE OR REPLACE VIEW public.gov_governance_policies AS
  SELECT * FROM gov_repo.governance_policies;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_governance_policies TO service_role;

-- 8. Bridge: gov_repo.conformity_assessments → public.gov_conformity_assessments
CREATE OR REPLACE VIEW public.gov_conformity_assessments AS
  SELECT * FROM gov_repo.conformity_assessments;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_conformity_assessments TO service_role;

-- 9. Bridge: gov_repo.agent_edges → public.gov_agent_edges
CREATE OR REPLACE VIEW public.gov_agent_edges AS
  SELECT * FROM gov_repo.agent_edges;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_agent_edges TO service_role;

-- 10. Ensure graphos tables have correct grants (they're in public)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graphos_entities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graphos_relationships TO service_role;
