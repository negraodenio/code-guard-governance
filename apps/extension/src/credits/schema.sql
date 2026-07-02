-- ===========================================
-- USER CREDITS TABLE (Pay-Per-Use System)
-- ===========================================

-- Enable UUID extension if not exists
create extension if not exists "uuid-ossp";

-- User Credits Table (A "Carteira Digital")
create table if not exists user_credits (
    id uuid default uuid_generate_v4() primary key,
    email text not null unique,
    balance integer default 0 not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Index for fast email lookup
create index if not exists idx_user_credits_email on user_credits(email);

-- RLS (Row Level Security)
alter table user_credits enable row level security;

-- Policy: Users can only see their own balance
drop policy if exists "Users can view own credits" on user_credits;
create policy "Users can view own credits" on user_credits
    for select using (auth.email() = email);

-- Policy: Only backend (service role) can update balance
drop policy if exists "Service role can manage credits" on user_credits;
create policy "Service role can manage credits" on user_credits
    for all using (auth.role() = 'service_role');

-- ===========================================
-- CREDIT TRANSACTIONS LOG (Audit Trail)
-- ===========================================

create table if not exists credit_transactions (
    id uuid default uuid_generate_v4() primary key,
    email text not null,
    amount integer not null, -- Positive = purchase, Negative = usage
    description text,
    created_at timestamp with time zone default now()
);

-- Index for transaction history
create index if not exists idx_credit_transactions_email on credit_transactions(email);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function: Add credits (after payment)
create or replace function add_credits(user_email text, credits_amount integer)
returns void as $$
begin
    insert into user_credits (email, balance)
    values (user_email, credits_amount)
    on conflict (email) 
    do update set balance = user_credits.balance + credits_amount, updated_at = now();
    
    insert into credit_transactions (email, amount, description)
    values (user_email, credits_amount, 'Purchase');
end;
$$ language plpgsql security definer;

-- Function: Use credits (deduct)
create or replace function use_credits(user_email text, credits_to_use integer)
returns boolean as $$
declare
    new_balance integer;
begin
    -- SECURITY FIX: Prevent logical negative values (Infinite Money Glitch)
    if credits_to_use <= 0 then
        return false;
    end if;

    -- CRITICALLY FIXED: Atomic Update to prevent Race Conditions
    -- We only update IF the row has enough balance at the exact moment of write.
    
    update user_credits 
    set balance = balance - credits_to_use, updated_at = now()
    where email = user_email and balance >= credits_to_use
    returning balance into new_balance;
    
    -- If no row was updated (new_balance is null), it means either:
    -- 1. User doesn't exist
    -- 2. Balance was insufficient
    if new_balance is null then
        return false;
    end if;
    
    insert into credit_transactions (email, amount, description)
    values (user_email, -credits_to_use, 'AI Scan Usage');
    
    return true;
end;
$$ language plpgsql security definer;

-- Function: Check balance
create or replace function get_credits(user_email text)
returns integer as $$
declare
    current_balance integer;
begin
    select balance into current_balance from user_credits where email = user_email;
    return coalesce(current_balance, 0);
end;
$$ language plpgsql security definer;
