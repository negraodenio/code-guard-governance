/**
 * Apply security fixes to Supabase
 * Run with: npx ts-node src/test/apply_security_fixes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, { encoding: 'utf8' }).split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function applySecurityFixes() {
    console.log('Applying security fixes to Supabase...\n');

    // Fix 1: Enable RLS on credit_transactions
    console.log('[1] Enabling RLS on credit_transactions...');
    const { error: rls1 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;'
    });

    if (rls1) {
        // Try alternative: direct SQL via REST
        console.log('   RPC not available, will need to apply via Dashboard or psql');
        console.log('   Error:', rls1.message);
    } else {
        console.log('   ✅ RLS enabled');
    }

    // Fix 2: Create RLS policy for read-only
    console.log('\n[2] Creating RLS policy for audit read-only...');
    const { error: policy1 } = await supabase.rpc('exec_sql', {
        sql: `
            DROP POLICY IF EXISTS "audit_read_own" ON credit_transactions;
            CREATE POLICY "audit_read_own" ON credit_transactions
                FOR SELECT USING (auth.email() = email);
        `
    });

    if (policy1) {
        console.log('   Error:', policy1.message);
    } else {
        console.log('   ✅ Policy created');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('⚠️  NOTE: If RPC failed, you need to run the SQL manually!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nGo to: https://supabase.com/dashboard/project/pslkphlxfpvbvybbekee/sql/new');
    console.log('\nThen paste and run the following SQL:\n');

    const sqlFix = fs.readFileSync(
        path.join(__dirname, '../../supabase/migrations/20260128170000_security_fixes.sql'),
        'utf8'
    );
    console.log(sqlFix);
}

applySecurityFixes().catch(console.error);
