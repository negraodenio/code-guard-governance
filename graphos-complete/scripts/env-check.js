#!/usr/bin/env node
/**
 * env-check.js — CodeGuard AI Governance OS
 * Validates environment variables. Loads .env / .env.local if present.
 */

try {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
} catch (e) {
  // dotenv optional
}

const REQUIRED = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', hint: 'Supabase project URL (dashboard → Settings → API)' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', hint: 'Supabase anon/public key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', hint: 'Supabase service role key (keep secret)' },
];

const OPTIONAL_WITH_IMPACT = [
  { key: 'UPSTASH_REDIS_REST_URL', impact: '🔴 Rate limiting DISABLED — APIs unprotected' },
  { key: 'UPSTASH_REDIS_REST_TOKEN', impact: '🔴 Rate limiting DISABLED — APIs unprotected' },
  { key: 'CRON_SECRET', impact: '🟡 Cron rescan endpoint accepts unauthenticated requests' },
  { key: 'GRAPHOS_TENANT_ID', impact: '🟡 GraphOS uses default tenant — may show wrong org data' },
  { key: 'GRAPHOS_ORG_ID', impact: '🟡 GraphOS uses default org — may show wrong org data' },
  { key: 'GITHUB_TOKEN', impact: '🟡 Scanner limited to public repos only' },
  { key: 'OPENROUTER_API_KEY', impact: '🟡 CouncilIA debate chamber disabled' },
];

let hasMissingRequired = false;

console.log('\n🔍 CodeGuard — Environment Check\n' + '─'.repeat(40));

// Check required
for (const { key, hint } of REQUIRED) {
  if (!process.env[key]) {
    console.warn(`⚠️  MISSING: ${key} (In-memory mock fallback will be used if available)`);
    hasMissingRequired = true;
  } else {
    console.log(`✅ ${key}`);
  }
}

// Check optional
console.log('\n📋 Optional services status:');
for (const { key, impact } of OPTIONAL_WITH_IMPACT) {
  if (!process.env[key]) {
    console.log(`⚪ ${key}: Not configured (${impact})`);
  } else {
    console.log(`✅ ${key}`);
  }
}

console.log('─'.repeat(40) + '\n');
