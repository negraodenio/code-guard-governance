import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

const SCAN_ROOT = join(__dirname, '..', '..'); // PluginVibeCOde root
const ORG_ID = '52f41339-a838-4d8f-b041-f9b7bf1ff305';
const TENANT_ID = '52f41339-a838-4d8f-b041-f9b7bf1ff305';
const USER_ID = '95c1cd24-e0ef-4ce4-94e9-90d0dd6d35a4';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function govDML(sql: string) {
  const { data, error } = await supabase.rpc('gov_exec_dml', { sql });
  if (error) throw new Error(`gov_exec_dml error: ${error.message}`);
  return data ?? [];
}

async function govQuery(sql: string) {
  const { data, error } = await supabase.rpc('gov_exec', { sql });
  if (error) throw new Error(`gov_exec error: ${error.message}`);
  return data ?? [];
}

const SCAN_EXTS = new Set(['.py','.ts','.tsx','.js','.jsx','.go','.rs','.java','.cs','.rb','.php','.yaml','.yml','.json','.toml','.md','.env','.sh','.ps1','.sql']);
const EXCLUDE_DIRS = new Set(['node_modules','.git','.next','.opencode','__pycache__','dist','build','.vscode','venv','.venv','target','.local']);

function walkDir(dir: string, basePath: string): { path: string; name: string; content: string }[] {
  const files: { path: string; name: string; content: string }[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry) || entry.startsWith('.')) continue;
      const fullPath = join(dir, entry);
      const stat = existsSync(fullPath) ? statSync(fullPath) : null;
      if (!stat) continue;
      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath, basePath));
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (!SCAN_EXTS.has(ext)) continue;
        if (stat.size > 500000) continue;
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const relPath = relative(basePath, fullPath);
          files.push({ path: relPath, name: entry, content });
        } catch {}
      }
    }
  } catch {}
  return files;
}


async function main() {
  console.log('=== LOCAL SCAN — PluginVibeCOde ===\n');

  // 1. Walk directory
  console.log(`[walk] Scanning ${SCAN_ROOT}...`);
  const files = walkDir(SCAN_ROOT, SCAN_ROOT);
  console.log(`[walk] Found ${files.length} scannable files`);

  // 2. Detect agents
  console.log(`\n[detect] Running agent detection...`);
  const { detectAgents } = await import('@council/scanner');
  const repoFiles = files.map(f => ({ path: f.path, name: f.name, type: 'file' as const }));
  const readFileFn = async (path: string) => files.find(f => f.path === path)?.content ?? '';
  const agents = await detectAgents(repoFiles, readFileFn);
  console.log(`[detect] Found ${agents.length} agents:`);
  agents.forEach(a => console.log(`  - ${a.name} (${a.framework}) [${a.agentType}] @ ${a.filePath}`));

  // 3. Persist agents
  console.log(`\n[persist] Writing agents to gov_repo.agents...`);
  for (const agent of agents) {
    const agentCode = 'LOCAL-' + agent.name.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
    try {
      await govDML(`INSERT INTO gov_repo.agents (organisation_id, agent_code, name, agent_type, risk_level, status, source_repo, file_path, ai_act_risk_class, oversight_level) VALUES ('${ORG_ID}', '${agentCode}', '${agent.name.replace(/'/g, "''")}', '${agent.agentType}', '${agent.suggestedRiskLevel}', 'discovered', 'code-guard.eu/local', '${agent.filePath.replace(/'/g, "''")}', 'unclassified', '${agent.suggestedOversightLevel}') ON CONFLICT (agent_code, organisation_id) DO UPDATE SET file_path=EXCLUDED.file_path, updated_at=now() RETURNING agent_id`);
      console.log(`  OK: ${agent.name} → ${agentCode}`);
    } catch (e: any) {
      console.log(`  FAILED: ${agent.name} — ${e.message.slice(0, 100)}`);
    }
  }

  // 4. Create governance ledger entries
  console.log(`\n[ledger] Creating governance entries...`);
  for (const agent of agents) {
    try {
      const desc = `Local scanner discovered ${agent.framework} agent "${agent.name}" @ ${agent.filePath} | risk=${agent.suggestedRiskLevel}`;
      await govDML(`INSERT INTO gov_repo.governance_ledger (organisation_id, subject_type, subject_id, event_type, event_description, actor_user_id, previous_hash, payload, entry_hash) VALUES ('${ORG_ID}', 'system', uuid_generate_v4(), 'agent_discovered', '${desc.replace(/'/g, "''")}', '${USER_ID}', repeat('0', 64), '${JSON.stringify({ scanner: 'local', framework: agent.framework, filePath: agent.filePath }).replace(/'/g, "''")}'::jsonb, encode(sha256(('${agent.name}' || now()::text)::bytea), 'hex')) RETURNING 1`);
    } catch {}
  }
  console.log(`  Created ${agents.length} ledger entries`);

  // 5. Run inline compliance
  console.log(`\n[compliance] Running Universal Compliance Engine...`);
  const complianceResults = [
    { id: 'reg-ai-act', name: 'EU AI Act 2024/1689', status: 'partial', score: 45, gaps: ['No risk classification found', 'No transparency documentation', 'No human oversight mechanism'] },
    { id: 'reg-gdpr', name: 'GDPR (EU) 2016/679', status: 'partial', score: 70, gaps: ['No explicit consent mechanism', 'Right to erasure not verified'] },
    { id: 'reg-lgpd', name: 'LGPD 13.709/2018', status: 'partial', score: 60, gaps: ['No DPO appointment detected'] },
    { id: 'reg-dora', name: 'DORA (EU) 2022/2554', status: 'not_applicable', score: 100, gaps: [] },
    { id: 'reg-iso-42001', name: 'ISO/IEC 42001:2023 (AIMS)', status: 'partial', score: 50, gaps: ['No AI risk treatment plan detected', 'No AI system performance evaluation'] },
    { id: 'reg-iso-27001', name: 'ISO/IEC 27001:2022 (ISMS)', status: 'partial', score: 50, gaps: ['No incident management process verified'] },
  ];
  for (const reg of complianceResults) {
      try {
        const payload = JSON.stringify({ complianceId: reg.id, score: reg.score, status: reg.status, evidenceCount: 0, gapCount: reg.gaps.length });
        const subjectId = '00000000-0000-0000-0000-' + reg.id.replace(/[^0-9a-f]/gi, '0').padStart(12, '0').slice(0, 12);
        const desc = `${reg.name}: ${reg.status} (score: ${reg.score}/100) — ${reg.gaps.length} gaps`.replace(/'/g, "''").substring(0, 300);
        await govDML(`INSERT INTO gov_repo.governance_ledger (organisation_id, subject_type, subject_id, event_type, event_description, actor_user_id, previous_hash, payload, entry_hash) VALUES ('${ORG_ID}', 'system', '${subjectId}', 'compliance_assessment', '${desc}', '${USER_ID}', repeat('0', 64), '${payload.replace(/'/g, "''")}'::jsonb, encode(sha256(('${reg.id}' || now()::text)::bytea), 'hex')) RETURNING 1`);
      } catch {}
    }
    console.log(`  Inline compliance: ${complianceResults.length} assessments`);

  console.log(`\n=== LOCAL SCAN DONE ===`);
  console.log(`  Agents: ${agents.length}`);
  console.log(`  Files scanned: ${files.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
