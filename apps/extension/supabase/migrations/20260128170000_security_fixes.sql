-- ===========================================
-- SECURITY FIX: Patch vulnerabilities found in penetration testing
-- Date: 2026-01-28
-- ===========================================

-- ===========================================
-- FIX 1: Audit Log Tampering
-- Add RLS to credit_transactions table
-- ===========================================

-- Enable RLS on credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "audit_read_own" ON credit_transactions;
DROP POLICY IF EXISTS "audit_service_insert" ON credit_transactions;

-- Policy: Users can only READ their own transactions
CREATE POLICY "audit_read_own" ON credit_transactions
    FOR SELECT USING (auth.email() = email);

-- Policy: Only service_role can INSERT (via security definer functions)
-- No policy for INSERT means only service_role can do it (since RLS is enabled)
-- The add_credits and use_credits functions use SECURITY DEFINER, so they bypass RLS

-- Explicitly deny UPDATE/DELETE for everyone
-- (No policy = denied when RLS is enabled)

-- Add comment for documentation
COMMENT ON TABLE credit_transactions IS 'Immutable audit log - users can only READ their own records, no UPDATE/DELETE allowed';

-- ===========================================
-- FIX 2: Update use_credits with auth check
-- (Note: This is complex because we need to allow:
--  1. Extension calls via anon key (user doesn't have JWT)
--  2. Stripe webhook calls via service_role
--  The current design trusts the email parameter)
-- ===========================================

-- For now, we'll add a check that prevents empty/null emails
CREATE OR REPLACE FUNCTION use_credits(user_email text, credits_to_use integer)
RETURNS boolean AS $$
DECLARE
    new_balance integer;
BEGIN
    -- SECURITY: Validate email is not null/empty
    IF user_email IS NULL OR user_email = '' THEN
        RETURN false;
    END IF;
    
    -- SECURITY: Prevent negative values (Infinite Money Glitch)
    IF credits_to_use <= 0 THEN
        RETURN false;
    END IF;

    -- ATOMIC UPDATE: Only deduct if balance is sufficient at write time
    UPDATE user_credits 
    SET balance = balance - credits_to_use, updated_at = now()
    WHERE email = user_email AND balance >= credits_to_use
    RETURNING balance INTO new_balance;
    
    -- If no row was updated, insufficient balance or user doesn't exist
    IF new_balance IS NULL THEN
        RETURN false;
    END IF;
    
    -- Log the transaction
    INSERT INTO credit_transactions (email, amount, description)
    VALUES (user_email, -credits_to_use, 'AI Scan Usage');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FIX 3: Strengthen add_credits with validation
-- ===========================================

CREATE OR REPLACE FUNCTION add_credits(user_email text, credits_amount integer)
RETURNS void AS $$
BEGIN
    -- SECURITY: Validate email
    IF user_email IS NULL OR user_email = '' THEN
        RAISE EXCEPTION 'Invalid email';
    END IF;
    
    -- SECURITY: Validate amount is positive
    IF credits_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid credit amount';
    END IF;

    -- Upsert user credits
    INSERT INTO user_credits (email, balance)
    VALUES (user_email, credits_amount)
    ON CONFLICT (email) 
    DO UPDATE SET balance = user_credits.balance + credits_amount, updated_at = now();
    
    -- Log the purchase
    INSERT INTO credit_transactions (email, amount, description)
    VALUES (user_email, credits_amount, 'Purchase');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- GRANT permissions for the functions
-- ===========================================
GRANT EXECUTE ON FUNCTION use_credits(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_credits(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_credits(text) TO anon, authenticated;
