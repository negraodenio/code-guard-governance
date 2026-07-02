-- Phase 4.0: Full File Storage Table

create table if not exists repo_files (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references repositories(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  file_path text not null,
  full_content text not null,
  sha text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(repo_id, file_path)
);

alter table repo_files enable row level security;

-- Index for fast lookup by path
create index if not exists idx_repo_files_repo_path on repo_files(repo_id, file_path);
