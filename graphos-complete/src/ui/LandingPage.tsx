'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// CodeGuard AI Governance OS — Landing Page
// "The future problem is not creating AI agents.
//  The future problem is governing thousands of them."
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg: '#06080C', surface: '#0C0F16', card: '#0F1420',
  border: 'rgba(255,255,255,0.06)', borderHover: 'rgba(14,207,184,0.25)',
  text: '#F0F4FA', muted: '#6B7A95', faint: '#3A4255',
  accent: '#0ECFB8', purple: '#5B50F0', red: '#F87171',
  yellow: '#FACC15', green: '#22C55E', pink: '#E879F9',
};

const CG_CONTROLS = [
  { id: 'CG-AG-001', name: 'Agent Inventory', domain: 'inventory', icon: '📋', desc: 'Every agent formally registered before operating' },
  { id: 'CG-AG-002', name: 'Agent Owner', domain: 'ownership', icon: '👤', desc: 'Accountable human owner assigned to every agent' },
  { id: 'CG-AG-003', name: 'Model Registration', domain: 'models', icon: '🧠', desc: 'Model name, provider, and version documented' },
  { id: 'CG-AG-004', name: 'Tool Authorisation', domain: 'access', icon: '🔧', desc: 'Tools and resources explicitly authorised' },
  { id: 'CG-AG-005', name: 'Prompt Governance', domain: 'prompts', icon: '💬', desc: 'Prompts registered, versioned, injection-assessed' },
  { id: 'CG-AG-006', name: 'MCP Server Governance', domain: 'mcp', icon: '🔌', desc: 'MCP connections registered, classified, reviewed' },
  { id: 'CG-AG-007', name: 'Human Oversight', domain: 'oversight', icon: '👁', desc: 'Oversight level calibrated to risk (L1–L4)' },
  { id: 'CG-AG-008', name: 'Audit Trail', domain: 'audit', icon: '📖', desc: 'Activities in immutable ledger — provable' },
  { id: 'CG-AG-009', name: 'Data Governance', domain: 'data', icon: '🔒', desc: 'PII / PHI / financial data review completed' },
  { id: 'CG-AG-010', name: 'Risk Classification', domain: 'risk', icon: '⚠', desc: 'Operational + AI Act risk class assigned' },
  { id: 'CG-AG-011', name: 'Agent-to-Agent', domain: 'a2a', icon: '🕸', desc: 'A2A edges registered in the governance graph' },
  { id: 'CG-AG-012', name: 'Autonomous Governance', domain: 'autonomous', icon: '🤖', desc: 'Elevated oversight + fallback for autonomous agents' },
];

const REGULATIONS = ['EU AI Act', 'DORA', 'LGPD', 'GDPR', 'ISO/IEC 42001', 'NIST AI RMF'];

const CONNECTORS = [
  { label: 'GitHub', cat: 'Source Control' }, { label: 'GitLab', cat: 'Source Control' },
  { label: 'Azure DevOps', cat: 'Source Control' }, { label: 'Bitbucket', cat: 'Source Control' },
  { label: 'Gitea / Forgejo', cat: 'Source Control' },
  { label: 'GitHub Actions', cat: 'CI/CD' }, { label: 'GitLab CI', cat: 'CI/CD' },
  { label: 'Azure Pipelines', cat: 'CI/CD' }, { label: 'Jenkins', cat: 'CI/CD' }, { label: 'ArgoCD', cat: 'CI/CD' },
  { label: 'Claude Code', cat: 'AI Origin' }, { label: 'Cursor', cat: 'AI Origin' },
  { label: 'LangGraph', cat: 'AI Framework' }, { label: 'CrewAI', cat: 'AI Framework' },
  { label: 'OpenAI Agents SDK', cat: 'AI Framework' }, { label: 'AutoGen', cat: 'AI Framework' },
  { label: 'Dify', cat: 'AI Framework' }, { label: 'MCP Servers', cat: 'AI Framework' }, { label: 'n8n AI', cat: 'AI Framework' },
  { label: 'AWS Bedrock', cat: 'Cloud AI' }, { label: 'Azure OpenAI', cat: 'Cloud AI' }, { label: 'Vertex AI', cat: 'Cloud AI' },
  { label: 'Entra ID', cat: 'Identity' }, { label: 'Okta', cat: 'Identity' }, { label: 'Keycloak', cat: 'Identity' },
  { label: 'Confluence', cat: 'Docs' }, { label: 'SharePoint', cat: 'Docs' }, { label: 'Notion', cat: 'Docs' },
];

