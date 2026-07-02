-- GraphOS Phase 4: Topology Storage with pgvector
-- Enables persistent graph storage and vector similarity search

-- 1. Extensions
create extension if not exists vector;

-- 2. Enum types
do $$ begin
  create type entity_kind as enum (
    'agent', 'decision', 'tool', 'external_system',
    'data_asset', 'control', 'regulation', 'certificate',
    'risk', 'incident', 'evidence', 'model', 'owner',
    'cost_center', 'prompt'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type rel_kind as enum (
    'USES_TOOL', 'USES_MODEL', 'USES_PROMPT',
    'ACCESSES_SYSTEM', 'PROCESSES_DATA',
    'MAKES_DECISION', 'GENERATED_BY_PROMPT',
    'EVIDENCED_BY', 'IMPACTS_RISK', 'MITIGATED_BY',
    'GOVERNS', 'REGULATES', 'REQUIRES_CERT',
    'TRIGGERS_INCIDENT', 'APPEALS_CONTROL',
    'OWNED_BY', 'COSTS', 'DEPENDS_ON', 'CONTAINS',
    'MONITORS', 'AUDITS', 'REVIEWS'
  );
exception when duplicate_object then null;
end $$;

-- 3. GraphOS entities table
create table if not exists public.graphos_entities (
  id text primary key,
  kind text not null check (kind::entity_kind is not null),
  label text not null,
  description text,
  attributes jsonb default '{}'::jsonb,
  embedding vector(1536),
  tenant_id uuid,
  source_table text,
  source_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. GraphOS relationships table
create table if not exists public.graphos_relationships (
  id text primary key,
  kind text not null check (kind::rel_kind is not null),
  source_id text not null references public.graphos_entities(id) on delete cascade,
  target_id text not null references public.graphos_entities(id) on delete cascade,
  weight int default 1,
  metadata jsonb default '{}'::jsonb,
  tenant_id uuid,
  created_at timestamptz default now()
);

-- 5. Indexes
create index if not exists idx_graphos_entities_kind on public.graphos_entities using btree (kind);
create index if not exists idx_graphos_entities_attributes on public.graphos_entities using gin (attributes jsonb_path_ops);
create index if not exists idx_graphos_entities_embedding on public.graphos_entities using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_graphos_entities_source on public.graphos_entities (source_table, source_id) where source_table is not null;
create index if not exists idx_graphos_entities_tenant on public.graphos_entities using btree (tenant_id) where tenant_id is not null;
create index if not exists idx_graphos_rels_source_id on public.graphos_relationships using btree (source_id);
create index if not exists idx_graphos_rels_target_id on public.graphos_relationships using btree (target_id);
create index if not exists idx_graphos_rels_kind on public.graphos_relationships using btree (kind);
create index if not exists idx_graphos_rels_tenant on public.graphos_relationships using btree (tenant_id) where tenant_id is not null;

-- 6. Updated_at trigger
create or replace function public.set_graphos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_graphos_entities_updated_at on public.graphos_entities;
create trigger trg_graphos_entities_updated_at
  before update on public.graphos_entities
  for each row
  execute function public.set_graphos_updated_at();

-- 7. Row Level Security
alter table public.graphos_entities enable row level security;
alter table public.graphos_relationships enable row level security;

-- 8. RLS Policies — org-scoped access via profiles.tenant_id
create policy "graphos_entities tenant read"
  on public.graphos_entities for select
  to authenticated
  using (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

create policy "graphos_entities tenant insert"
  on public.graphos_entities for insert
  to authenticated
  with check (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

create policy "graphos_entities tenant update"
  on public.graphos_entities for update
  to authenticated
  using (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  with check (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

create policy "graphos_entities tenant delete"
  on public.graphos_entities for delete
  to authenticated
  using (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

create policy "graphos_relationships tenant read"
  on public.graphos_relationships for select
  to authenticated
  using (source_id IN (
    SELECT g.id FROM public.graphos_entities g
    WHERE g.tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

create policy "graphos_relationships tenant insert"
  on public.graphos_relationships for insert
  to authenticated
  with check (source_id IN (
    SELECT g.id FROM public.graphos_entities g
    WHERE g.tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ) AND target_id IN (
    SELECT g.id FROM public.graphos_entities g
    WHERE g.tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

create policy "graphos_relationships tenant update"
  on public.graphos_relationships for update
  to authenticated
  using (source_id IN (
    SELECT g.id FROM public.graphos_entities g
    WHERE g.tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ))
  with check (source_id IN (
    SELECT g.id FROM public.graphos_entities g
    WHERE g.tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ) AND target_id IN (
    SELECT g.id FROM public.graphos_entities g
    WHERE g.tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

create policy "graphos_relationships tenant delete"
  on public.graphos_relationships for delete
  to authenticated
  using (source_id IN (
    SELECT g.id FROM public.graphos_entities g
    WHERE g.tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

-- 9. Service role bypass policies
create policy "Service role full access entities"
  on public.graphos_entities
  to service_role
  using (true)
  with check (true);

create policy "Service role full access relationships"
  on public.graphos_relationships
  to service_role
  using (true)
  with check (true);

-- 10. Comments
comment on table public.graphos_entities is 'GraphOS topology entities — agents, decisions, tools, risks, regulations, etc.';
comment on table public.graphos_relationships is 'Semantic relationships between graph entities (USES_TOOL, GOVERNS, REGULATES, etc.)';
comment on column public.graphos_entities.embedding is 'Vector embedding (1536d) for semantic similarity search';
comment on column public.graphos_entities.tenant_id is 'Tenant isolation key. FK to public.tenants(id).';
comment on column public.graphos_entities.source_table is 'Origin table in gov_repo (agents, evidence, risk_entries, etc.) for sync tracking.';
comment on column public.graphos_entities.source_id is 'Original UUID in the source table. Enables incremental sync.';
comment on column public.graphos_relationships.metadata is 'Arbitrary key-value metadata per relationship (e.g. access level, verdict)';
comment on column public.graphos_relationships.tenant_id is 'Tenant isolation key. FK to public.tenants(id).';
