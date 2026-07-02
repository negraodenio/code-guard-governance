-- ===========================================
-- FIX: Performance Warnings - SIMPLIFIED
-- Only fixes what we know exists
-- ===========================================

-- FIX 1: Functions with search_path
DROP FUNCTION IF EXISTS public.search_coding_memory(vector, int);
CREATE OR REPLACE FUNCTION public.search_coding_memory(query_embedding vector, match_count int DEFAULT 10)
RETURNS TABLE (id uuid, content text, similarity float)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT cm.id, cm.content, 1 - (cm.embedding <=> query_embedding) as similarity
    FROM public.coding_memory cm
    ORDER BY cm.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

DROP FUNCTION IF EXISTS public.search_files(text, int);
CREATE OR REPLACE FUNCTION public.search_files(query_text text, match_count int DEFAULT 10)
RETURNS TABLE (file_path text, content text, similarity float)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT ri.file_path, ri.content, 0.0::float as similarity
    FROM public.repo_index ri
    WHERE ri.content ILIKE '%' || query_text || '%'
    LIMIT match_count;
END;
$$;

-- FIX 2: user_credits policies (merge into one)
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can manage credits" ON public.user_credits;

CREATE POLICY "user_credits_select" ON public.user_credits
    FOR SELECT USING (
        (select auth.email()) = email 
        OR (select auth.role()) = 'service_role'
    );

-- FIX 3: credit_transactions policy
DROP POLICY IF EXISTS "audit_read_own" ON public.credit_transactions;

CREATE POLICY "credit_transactions_select" ON public.credit_transactions
    FOR SELECT USING ((select auth.email()) = email);

-- FIX 4: repo_index policies (fix initplan)
DROP POLICY IF EXISTS "repo_index_write_service" ON public.repo_index;
DROP POLICY IF EXISTS "repo_index_update_service" ON public.repo_index;
DROP POLICY IF EXISTS "repo_index_delete_service" ON public.repo_index;

CREATE POLICY "repo_index_write" ON public.repo_index
    FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY "repo_index_update" ON public.repo_index
    FOR UPDATE USING ((select auth.role()) = 'service_role');
CREATE POLICY "repo_index_delete" ON public.repo_index
    FOR DELETE USING ((select auth.role()) = 'service_role');

-- FIX 5: patch_failures policies (fix initplan)
DROP POLICY IF EXISTS "patch_failures_write_service" ON public.patch_failures;
DROP POLICY IF EXISTS "patch_failures_update_service" ON public.patch_failures;
DROP POLICY IF EXISTS "patch_failures_delete_service" ON public.patch_failures;

CREATE POLICY "patch_failures_write" ON public.patch_failures
    FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY "patch_failures_update" ON public.patch_failures
    FOR UPDATE USING ((select auth.role()) = 'service_role');
CREATE POLICY "patch_failures_delete" ON public.patch_failures
    FOR DELETE USING ((select auth.role()) = 'service_role');

-- FIX 6: review_sessions policies (fix initplan)
DROP POLICY IF EXISTS "review_sessions_write_service" ON public.review_sessions;
DROP POLICY IF EXISTS "review_sessions_update_service" ON public.review_sessions;
DROP POLICY IF EXISTS "review_sessions_delete_service" ON public.review_sessions;

CREATE POLICY "review_sessions_write" ON public.review_sessions
    FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');
CREATE POLICY "review_sessions_update" ON public.review_sessions
    FOR UPDATE USING ((select auth.role()) = 'service_role');
CREATE POLICY "review_sessions_delete" ON public.review_sessions
    FOR DELETE USING ((select auth.role()) = 'service_role');

-- GRANT permissions
GRANT EXECUTE ON FUNCTION public.search_coding_memory(vector, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_files(text, int) TO anon, authenticated;