const CAT_COLORS: Record<string, string> = {
  'Source Control': C.accent, 'CI/CD': C.purple, 'AI Origin': '#F97316',
  'AI Framework': '#FACC15', 'Cloud AI': '#38BDF8', 'Identity': '#A78BFA', 'Docs': '#E879F9',
};

const STEPS = [
  { n: '01', label: 'Connect', detail: 'GitHub, GitLab, Azure DevOps, Bitbucket — or any Git host', icon: '🔗', color: C.accent },
  { n: '02', label: 'Discover', detail: '16+ AI frameworks, MCP configs, .claude/, CI/CD, IaC AI resources', icon: '🔍', color: '#38BDF8' },
  { n: '03', label: 'Classify', detail: 'AI Act risk class, DORA exposure, 13 regulations, CG-AG score per agent', icon: '⚖', color: C.yellow },
  { n: '04', label: 'Govern', detail: 'Lifecycle (7 states), approval workflows, human oversight gates, ledger immutável', icon: '🛡', color: C.purple },
  { n: '05', label: 'Prove', detail: 'Board Report PDF, Talk to Governance, audit trail, certification (Bronze→Platinum)', icon: '📄', color: C.pink },
];

const PILLARS = [
  {
    icon: '🔭', title: 'Discovery Intelligence Engine',
    desc: 'Scans code, configs, IaC. Detects 16+ frameworks, MCP servers, .claude/, Cursor agents, Bedrock, Azure OpenAI. Every agent found becomes a governance record.',
    color: '#38BDF8', tag: 'Scanner',
  },
  {
    icon: '🕸', title: 'GraphOS',
    desc: 'Knowledge graph of your entire AI ecosystem. Agents, models, tools, risks, data flows, regulations — all connected. 10 executive lenses (CEO, CISO, DPO…).',
    color: C.accent, tag: 'Graph',
  },
  {
    icon: '💬', title: 'Talk to Governance',
    desc: 'Ask "Which agents process personal data?" and get a cited, evidence-backed answer in EN/PT/ES. 12 deterministic intents — no LLM hallucination, fully auditable.',
    color: C.green, tag: 'NL Interface',
  },
  {
    icon: '📋', title: 'Agent Inventory',
    desc: '7-state lifecycle (pending → registered → approved → active → suspended → under_review → decommissioned). Banking-grade 4-eyes approval, immutable ledger, PATCH transitions enforced by state machine.',
    color: C.yellow, tag: 'Inventory',
  },
  {
    icon: '📄', title: 'Board Ready Reports',
    desc: 'AI Act readiness, DORA compliance, Risk & Governance — auto-generated PDF. Certification levels Bronze/Silver/Gold/Platinum. Real evidence, every finding traced to a control.',
    color: C.pink, tag: 'Reports',
  },
  {
    icon: '🔔', title: 'Continuous Governance',
    desc: 'GitHub webhook → auto-rescan on push. Daily cron across all repos. Shadow agent detection (diff between scans). No more stale inventories.',
    color: C.purple, tag: 'Automation',
  },
];

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: color + '14', color, border: '1px solid ' + color + '30', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, ' + C.border + ' 30%, ' + C.border + ' 70%, transparent)', margin: '80px 0' }} />;
}

