-- Create the table for storing leads
create table public.leads (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  source text default 'vscode-extension',
  version text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.leads enable row level security;

-- Create policy to allow ANYONE (Anon) to INSERT leads
-- This is necessary because the plugin runs on user machines without authentication
create policy "Allow public insert to leads"
on public.leads
for insert
to anon
with check (true);

-- Create policy to allow ONLY SERVICE_ROLE to SELECT/DELETE (Admin only)
-- Prevents public from reading your leads list
create policy "Allow service_role full access"
on public.leads
for all
to service_role
using (true)
with check (true);
