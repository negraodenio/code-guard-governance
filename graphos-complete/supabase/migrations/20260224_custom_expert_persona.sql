-- Custom Expert Persona — Enterprise Feature
-- Allows companies to upload docs and train a private AI persona for debates

-- Table: Custom Personas
create table if not exists custom_personas (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    role text not null default 'Internal Strategic Advisor',
    description text,
    color text default '#6366f1',
    emoji text default '🏢',
    document_count int default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table custom_personas enable row level security;
create policy "Users manage own personas" on custom_personas
    for all using (auth.uid() = user_id);

-- Table: Custom Persona Documents (tracks uploaded files)
create table if not exists custom_persona_documents (
    id uuid default gen_random_uuid() primary key,
    persona_id uuid references custom_personas(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    filename text not null,
    file_type text default 'txt',
    file_size_bytes int default 0,
    chunk_count int default 0,
    status text default 'processing',
    error_message text,
    created_at timestamptz default now()
);

-- Enable RLS
alter table custom_persona_documents enable row level security;
create policy "Users manage own persona docs" on custom_persona_documents
    for all using (auth.uid() = user_id);

-- Extend repo_embeddings to optionally link to custom personas
-- This makes document_id nullable for persona embeddings (which don't use repo_documents)
alter table repo_embeddings alter column document_id drop not null;
alter table repo_embeddings add column if not exists persona_id uuid references custom_personas(id) on delete cascade;
alter table repo_embeddings add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Additional RLS policy for persona-based embeddings (no repo join needed)
create policy "Users can manage persona embeddings" on repo_embeddings
    for all using (
        user_id = auth.uid()
        or auth.uid() = (
            select owner_id from repositories 
            join repo_documents on repositories.id = repo_documents.repo_id 
            where repo_documents.id = document_id
        )
    );

-- Vector search function for custom persona chunks
create or replace function match_persona_chunks(
    query_embedding vector(1024),
    p_persona_id uuid,
    match_count int default 5
) returns table (
    id uuid,
    chunk_content text,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        e.id,
        e.chunk_content,
        1 - (e.embedding <=> query_embedding) as similarity
    from repo_embeddings e
    where e.persona_id = p_persona_id
    order by e.embedding <=> query_embedding
    limit match_count;
end;
$$;
