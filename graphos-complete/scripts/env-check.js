#!/usr/bin/env node
/**
 * env-check.js — CodeGuard AI Governance OS
 * Validates required environment variables before starting the server.
 * Run: node env-check.js
 */

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

let hasErrors = false;

console.log('\n🔍 CodeGuard — Environment Check\n' + '─'.repeat(40));

// Check required
for (const { key, hint } of REQUIRED) {
  if (!process.env[key]) {
    console.error(`❌ MISSING: ${key}`);
    console.error(`   → ${hint}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key}`);
  }
}

// Check optional
console.log('\n📋 Optional (with impact if missing):');
for (const { key, impact } of OPTIONAL_WITH_IMPACT) {
  if (!process.env[key]) {
    console.warn(`⚠️  ${key} not set`);
    console.warn(`   ${impact}`);
  } else {
    console.log(`✅ ${key}`);
  }
}

console.log('─'.repeat(40));

if (hasErrors) {
  console.error('\n💥 Missing required env vars. Server will not start correctly.\n');
  process.exit(1);
} else {
  console.log('\n✅ All required env vars present. Good to go.\n');
}
