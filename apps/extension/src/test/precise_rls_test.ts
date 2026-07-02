/**
 * Precise RLS verification
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

async function preciseRLSTest() {
    const testEmail = `rls_test_${Date.now()}@test.com`;

    console.log('🔍 PRECISE RLS VERIFICATION\n');
    console.log(`Test email: ${testEmail}\n`);

    // Setup: Create a transaction via admin
    console.log('[SETUP] Creating a test transaction via admin...');
    const { error: setupErr } = await adminClient
        .from('credit_transactions')
        .insert({ email: testEmail, amount: 100, description: 'RLS Test' });

    if (setupErr) {
        console.log('Setup error:', setupErr.message);
        return;
    }
    console.log('   ✅ Test transaction created\n');

    // Test 1: Count before tampering
    const { count: countBefore } = await adminClient
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('email', testEmail);
    console.log(`[1] Transactions before tampering: ${countBefore}`);

    // Test 2: Try to DELETE via anon client
    console.log('\n[2] Attempting DELETE via anon client...');
    const { error: delErr, count: delCount } = await anonClient
        .from('credit_transactions')
        .delete({ count: 'exact' })
        .eq('email', testEmail);

    console.log(`   Error: ${delErr?.message || 'none'}`);
    console.log(`   Deleted count: ${delCount}`);

    // Test 3: Check count after DELETE attempt
    const { count: countAfterDel } = await adminClient
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('email', testEmail);
    console.log(`\n[3] Transactions after DELETE attempt: ${countAfterDel}`);

    const deleteBlocked = countAfterDel === countBefore;
    console.log(`   ${deleteBlocked ? '✅ DELETE was blocked!' : '⚠️ DELETE succeeded - VULNERABLE!'}`);

    // Test 4: Try to UPDATE via anon client
    console.log('\n[4] Attempting UPDATE via anon client...');
    const { error: updErr, count: updCount } = await anonClient
        .from('credit_transactions')
        .update({ amount: 999999 }, { count: 'exact' })
        .eq('email', testEmail);

    console.log(`   Error: ${updErr?.message || 'none'}`);
    console.log(`   Updated count: ${updCount}`);

    // Test 5: Check if amount was changed
    const { data: afterUpdate } = await adminClient
        .from('credit_transactions')
        .select('amount')
        .eq('email', testEmail)
        .single();

    const updateBlocked = afterUpdate?.amount === 100;
    console.log(`\n[5] Amount after UPDATE attempt: ${afterUpdate?.amount}`);
    console.log(`   ${updateBlocked ? '✅ UPDATE was blocked!' : '⚠️ UPDATE succeeded - VULNERABLE!'}`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 RLS VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`DELETE Protection: ${deleteBlocked ? '✅ WORKING' : '❌ VULNERABLE'}`);
    console.log(`UPDATE Protection: ${updateBlocked ? '✅ WORKING' : '❌ VULNERABLE'}`);

    if (deleteBlocked && updateBlocked) {
        console.log('\n🎉 RLS is properly configured!');
    } else {
        console.log('\n⚠️ Need to run: ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;');
    }

    // Cleanup via admin
    await adminClient.from('credit_transactions').delete().eq('email', testEmail);
    console.log('\n[CLEANUP] Test data removed.');
}

preciseRLSTest().catch(console.error);
