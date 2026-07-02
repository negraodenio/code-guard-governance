-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Repositories table to track parsed open-source or uploaded repos
create table if not exists repositories (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references auth.users(id) on delete cascade not null,
    github_url text unique not null,
    name text not null,
    branch text default('main'),
    last_indexed_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- Enable RLS for Repositories
alter table repositories enable row level security;
create policy "Users can manage their own repositories" on repositories
    for all using (auth.uid() = owner_id);

-- Documents table to track individual code files within a repo
create table if not exists repo_documents (
    id uuid primary key default gen_random_uuid(),
    repo_id uuid references repositories(id) on delete cascade not null,
    file_path text not null,
    content text not null,
    content_hash text not null, -- to prevent re-indexing unchanged files
    language text,
    tokens int,
    created_at timestamp with time zone default now(),
    unique(repo_id, file_path)
);

-- Enable RLS for Documents
alter table repo_documents enable row level security;
create policy "Users can view their repo documents" on repo_documents
    for select using (auth.uid() = (select owner_id from repositories where id = repo_id));
create policy "Users can insert their repo documents" on repo_documents
    for insert with check (auth.uid() = (select owner_id from repositories where id = repo_id));
create policy "Users can delete their repo documents" on repo_documents
    for delete using (auth.uid() = (select owner_id from repositories where id = repo_id));

-- Embeddings table (Vector store for RAG)
create table if not exists repo_embeddings (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references repo_documents(id) on delete cascade not null,
    chunk_content text not null,
    embedding vector(1024) not null, -- Mistral `mistral-embed` provides 1024 dimensions
    created_at timestamp with time zone default now()
);

-- Create a HNSW index for fast nearest-neighbor search
create index on repo_embeddings using hnsw (embedding vector_cosine_ops);

-- Enable RLS for Embeddings
alter table repo_embeddings enable row level security;
create policy "Users can query their own embeddings" on repo_embeddings
    for select using (
        auth.uid() = (
            select owner_id from repositories 
            join repo_documents on repositories.id = repo_documents.repo_id 
            where repo_documents.id = document_id
        )
    );
create policy "Users can insert their own embeddings" on repo_embeddings
    for insert with check (
        auth.uid() = (
            select owner_id from repositories 
            join repo_documents on repositories.id = repo_documents.repo_id 
            where repo_documents.id = document_id
        )
    );
create policy "Users can delete their own embeddings" on repo_embeddings
    for delete using (
        auth.uid() = (
            select owner_id from repositories 
            join repo_documents on repositories.id = repo_documents.repo_id 
            where repo_documents.id = document_id
        )
    );

-- Match Documents Function (Vector Search)
create or function match_repo_chunks (
  query_embedding vector(1024),
  match_count int default 5,
  filter_repo_id uuid default null
) returns table (
  id uuid,
  document_id uuid,
  file_path text,
  chunk_content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    e.document_id,
    d.file_path,
    e.chunk_content,
    1 - (e.embedding <=> query_embedding) as similarity
  from repo_embeddings e
  join repo_documents d on e.document_id = d.id
  where (filter_repo_id is null or d.repo_id = filter_repo_id)
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;
