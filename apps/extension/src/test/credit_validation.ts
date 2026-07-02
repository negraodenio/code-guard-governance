
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env manually to avoid 'dotenv' dependency issues in standalone script
const envPath = path.join(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);

try {
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, { encoding: 'utf8' });
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
        console.log('.env loaded successfully.');
    } else {
        console.warn('.env file not found.');
    }
} catch (e) {
    console.warn('Could not read .env file, assuming env vars are set.', e);
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
// Use Service Role Key for Setup/Teardown, but we should test with Anon Key ideally?
// Actually logic dictates RPCs are security definer, so Anon Key is fine for use_credits.
// But for this test let's use what we have available.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials (SUPABASE_URL or Keys).');
    process.exit(1);
}

console.log(`Using Supabase URL: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_EMAIL = `test_bot_${Date.now()}@validation.com`;

async function runValidation() {
    console.log('\n--- STARTING CREDIT SYSTEM VALIDATION ---');
    console.log(`Test Subject: ${TEST_EMAIL}`);

    // 1. Create User / Add Credits (Atomic Insert/Update)
    console.log('\n[1] Testing add_credits (Provisioning)...');
    const { error: addErr } = await supabase.rpc('add_credits', {
        user_email: TEST_EMAIL,
        credits_amount: 50
    });

    if (addErr) {
        console.error('FAIL: add_credits returned error:', addErr);
        return;
    }
    console.log('PASS: Credits added.');

    // 2. Verify Balance
    console.log('\n[2] Testing get_credits (Read Consistency)...');
    const { data: balanceMs, error: getErr } = await supabase.rpc('get_credits', { user_email: TEST_EMAIL });

    if (getErr) {
        console.error('FAIL: get_credits returned error:', getErr);
        return;
    }

    if (balanceMs !== 50) {
        console.error(`FAIL: Expected 50, got ${balanceMs}`);
        return;
    }
    console.log(`PASS: Balance matches (50).`);

    // 3. Deduct Credits (Atomic Update)
    console.log('\n[3] Testing use_credits (Atomic Deduction)...');
    const { data: success, error: useErr } = await supabase.rpc('use_credits', {
        user_email: TEST_EMAIL,
        credits_to_use: 10
    });

    if (useErr) console.error('FAIL: RPC Error', useErr);
    if (!success) console.error('FAIL: use_credits returned false (should be true)');
    else console.log('PASS: Deducted 10 credits successfully.');

    // 4. Verify Balance again
    const { data: balanceAfter } = await supabase.rpc('get_credits', { user_email: TEST_EMAIL });
    if (balanceAfter !== 40) console.error(`FAIL: Expected 40, got ${balanceAfter}`);
    else console.log(`PASS: Balance updated to 40.`);

    // 5. Negative Balance Protection
    console.log('\n[4] Testing Overdraft Protection...');
    const { data: overdraftResult } = await supabase.rpc('use_credits', {
        user_email: TEST_EMAIL,
        credits_to_use: 100 // More than 40
    });

    if (overdraftResult === false) console.log('PASS: Overdraft blocked (Returned false).');
    else console.error(`FAIL: Overdraft allowed! Result: ${overdraftResult}`);

    // 6. Concurrency Test
    // We have 40 credits left.
    // We will launch 50 requests of 1 credit.
    // Only 40 should succeed. 10 should fail.
    // Final balance should be 0.
    console.log('\n[5] Testing Concurrency (Race Conditions)...');

    // Set balance to exactly 10 for a tighter race
    // We can't set directly via RPC easily without calculating diff, 
    // but we can drain it or add negative. 
    // Let's just use the 40 we have.
    const START_BALANCE = 40;
    const CONCURRENT_REQUESTS = 50;

    console.log(`Starting concurrency test.`);
    console.log(`Initial Balance: ${START_BALANCE}`);
    console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS} (1 credit each)`);
    console.log(`Expected: 40 Successes, 10 Failures, Final Balance 0`);

    const promises = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        promises.push(supabase.rpc('use_credits', { user_email: TEST_EMAIL, credits_to_use: 1 }));
    }

    const results = await Promise.all(promises);

    // Count successes
    const successCount = results.filter(r => r.data === true).length;
    const failCount = results.filter(r => r.data === false).length;
    const errorCount = results.filter(r => r.error).length;

    console.log(`Results: ${successCount} Success, ${failCount} Fail, ${errorCount} Errors`);

    const { data: finalBal } = await supabase.rpc('get_credits', { user_email: TEST_EMAIL });
    console.log(`Final Balance: ${finalBal}`);

    if (successCount === START_BALANCE && finalBal === 0 && failCount === (CONCURRENT_REQUESTS - START_BALANCE)) {
        console.log('PASS: Concurrency handled perfectly (No Race Conditions).');
    } else {
        console.error('FAIL: Race condition detected!');
        console.error(`Discrepancy: Started with ${START_BALANCE}, used ${successCount}, remaining ${finalBal}.`);
        console.error(`Should remain: ${START_BALANCE - successCount}`);
    }

    console.log('\n--- SECURITY & AUDIT TESTS ---');

    // 7. Test "Infinite Money Glitch" (Negative Input)
    console.log('\n[6] Testing Negative Input Exploit (infinite money)...');
    try {
        const { data: hackResult } = await supabase.rpc('use_credits', {
            user_email: TEST_EMAIL,
            credits_to_use: -1000
        });

        if (hackResult === true) {
            console.error('FAIL: SYSTEM HACKED! Accepted negative value (-1000).');
            const { data: hackedBalance } = await supabase.rpc('get_credits', { user_email: TEST_EMAIL });
            console.error(`New Balance: ${hackedBalance} (Should be 0)`);
        } else {
            console.log('PASS: Negative value rejected.');
        }
    } catch (e) {
        console.log('PASS: Exception thrown on negative value.', e);
    }

    // 8. Audit Log Check
    console.log('\n[7] Verifying Audit Log (credit_transactions)...');
    const { data: logs, error: logErr } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('email', TEST_EMAIL)
        .order('created_at', { ascending: false });

    if (logErr) console.error('FAIL: Could not read logs', logErr);
    else {
        console.log(`Found ${logs.length} transactions.`);
        if (logs.length > 0) {
            console.log('Sample Log:', logs[0]);
            console.log('PASS: Audit trail exists.');
        } else {
            console.error('FAIL: No audit logs found!');
        }
    }

    console.log('\n--- VALIDATION COMPLETE ---');
}

runValidation().catch(console.error);
