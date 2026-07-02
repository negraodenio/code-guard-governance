-- Sprint 3: Scale & Compliance

-- 1. Add roles to profiles
alter table public.profiles add column if not exists role text default 'user';

-- 2. Add last_commit_sha to repositories
alter table public.repositories add column if not exists last_commit_sha text;

-- 3. Upgrade repo_files to support versioning/content signatures
alter table public.repo_files add column if not exists commit_sha text;
alter table public.repo_files add column if not exists content_sha text;
alter table public.repo_files add column if not exists byte_size bigint;

-- rename column if needed (safely)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='repo_files' and column_name='full_content') then
    alter table public.repo_files rename column full_content to content;
  end if;
end $$;

-- Update unique constraint for repo_files
alter table public.repo_files drop constraint if exists repo_files_repo_id_file_path_key;
alter table public.repo_files add constraint repo_files_repo_id_commit_file_unique unique(repo_id, commit_sha, file_path);

-- 4. Sync History Table
create table if not exists public.repo_sync_history (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references repositories(id) on delete cascade,
  commit_sha text not null,
  files_added int default 0,
  files_modified int default 0,
  files_deleted int default 0,
  chunks_written int default 0,
  sync_type text check (sync_type in ('full', 'incremental')),
  created_at timestamptz default now()
);

-- 5. Coding Memory (Chunks for RAG)
create table if not exists public.coding_memory (
  id text primary key, -- handles nanoid or uuid
  tenant_id uuid references tenants(id) on delete cascade,
  repo_id uuid references repositories(id) on delete cascade,
  file_path text not null,
  start_line int not null,
  end_line int not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS for new tables
alter table public.repo_sync_history enable row level security;
alter table public.coding_memory enable row level security;

-- Audit View
create or replace view audit_trail as
select
  v.id as validation_id,
  v.tenant_id,
  v.user_id,
  v.region,
  v.sensitivity,
  v.created_at as session_start,
  v.status,
  (select count(*) from ai_logs where ai_logs.validation_id = v.id) as ai_calls_count,
  (select sum(cost_usd) from ai_logs where ai_logs.validation_id = v.id) as total_cost_usd,
  (select count(*) from code_patches where code_patches.validation_id = v.id) as patches_count,
  (select count(*) from code_patches where code_patches.validation_id = v.id and status = 'applied') as patches_applied
from validations v
order by v.created_at desc;
