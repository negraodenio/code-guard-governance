
-- Enable Vector Extension
create extension if not exists vector;

-- Code Memory Table (RAG)
create table if not exists code_memory (
  id uuid default gen_random_uuid() primary key,
  project_id text not null, -- To segregate multi-tenant Enterprise data
  file_path text not null,
  content_chunk text not null,
  embedding vector(1536), -- OpenAI Ada-002 dimension (or others)
  last_updated timestamp with time zone default now()
);

-- Index for fast retrieval
create index on code_memory using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- RLS (Critical for Enterprise compliance)
alter table code_memory enable row level security;
