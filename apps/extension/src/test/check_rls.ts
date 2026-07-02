/**
 * Test if RLS is enabled and working
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
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

async function checkRLS() {
    console.log('🔍 Checking RLS status on credit_transactions...\n');

    // Test 1: Check if RLS blocks DELETE with anon client
    console.log('[1] Testing DELETE with anon client...');
    const { error: delErr } = await anonClient
        .from('credit_transactions')
        .delete()
        .eq('email', 'test@test.com');

    console.log('   Delete result:', delErr ? `BLOCKED (${delErr.code}: ${delErr.message})` : 'ALLOWED ⚠️');

    // Test 2: Check if RLS blocks UPDATE with anon client
    console.log('\n[2] Testing UPDATE with anon client...');
    const { error: updErr } = await anonClient
        .from('credit_transactions')
        .update({ amount: 999 })
        .eq('email', 'test@test.com');

    console.log('   Update result:', updErr ? `BLOCKED (${updErr.code}: ${updErr.message})` : 'ALLOWED ⚠️');

    // Test 3: Check if SELECT works
    console.log('\n[3] Testing SELECT with anon client...');
    const { data, error: selErr } = await anonClient
        .from('credit_transactions')
        .select('*')
        .limit(1);

    console.log('   Select result:', selErr ? `Error: ${selErr.message}` : `OK, ${data?.length || 0} rows`);

    // Test 4: Check RLS enabled status via admin
    console.log('\n[4] Checking RLS status in pg_tables...');
    const { data: rlsData, error: rlsErr } = await adminClient
        .from('pg_catalog.pg_tables')
        .select('tablename, rowsecurity')
        .eq('tablename', 'credit_transactions')
        .single();

    if (rlsErr) {
        console.log('   Cannot query pg_tables directly');
    } else {
        console.log('   RLS status:', rlsData?.rowsecurity ? 'ENABLED ✅' : 'DISABLED ⚠️');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    if (delErr && updErr) {
        console.log('✅ RLS is working - DELETE and UPDATE are blocked!');
    } else {
        console.log('⚠️ RLS may not be working properly');
        console.log('\nMake sure you ran this SQL in Supabase:');
        console.log('  ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;');
    }
}

checkRLS().catch(console.error);
