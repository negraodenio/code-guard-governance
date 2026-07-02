-- Audit Logs Table for LGPD/GDPR/BCB compliance
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  user_id text,
  session_id text,
  consent_id text,
  purposes text[],
  decision text,
  justification text,
  timestamp timestamptz not null default now(),
  gdpr_article text,
  severity text not null default 'LOW' check (severity in ('LOW', 'MEDIUM', 'HIGH')),
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_audit_logs_type on public.audit_logs(type);

create policy "Admins can read audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Service role can insert audit logs"
  on public.audit_logs for insert
  with check (true);
