-- Compliance Infrastructure v2
-- Tables for consent management, data subject rights, retention, breach notification

-- 1. Consents
create table if not exists public.consents (
  id text primary key,
  user_id uuid not null,
  purposes text[] not null,
  legal_basis text not null,
  granted_at timestamptz default now(),
  expires_at timestamptz not null,
  ip_hash text,
  user_agent text,
  proof_hash text not null,
  withdrawn_at timestamptz,
  constraint consents_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- 2. Data Subject Requests (GDPR Art. 15-22 / LGPD Art. 17-22)
create table if not exists public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  request_type text not null check (request_type in ('ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'OBJECTION', 'RESTRICTION')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  details jsonb default '{}'::jsonb,
  submitted_at timestamptz default now(),
  completed_at timestamptz,
  response_payload jsonb,
  rejection_reason text,
  constraint data_subject_requests_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- 3. Retention Policies
create table if not exists public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  retention_days int not null,
  action text not null default 'anonymize' check (action in ('delete', 'anonymize', 'archive')),
  enabled boolean default true,
  created_at timestamptz default now()
);

-- Insert default retention policies
insert into public.retention_policies (table_name, retention_days, action) values
  ('audit_logs', 365, 'anonymize'),
  ('debate_events', 180, 'delete'),
  ('validations', 365, 'anonymize'),
  ('consents', 730, 'anonymize'),
  ('usage_records', 730, 'anonymize')
on conflict do nothing;

-- 4. Breach Notifications (GDPR Art. 33-34 / LGPD Art. 48-49)
create table if not exists public.breach_notifications (
  id uuid primary key default gen_random_uuid(),
  detected_at timestamptz not null default now(),
  breach_type text not null,
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description text not null,
  affected_users int default 0,
  data_categories text[],
  containment_actions text,
  notified_dpa_at timestamptz,
  notified_affected_at timestamptz,
  status text default 'investigating' check (status in ('investigating', 'contained', 'resolved', 'closed')),
  resolution_notes text,
  created_at timestamptz default now()
);

-- 5. Processing Activities (GDPR Art. 30)
create table if not exists public.processing_activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  controller text not null default 'CouncilIA Lda.',
  dpo_email text not null default 'dpo@councilia.com',
  purposes text[] not null,
  data_categories text[] not null,
  data_subjects text[] not null,
  legal_basis text not null,
  retention_period text not null,
  technical_measures text[],
  organizational_measures text[],
  international_transfers boolean default false,
  transfer_safeguards text,
  dpia_required boolean default false,
  dpia_status text default 'not_required' check (dpia_status in ('not_required', 'pending', 'approved', 'review_required')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default processing activities
insert into public.processing_activities (name, purposes, data_categories, data_subjects, legal_basis, retention_period, technical_measures, organizational_measures, dpia_required, dpia_status) values
  (
    'AI Decision Analysis',
    '{"DECISION_ANALYSIS", "AUDIT_TRAIL"}',
    '{"proposal_text", "decision_metadata", "persona_analysis"}',
    '{"users", "clients"}',
    'CONSENT',
    '12 months after session completion',
    '{"AES-256 encryption", "HMAC audit chain", "PII redaction"}',
    '{"Access control (RBAC)", "DPO supervision", "Annual audit"}',
    true,
    'pending'
  ),
  (
    'Compliance Auditing',
    '{"REGULATORY_COMPLIANCE", "AUDIT_TRAIL"}',
    '{"audit_logs", "session_records", "consent_records"}',
    '{"users", "regulatory_bodies"}',
    'LEGAL_OBLIGATION',
    '5 years',
    '{"Immutable logs", "HMAC signatures", "Encrypted storage"}',
    '{"Designated DPO", "Retention schedule", "Access logs"}',
    false,
    'not_required'
  ),
  (
    'Model Improvement (Anonymized)',
    '{"MODEL_IMPROVEMENT"}',
    '{"anonymized_metrics", "aggregated_scores"}',
    '{"users"}',
    'LEGITIMATE_INTEREST',
    '24 months',
    '{"Anonymization pipeline", "Differential privacy"}',
    '{"Data minimization policy", "Opt-out mechanism"}',
    false,
    'not_required'
  )
on conflict do nothing;

-- RLS
alter table public.consents enable row level security;
alter table public.data_subject_requests enable row level security;
alter table public.retention_policies enable row level security;
alter table public.breach_notifications enable row level security;
alter table public.processing_activities enable row level security;

-- RLS policies
create policy "Users can read own consents" on public.consents
  for select using (auth.uid() = user_id);
create policy "Service role full access consents" on public.consents
  using (true) with check (true);

create policy "Users can read own requests" on public.data_subject_requests
  for select using (auth.uid() = user_id);
create policy "Service role full access requests" on public.data_subject_requests
  using (true) with check (true);

create policy "Service role full access retention" on public.retention_policies
  using (true) with check (true);

create policy "Service role full access breaches" on public.breach_notifications
  using (true) with check (true);

create policy "Service role full access activities" on public.processing_activities
  using (true) with check (true);