export default function LandingPage() {
  const [scanUrl, setScanUrl] = useState('');
  const [activeControl, setActiveControl] = useState<string | null>(null);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'DM Sans', -apple-system, sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid ' + C.border, background: C.bg + 'ee', backdropFilter: 'blur(12px)', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, ' + C.accent + ', ' + C.purple + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: C.bg }}>G</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.03em', lineHeight: 1 }}>CodeGuard</div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Governance OS</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {REGULATIONS.map(r => <Chip key={r} label={r} color={C.muted} />)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a href="/v1" style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid ' + C.border, color: C.text, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>Dashboard</a>
            <a href="/api/v1/standard?format=md" target="_blank" style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid ' + C.accent + '44', color: C.accent, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>CG-AG Spec</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, border: '1px solid ' + C.accent + '33', background: C.accent + '0a', marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>CG-AG Open Standard · Discover. Govern. Explain. Audit. Comply.</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', margin: '0 0 20px' }}>
          The Operating System<br />
          <span style={{ background: 'linear-gradient(135deg, ' + C.accent + ', ' + C.purple + ')', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            for AI Agent Governance
          </span>
        </h1>
        <p style={{ fontSize: 18, color: C.muted, maxWidth: 620, margin: '0 auto 16px', lineHeight: 1.6 }}>
          Discover every AI agent in your codebase. Classify it against the EU AI Act. Govern it with an open standard.
          Prove it to your board — in minutes.
        </p>
        <p style={{ fontSize: 13, color: C.faint, marginBottom: 48, fontStyle: 'italic' }}>
          "The future problem is not creating AI agents. The future problem is governing thousands of them."
        </p>

        {/* Scan CTA */}
        <div style={{ display: 'flex', gap: 8, maxWidth: 560, margin: '0 auto 20px', justifyContent: 'center' }}>
          <input value={scanUrl} onChange={e => setScanUrl(e.target.value)}
            placeholder="github.com/org/repo"
            onKeyDown={e => e.key === 'Enter' && scanUrl.trim() && window.open('/v1', '_blank')}
            style={{ flex: 1, padding: '12px 18px', borderRadius: 10, border: '1px solid ' + C.border, background: C.surface, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
          <a href="/v1" style={{ padding: '12px 24px', borderRadius: 10, background: C.accent, color: C.bg, fontWeight: 800, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
            Scan Now →
          </a>
        </div>
        <p style={{ fontSize: 11, color: C.faint }}>GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, Forgejo</p>

        {/* Metrics bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 64, flexWrap: 'wrap' }}>
          {[
            { v: '12', l: 'CG-AG Controls', c: C.accent },
            { v: '13', l: 'Regulations mapped', c: C.purple },
            { v: '16+', l: 'AI frameworks detected', c: '#38BDF8' },
            { v: '6', l: 'Source control providers', c: C.yellow },
            { v: '7', l: 'Lifecycle states', c: C.green },
          ].map(m => (
            <div key={m.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: m.c, lineHeight: 1 }}>{m.v}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>How it works</h2>
          <p style={{ color: C.muted, fontSize: 16 }}>Five steps. One platform. Every agent governed.</p>
        </div>
        <div style={{ display: 'flex', gap: 0, position: 'relative', flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ flex: 1, minWidth: 180, padding: '28px 20px', borderRadius: 12, border: '1px solid ' + C.border, background: C.card, marginRight: i < STEPS.length - 1 ? 8 : 0 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 10, color: s.color, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>{s.n}</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, color: s.color }}>{s.label}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── CG-AG FRAMEWORK ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, border: '1px solid ' + C.accent + '33', background: C.accent + '0a', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Open Standard · CC BY 4.0</span>
            </div>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
              CG-AG Framework<br />
              <span style={{ color: C.accent }}>The OWASP for AI Agents</span>
            </h2>
            <p style={{ color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
              12 controls. Every AI agent in production should satisfy all of them.
              Mapped to EU AI Act article by article, DORA, ISO/IEC 42001, NIST AI RMF, ISO 27001.
            </p>
            <p style={{ color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
              Free to use, implement, and reference. Built to become the industry baseline for AI agent governance — like CIS Benchmarks for cloud, but for agents.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {['EU AI Act', 'DORA', 'ISO/IEC 42001', 'NIST AI RMF', 'ISO 27001', 'LGPD', 'GDPR'].map(r => (
                <Chip key={r} label={r} color={C.purple} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/api/v1/standard" target="_blank" style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid ' + C.accent, color: C.accent, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                View Spec (JSON)
              </a>
              <a href="/api/v1/standard?format=md" target="_blank" style={{ padding: '10px 20px', borderRadius: 8, background: C.accent, color: C.bg, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                Get the Markdown →
              </a>
            </div>
          </div>
          <div style={{ flex: 1.2, minWidth: 320, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {CG_CONTROLS.map(c => (
              <div key={c.id}
                onMouseEnter={() => setActiveControl(c.id)} onMouseLeave={() => setActiveControl(null)}
                style={{ padding: '14px', borderRadius: 10, border: '1px solid ' + (activeControl === c.id ? C.accent + '44' : C.border), background: activeControl === c.id ? C.accent + '06' : C.card, cursor: 'default', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <span style={{ fontSize: 9, color: C.accent, fontWeight: 700, letterSpacing: '0.06em' }}>{c.id}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── PRODUCT PILLARS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Everything you need to govern AI agents</h2>
          <p style={{ color: C.muted, fontSize: 16 }}>Six pillars. One platform. No compromises.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PILLARS.map(p => (
            <div key={p.title} style={{ padding: '28px 24px', borderRadius: 14, border: '1px solid ' + C.border, background: C.card }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{p.icon}</div>
              <Chip label={p.tag} color={p.color} />
              <div style={{ fontSize: 16, fontWeight: 800, margin: '10px 0 8px', lineHeight: 1.2 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── CONNECTORS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Connect any source</h2>
          <p style={{ color: C.muted, fontSize: 16 }}>Where AI agents are created, CodeGuard governs them.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 900, margin: '0 auto' }}>
          {CONNECTORS.map(c => (
            <span key={c.label} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: CAT_COLORS[c.cat] + '0f', border: '1px solid ' + CAT_COLORS[c.cat] + '28', color: CAT_COLORS[c.cat] }}>
              {c.label}
            </span>
          ))}
          <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: C.surface, border: '1px solid ' + C.border, color: C.muted }}>
            + 100 more →
          </span>
        </div>
      </section>

      <Divider />

      {/* ── WHY NOW ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.1 }}>
              The governance gap<br />is already here
            </h2>
            {[
              { stat: '78%', desc: 'of enterprises deploying AI agents have no formal inventory', color: C.red },
              { stat: '€35M', desc: 'max fine under EU AI Act for non-compliant high-risk AI systems', color: C.yellow },
              { stat: '4%', desc: 'of global turnover under GDPR — now extended to AI systems', color: C.purple },
              { stat: '2026', desc: 'EU AI Act Art. 6-15 full enforcement begins — you need to be ready now', color: C.accent },
            ].map(s => (
              <div key={s.stat} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '14px 18px', borderRadius: 10, border: '1px solid ' + C.border, background: C.card }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: s.color, flexShrink: 0, minWidth: 70 }}>{s.stat}</span>
                <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{s.desc}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 300, padding: '40px', borderRadius: 20, border: '1px solid ' + C.accent + '22', background: 'linear-gradient(135deg, ' + C.accent + '06, ' + C.purple + '06)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: C.accent, lineHeight: 1 }}>NOW</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 8, marginBottom: 32 }}>is the window to set the standard</div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, marginBottom: 24 }}>
              Every company building with AI is creating agents today. In 3 years, enterprises will have hundreds or thousands of them.
              The ones that govern them proactively will be compliant, auditable, and trusted.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: C.muted }}>
              CodeGuard gives you the OS to govern that future — and the open framework that becomes the market standard.
            </p>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── FINAL CTA ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 120px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 20px' }}>
          Start governing<br />
          <span style={{ color: C.accent }}>your agents today</span>
        </h2>
        <p style={{ fontSize: 17, color: C.muted, marginBottom: 48, lineHeight: 1.6 }}>
          Paste a repo URL. Get a full governance report in minutes.<br />
          AI Act readiness. CG-AG score. Board-ready PDF.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
          <a href="/v1" style={{ padding: '16px 36px', borderRadius: 12, background: C.accent, color: C.bg, fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>
            Scan Your Repo →
          </a>
          <a href="/api/v1/standard" target="_blank" style={{ padding: '16px 36px', borderRadius: 12, border: '1px solid ' + C.border, color: C.text, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            Read the CG-AG Spec
          </a>
        </div>
        <p style={{ fontSize: 12, color: C.faint }}>
          Open standard · Free to use · Built for AI Act compliance
        </p>

        <div style={{ marginTop: 80, padding: '32px', borderRadius: 16, border: '1px solid ' + C.border, background: C.card, textAlign: 'left' }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            "The future problem is not creating AI agents.
          </p>
          <p style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            The future problem is <span style={{ color: C.accent }}>governing thousands of them.</span>"
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>— CodeGuard AI Governance OS</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid ' + C.border, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, ' + C.accent + ', ' + C.purple + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: C.bg }}>G</div>
            <span style={{ fontSize: 12, color: C.muted }}>CodeGuard AI Governance OS</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { l: 'Dashboard', h: '/v1' },
              { l: 'CG-AG Spec', h: '/api/v1/standard' },
              { l: 'Board Report', h: '/api/v1/report' },
              { l: 'Standard (MD)', h: '/api/v1/standard?format=md' },
              { l: 'Privacy', h: '/privacy' },
              { l: 'Terms', h: '/terms' },
            ].map(link => (
              <a key={link.l} href={link.h} style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>{link.l}</a>
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>CG-AG Framework · CC BY 4.0 · Open Standard</p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @media(max-width:768px){
          section > div[style*="gridTemplateColumns"] { display:flex!important; flex-direction:column; }
        }
      `}</style>
    </div>
  );
}
