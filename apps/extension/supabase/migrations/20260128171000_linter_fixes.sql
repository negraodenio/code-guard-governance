-- ===========================================
-- FIX: Supabase Linter Security Warnings
-- Date: 2026-01-28
-- ===========================================

-- ===========================================
-- FIX 1: function_search_path_mutable (6 funções)
-- Adiciona search_path = '' para evitar ataques de schema hijacking
-- ===========================================

-- Fix: search_coding_memory
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

-- Fix: get_credits
CREATE OR REPLACE FUNCTION public.get_credits(user_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_balance integer;
BEGIN
    SELECT balance INTO current_balance FROM public.user_credits WHERE email = user_email;
    RETURN COALESCE(current_balance, 0);
END;
$$;

-- Fix: use_credits
CREATE OR REPLACE FUNCTION public.use_credits(user_email text, credits_to_use integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_balance integer;
BEGIN
    IF user_email IS NULL OR user_email = '' THEN RETURN false; END IF;
    IF credits_to_use <= 0 THEN RETURN false; END IF;
    
    UPDATE public.user_credits 
    SET balance = balance - credits_to_use, updated_at = now()
    WHERE email = user_email AND balance >= credits_to_use
    RETURNING balance INTO new_balance;
    
    IF new_balance IS NULL THEN RETURN false; END IF;
    
    INSERT INTO public.credit_transactions (email, amount, description)
    VALUES (user_email, -credits_to_use, 'AI Scan Usage');
    
    RETURN true;
END;
$$;

-- Fix: add_credits
CREATE OR REPLACE FUNCTION public.add_credits(user_email text, credits_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF user_email IS NULL OR user_email = '' THEN
        RAISE EXCEPTION 'Invalid email';
    END IF;
    
    IF credits_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid credit amount';
    END IF;

    INSERT INTO public.user_credits (email, balance)
    VALUES (user_email, credits_amount)
    ON CONFLICT (email) 
    DO UPDATE SET balance = public.user_credits.balance + credits_amount, updated_at = now();
    
    INSERT INTO public.credit_transactions (email, amount, description)
    VALUES (user_email, credits_amount, 'Purchase');
END;
$$;

-- Fix: search_files (if exists)
-- Note: You may need to check actual function signature
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

-- Fix: handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_credits (email, balance)
    VALUES (NEW.email, 0)
    ON CONFLICT (email) DO NOTHING;
    RETURN NEW;
END;
$$;

-- ===========================================
-- FIX 2: extension_in_public
-- Move vector extension to extensions schema
-- ===========================================

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: Moving extension requires DROP and CREATE
-- This may fail if there are dependent objects
-- Only run if you don't have data using vector type
-- DROP EXTENSION IF EXISTS vector CASCADE;
-- CREATE EXTENSION vector SCHEMA extensions;

-- Alternative: Just document this as accepted risk
COMMENT ON EXTENSION vector IS 'pgvector extension - kept in public for compatibility';

-- ===========================================
-- FIX 3: rls_policy_always_true
-- Fix overly permissive RLS policies
-- ===========================================

-- Fix: patch_failures (table may not have email column)
DROP POLICY IF EXISTS "Allow all access" ON public.patch_failures;
CREATE POLICY "patch_failures_read_all" ON public.patch_failures
    FOR SELECT USING (true); -- Read access is public for diagnostics
CREATE POLICY "patch_failures_write_service" ON public.patch_failures
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "patch_failures_update_service" ON public.patch_failures
    FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "patch_failures_delete_service" ON public.patch_failures
    FOR DELETE USING (auth.role() = 'service_role');

-- Fix: repo_index  
DROP POLICY IF EXISTS "Allow all access" ON public.repo_index;
CREATE POLICY "repo_index_read_all" ON public.repo_index
    FOR SELECT USING (true); -- Read access is intentionally public
CREATE POLICY "repo_index_write_service" ON public.repo_index
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "repo_index_update_service" ON public.repo_index
    FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "repo_index_delete_service" ON public.repo_index
    FOR DELETE USING (auth.role() = 'service_role');

-- Fix: review_sessions (table may not have user_email column)
DROP POLICY IF EXISTS "Allow all access" ON public.review_sessions;
CREATE POLICY "review_sessions_read_all" ON public.review_sessions
    FOR SELECT USING (true); -- Read access is public for session tracking
CREATE POLICY "review_sessions_write_service" ON public.review_sessions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "review_sessions_update_service" ON public.review_sessions
    FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "review_sessions_delete_service" ON public.review_sessions
    FOR DELETE USING (auth.role() = 'service_role');

-- ===========================================
-- GRANT permissions
-- ===========================================
GRANT EXECUTE ON FUNCTION public.use_credits(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_credits(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_coding_memory(vector, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_files(text, int) TO anon, authenticated;
