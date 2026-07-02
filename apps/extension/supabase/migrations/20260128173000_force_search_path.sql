-- ===========================================
-- FORCE FIX: search_path para funções
-- ===========================================

-- Listar todas as versões das funções primeiro
-- SELECT proname, proargtypes FROM pg_proc WHERE proname IN ('search_coding_memory', 'search_files');

-- Dropar TODAS as versões e recriar
DROP FUNCTION IF EXISTS public.search_coding_memory(vector);
DROP FUNCTION IF EXISTS public.search_coding_memory(vector, int);
DROP FUNCTION IF EXISTS public.search_coding_memory(vector, integer);

CREATE FUNCTION public.search_coding_memory(query_embedding vector, match_count int DEFAULT 10)
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

DROP FUNCTION IF EXISTS public.search_files(text);
DROP FUNCTION IF EXISTS public.search_files(text, int);
DROP FUNCTION IF EXISTS public.search_files(text, integer);

CREATE FUNCTION public.search_files(query_text text, match_count int DEFAULT 10)
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

GRANT EXECUTE ON FUNCTION public.search_coding_memory(vector, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_files(text, int) TO anon, authenticated;
