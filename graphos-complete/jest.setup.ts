import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '.env.local') });

process.env.AUDIT_SECRET ??= 'local-test-audit-secret-64-characters-minimum-value';
process.env.IP_SALT ??= 'local-test-ip-salt';
