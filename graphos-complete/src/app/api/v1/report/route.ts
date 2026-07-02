import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Board Ready Report — AI Act / Governance readiness
// GET /api/v1/report               → latest scan, JSON
// GET /api/v1/report?scanId=...    → specific scan
// GET /api/v1/report?format=pdf    → PDF (pdfkit)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TENANT_ID = '52f41339-a838-4d8f-b041-f9b7bf1ff305';
const ORG_ID = process.env.GRAPHOS_ORG_ID ?? process.env.GRAPHOS_TENANT_ID ?? DEFAULT_TENANT_ID;
const TENANT_ID = process.env.GRAPHOS_TENANT_ID ?? ORG_ID;

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function govQuery(sql: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('gov_exec', { sql });
  if (error) throw new Error(`gov_exec: ${error.message}`);
  return data ?? [];
}

async function buildReport(scanId?: string | null) {
  const supabase = getSupabase();

  // 1. Scan session (latest or specific)
  let q = supabase.from('graphos_entities')
    .select('id,label,description,attributes,created_at')
    .eq('kind', 'evidence')
    .filter('attributes->>type', 'eq', 'scan_session')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(1);
  if (scanId) q = q.filter('attributes->>scanId', 'eq', scanId);
  const { data: sessions, error } = await q;
  if (error) throw new Error(error.message);
  const session = sessions?.[0];
  if (!session) throw new Error('Nenhum scan encontrado. Execute um scan primeiro.');
  const attrs = (session.attributes ?? {}) as Record<string, any>;

  // 2. Agent registry aggregates (gov_repo — single source of truth)
  let registry: Record<string, any> = {};
  try {
    const byStatus = await govQuery(`SELECT status, count(*)::int AS n FROM gov_repo.agents WHERE organisation_id = '${ORG_ID}' GROUP BY status`);
    const byRisk = await govQuery(`SELECT risk_level, count(*)::int AS n FROM gov_repo.agents WHERE organisation_id = '${ORG_ID}' GROUP BY risk_level`);
    const byAiAct = await govQuery(`SELECT ai_act_risk_class, count(*)::int AS n FROM gov_repo.agents WHERE organisation_id = '${ORG_ID}' GROUP BY ai_act_risk_class`);
    const orphans = await govQuery(`SELECT count(*)::int AS n FROM gov_repo.agents WHERE organisation_id = '${ORG_ID}' AND status = 'pending_registration'`);
    registry = {
      byStatus: Object.fromEntries((byStatus as any[]).map(r => [r.status, r.n])),
      byRisk: Object.fromEntries((byRisk as any[]).map(r => [r.risk_level, r.n])),
      byAiActClass: Object.fromEntries((byAiAct as any[]).map(r => [r.ai_act_risk_class, r.n])),
      pendingRegistration: (orphans as any[])[0]?.n ?? 0,
    };
  } catch { registry = { unavailable: true }; }

  const regs: Array<{ id: string; name: string; status: string }> = attrs.complianceRegulations ?? [];
  const applicable = regs.filter(r => r.status !== 'not_applicable');
  const compliant = applicable.filter(r => r.status === 'compliant');

  return {
    title: 'CodeGuard AI Governance OS — Board Report',
    generatedAt: new Date().toISOString(),
    target: attrs.target ?? session.label,
    scanId: attrs.scanId ?? null,
    scannedAt: attrs.scannedAt ?? session.created_at,
    executiveSummary: {
      certificationLevel: (attrs.certLevel ?? 'none').toUpperCase(),
      complianceScore: attrs.score ?? 0,
      complianceRate: applicable.length > 0 ? Math.round((compliant.length / applicable.length) * 100) : 0,
      agentsDiscovered: attrs.agents ?? 0,
      risksIdentified: attrs.risks ?? 0,
      evidenceCollected: attrs.evidence ?? 0,
    },
    aiActReadiness: {
      regulationStatus: regs.find(r => r.id === 'reg-ai-act' || /ai.?act/i.test(r.id))?.status ?? 'unknown',
      highRiskAgents: registry.byAiActClass?.high ?? 0,
      limitedRiskAgents: registry.byAiActClass?.limited ?? 0,
      minimalRiskAgents: registry.byAiActClass?.minimal ?? 0,
    },
    regulations: regs,
    agentRegistry: registry,
    governanceGaps: {
      agentsPendingRegistration: registry.pendingRegistration ?? 0,
      shadowAgents: attrs.drift?.newAgents ?? [],
      removedAgents: attrs.drift?.removedAgents ?? [],
      nonCompliantRegulations: applicable.filter(r => r.status === 'non_compliant').map(r => r.name),
    },
    evidence: { scanId: attrs.scanId, agentNames: attrs.agentNames ?? [] },
  };
}

