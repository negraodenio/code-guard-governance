-- ============================================
-- CODEGUARD PHASE 8.2 — DATABASE SETUP
-- Schema: gov_repo
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. GOVERNANCE LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gov_repo.governance_ledger (
    ledger_id     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type    text NOT NULL,
    event_desc    text,
    subject_type  text,
    subject_id    uuid,
    actor_user_id uuid,
    actor_ip      text,
    organisation_id uuid NOT NULL,
    payload       jsonb DEFAULT '{}'::jsonb,
    event_hash    text,
    previous_hash text,
    event_timestamp timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_org_time
  ON gov_repo.governance_ledger (organisation_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_type
  ON gov_repo.governance_ledger (event_type);

-- ============================================
-- 2. LEDGER_APPEND FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION gov_repo.ledger_append(
    p_event_type      text,
    p_event_desc      text DEFAULT NULL,
    p_subject_type    text DEFAULT NULL,
    p_subject_id      uuid DEFAULT NULL,
    p_actor_user_id   uuid DEFAULT NULL,
    p_actor_ip        text DEFAULT NULL,
    p_organisation_id uuid DEFAULT NULL,
    p_payload         jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ledger_id     uuid;
    v_previous_hash text;
BEGIN
    -- Get the hash of the last event in this organisation
    SELECT event_hash INTO v_previous_hash
    FROM gov_repo.governance_ledger
    WHERE organisation_id = p_organisation_id
    ORDER BY event_timestamp DESC
    LIMIT 1;

    -- Append to the ledger
    INSERT INTO gov_repo.governance_ledger (
        event_type, event_desc, subject_type, subject_id,
        actor_user_id, actor_ip, organisation_id, payload,
        previous_hash
    )
    VALUES (
        p_event_type, p_event_desc, p_subject_type, p_subject_id,
        p_actor_user_id, p_actor_ip, p_organisation_id, p_payload,
        v_previous_hash
    )
    RETURNING ledger_id INTO v_ledger_id;

    -- Compute and store hash after insert (simplified — real hash needs pgcrypto)
    UPDATE gov_repo.governance_ledger
    SET event_hash = md5(v_ledger_id::text || event_timestamp::text || p_event_type)
    WHERE ledger_id = v_ledger_id;

    RETURN v_ledger_id;
END;
$$;

-- ============================================
-- 3. CODING MEMORY TABLE (PGVector)
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS gov_repo.coding_memory (
    memory_id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organisation_id uuid NOT NULL,
    repository_id   text NOT NULL,
    path            text NOT NULL,
    symbol_type     text NOT NULL,
    symbol_name     text NOT NULL,
    summary         text,
    embedding       vector(1536),
    metadata        jsonb DEFAULT '{}'::jsonb,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coding_memory_org
  ON gov_repo.coding_memory (organisation_id, repository_id);

CREATE INDEX IF NOT EXISTS idx_coding_memory_type
  ON gov_repo.coding_memory (organisation_id, symbol_type);

CREATE INDEX IF NOT EXISTS idx_coding_memory_embedding
  ON gov_repo.coding_memory
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- 4. CODING MEMORY SEARCH FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION gov_repo.coding_memory_search(
    p_organisation_id uuid,
    p_embedding       vector(1536),
    p_limit           int DEFAULT 10,
    p_threshold       float DEFAULT 0.5
)
RETURNS TABLE (
    memory_id   uuid,
    path        text,
    symbol_type text,
    symbol_name text,
    summary     text,
    metadata    jsonb,
    similarity  float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.memory_id,
        cm.path,
        cm.symbol_type,
        cm.symbol_name,
        cm.summary,
        cm.metadata,
        (1 - (cm.embedding <=> p_embedding))::float AS similarity
    FROM gov_repo.coding_memory cm
    WHERE cm.organisation_id = p_organisation_id
      AND (1 - (cm.embedding <=> p_embedding)) >= p_threshold
    ORDER BY cm.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$;

-- ============================================
-- FINISHED
-- ============================================
SELECT 'CodeGuard Phase 8.2 database setup complete.' AS result;