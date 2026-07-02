-- billing sets
create table if not exists public.subscriptions (
  id text primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  stripe_customer_id text,
  status text,
  plan text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  period_month text not null, -- YYYY-MM
  validations_count int default 0,
  patches_count int default 0,
  ai_calls_count int default 0,
  total_cost_usd numeric default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(tenant_id, period_month)
);

-- invites
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  invited_by uuid not null references profiles(id),
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- repo permissions
create table if not exists public.repo_permissions (
  id bigserial primary key,
  repo_id uuid not null references repositories(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  can_read boolean default true,
  can_sync boolean default false,
  can_patch boolean default false,
  created_at timestamptz default now(),
  unique(repo_id, user_id)
);

-- webhooks
create table if not exists public.webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  url text not null,
  events text[] not null,
  secret text not null, -- hmac secret
  active boolean default true,
  created_at timestamptz default now()
);

-- council templates
create table if not exists public.council_templates (
  id text primary key,
  name text not null,
  description text not null,
  vertical text not null,
  region text not null,
  sensitivity text not null,
  front_models jsonb not null,
  judge_config jsonb not null,
  public boolean default true,
  created_at timestamptz default now()
);

-- RLS
alter table public.subscriptions enable row level security;
alter table public.usage_records enable row level security;
alter table public.invites enable row level security;
alter table public.repo_permissions enable row level security;
alter table public.webhook_subscriptions enable row level security;
alter table public.council_templates enable row level security;

-- Policies
create policy "users read own tenant subscription" on public.subscriptions for select using (tenant_id in (select tenant_id from profiles where id = auth.uid()));
create policy "users read own tenant usage" on public.usage_records for select using (tenant_id in (select tenant_id from profiles where id = auth.uid()));
create policy "invites admin only" on public.invites for all using (exists (select 1 from profiles where id = auth.uid() and profiles.tenant_id = invites.tenant_id and profiles.role = 'admin'));
create policy "repo_permissions self read" on public.repo_permissions for select using (user_id = auth.uid());
create policy "webhooks admin only" on public.webhook_subscriptions for all using (exists (select 1 from profiles where id = auth.uid() and profiles.tenant_id = webhook_subscriptions.tenant_id and profiles.role = 'admin'));
create policy "templates public read" on public.council_templates for select using (public = true);

-- Seed templates
INSERT INTO council_templates (id, name, description, vertical, region, sensitivity, front_models, judge_config, public) VALUES
('fintech_eu_strict', 'FinTech EU Strict', 'EU-first routing with ZDR for financial compliance', 'fintech', 'EU', 'regulated', '[{"key":"deepseek","label":"DeepSeek","provider":"openrouter","model":"deepseek/deepseek-chat","color":"#FF00FF"},{"key":"mistral","label":"Mistral","provider":"mistral","model":"mistral-large-latest","color":"#3b82f6"}]'::jsonb, '{"provider":"openrouter","primary":"openai/gpt-5.2","fallback":"anthropic/claude-opus-4.5","zdr":true,"allowlist":["OpenAI","Anthropic","Mistral"]}'::jsonb, true),
('healthtech_us', 'HealthTech US (HIPAA)', 'HIPAA-compliant routing with PII redaction', 'healthtech', 'US', 'pii', '[{"key":"llama","label":"Llama","provider":"openrouter","model":"meta-llama/llama-3.1-70b-instruct","color":"#FFBF00"},{"key":"mistral","label":"Mistral","provider":"mistral","model":"mistral-large-latest","color":"#3b82f6"}]'::jsonb, '{"provider":"openrouter","primary":"openai/gpt-5.2","zdr":true,"allowlist":["OpenAI","Anthropic"]}'::jsonb, true),
('legaltech_apac', 'LegalTech APAC', 'Multi-region council for legal document analysis', 'legaltech', 'APAC', 'business', '[{"key":"deepseek","label":"DeepSeek","provider":"siliconflow","model":"deepseek-r1","color":"#FF00FF"},{"key":"qwen","label":"Qwen","provider":"siliconflow","model":"qwen2.5-72b-instruct","color":"#00FFFF"}]'::jsonb, '{"provider":"openrouter","primary":"openai/gpt-5.2","zdr":false}'::jsonb, true)
on conflict do nothing;