async function renderPdf(report: Awaited<ReturnType<typeof buildReport>>): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // Header
  doc.fontSize(18).fillColor('#0ECFB8').text('CODEGUARD', { continued: true }).fillColor('#333').text(' AI GOVERNANCE OS');
  doc.fontSize(10).fillColor('#666').text('Board Report — AI Act & Governance Readiness');
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#999').text(`Target: ${report.target}`);
  doc.text(`Scan: ${report.scanId ?? '—'} | ${report.scannedAt}`);
  doc.text(`Generated: ${report.generatedAt}`);
  doc.moveDown();

  // Executive summary
  const es = report.executiveSummary;
  doc.fontSize(13).fillColor('#111').text('1. Executive Summary');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#333');
  doc.text(`Certification level: ${es.certificationLevel}`);
  doc.text(`Compliance score: ${es.complianceScore}/100`);
  doc.text(`Compliance rate: ${es.complianceRate}% of applicable regulations`);
  doc.text(`Agents discovered: ${es.agentsDiscovered} | Risks: ${es.risksIdentified} | Evidence: ${es.evidenceCollected}`);
  doc.moveDown();

  // AI Act
  const ai = report.aiActReadiness;
  doc.fontSize(13).fillColor('#111').text('2. EU AI Act Readiness');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#333');
  doc.text(`AI Act status: ${ai.regulationStatus}`);
  doc.text(`High-risk agents (Annex III): ${ai.highRiskAgents}`);
  doc.text(`Limited-risk agents (Art. 50): ${ai.limitedRiskAgents}`);
  doc.text(`Minimal-risk agents: ${ai.minimalRiskAgents}`);
  doc.moveDown();

  // Regulations
  doc.fontSize(13).fillColor('#111').text('3. Regulatory Compliance Matrix');
  doc.moveDown(0.3);
  doc.fontSize(9);
  for (const r of report.regulations) {
    const color = r.status === 'compliant' ? '#22C55E' : r.status === 'partial' ? '#FACC15' : r.status === 'non_compliant' ? '#F87171' : '#999';
    doc.fillColor(color).text(`● ${r.status.toUpperCase().padEnd(15)}`, { continued: true }).fillColor('#333').text(` ${r.name}`);
  }
  doc.moveDown();

  // Registry
  doc.fontSize(13).fillColor('#111').text('4. Agent Registry (Single Source of Truth)');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#333');
  const reg = report.agentRegistry;
  if (reg.unavailable) doc.text('Registry unavailable.');
  else {
    doc.text(`By status: ${Object.entries(reg.byStatus ?? {}).map(([k, v]) => `${k}=${v}`).join(', ') || '—'}`);
    doc.text(`By risk: ${Object.entries(reg.byRisk ?? {}).map(([k, v]) => `${k}=${v}`).join(', ') || '—'}`);
  }
  doc.moveDown();

  // Gaps
  const gaps = report.governanceGaps;
  doc.fontSize(13).fillColor('#111').text('5. Governance Gaps & Actions');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#333');
  doc.text(`Agents pending registration (CG-AG-001): ${gaps.agentsPendingRegistration}`);
  doc.text(`Shadow agents since last scan: ${gaps.shadowAgents.length > 0 ? gaps.shadowAgents.join(', ') : 'none'}`);
  if (gaps.nonCompliantRegulations.length > 0) doc.text(`Non-compliant: ${gaps.nonCompliantRegulations.join('; ')}`);
  doc.moveDown();
  doc.fontSize(8).fillColor('#999').text('Every finding is evidence-backed. Full traceability available in the Audit Center (immutable ledger).');

  doc.end();
  return done;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get('scanId');
    const format = searchParams.get('format') ?? 'json';

    const report = await buildReport(scanId);

    if (format === 'pdf') {
      const pdf = await renderPdf(report);
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="codeguard-board-report-${(report.scanId ?? 'latest').slice(0, 8)}.pdf"`,
        },
      });
    }

    return NextResponse.json({ ok: true, data: report });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
