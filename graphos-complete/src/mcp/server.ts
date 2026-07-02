import { discoverRepo } from '@/scanner';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

function respond(msg: JsonRpcResponse) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function handleRequest(req: JsonRpcRequest) {
  switch (req.method) {
    case 'initialize':
      respond({
        jsonrpc: '2.0', id: req.id,
        result: {
          protocolVersion: '0.1.0',
          capabilities: { tools: {} },
          serverInfo: { name: 'graphos-governance', version: '1.0.0' },
        },
      });
      break;

    case 'tools/list':
      respond({
        jsonrpc: '2.0', id: req.id,
        result: {
          tools: [
            {
              name: 'governance_graph',
              description: 'Returns the full governance knowledge graph for a repository',
              inputSchema: {
                type: 'object',
                properties: {
                  repoUrl: { type: 'string', description: 'GitHub repository URL' },
                  view: { type: 'string', enum: ['ceo', 'cfo', 'ciso', 'dpo', 'board', 'compliance', 'auditor', 'ecosystem'], default: 'board' },
                },
                required: ['repoUrl'],
              },
            },
            {
              name: 'risk_register',
              description: 'Returns the top material risks for a repository',
              inputSchema: {
                type: 'object',
                properties: {
                  repoUrl: { type: 'string', description: 'GitHub repository URL' },
                  minSeverity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
                },
                required: ['repoUrl'],
              },
            },
            {
              name: 'compliance_summary',
              description: 'Returns compliance status across all applicable regulations',
              inputSchema: {
                type: 'object',
                properties: {
                  repoUrl: { type: 'string', description: 'GitHub repository URL' },
                },
                required: ['repoUrl'],
              },
            },
            {
              name: 'scanner_status',
              description: 'Returns current scanner health and capabilities',
              inputSchema: { type: 'object', properties: {}, required: [] },
            },
          ],
        },
      });
      break;

    case 'tools/call':
      try {
        const { name, arguments: args } = req.params || {};
        await handleToolCall(req.id, name, args);
      } catch (err: any) {
        respond({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: err.message } });
      }
      break;

    default:
      respond({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } });
  }
}

async function handleToolCall(id: number | string, toolName: string, args: any) {
  switch (toolName) {
    case 'governance_graph': {
      const { repoUrl, view = 'board' } = args;
      const result = await discoverRepo({ repoUrl });
      const engine = result.graphosEngine;
      const views = await import('@council/graphos/views');
      const viewBuilder = (views as any)[`build${view.charAt(0).toUpperCase() + view.slice(1)}View`];
      const viewData = viewBuilder ? viewBuilder(engine) : null;
      respond({
        jsonrpc: '2.0', id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              repo: `${result.repo.owner}/${result.repo.name}`,
              certification: result.certification.overall,
              entityCount: engine.getEntitiesByKind('agent' as any).length,
              riskCount: result.risks.length,
              regulationCount: result.compliance.applicableRegulations.length,
              aiActSummary: result.aiActSummary,
              view: viewData?.summary || {},
              entities: viewData?.nodes?.slice(0, 50) || [],
              relationships: viewData?.edges?.slice(0, 100) || [],
            }, null, 2),
          }],
        },
      });
      break;
    }

    case 'risk_register': {
      const { repoUrl, minSeverity = 'high' } = args;
      const result = await discoverRepo({ repoUrl });
      const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const minOrder = severityOrder[minSeverity] || 3;
      const filtered = result.risks.filter(r => (severityOrder[r.severity] || 0) >= minOrder);
      respond({
        jsonrpc: '2.0', id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              totalRisks: result.risks.length,
              filteredRisks: filtered.length,
              risks: filtered.slice(0, 50).map(r => ({
                id: r.id, severity: r.severity, category: r.category,
                title: r.title, description: r.description.slice(0, 200),
                recommendation: r.recommendation,
              })),
            }, null, 2),
          }],
        },
      });
      break;
    }

    case 'compliance_summary': {
      const { repoUrl } = args;
      const result = await discoverRepo({ repoUrl });
      respond({
        jsonrpc: '2.0', id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              overallScore: result.compliance.overallScore,
              summary: result.compliance.summary,
              regulations: result.compliance.applicableRegulations.map(r => ({
                id: r.id, name: r.name, authority: r.authority,
                status: r.status, requirements: r.requirements.length,
                evidenceFound: r.evidenceFound.length, gaps: r.gaps.length,
              })),
              certification: result.certification.overall,
            }, null, 2),
          }],
        },
      });
      break;
    }

    case 'scanner_status':
      respond({
        jsonrpc: '2.0', id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'operational',
              version: '1.0.0',
              capabilities: {
                agentDetection: true,
                complianceScanning: ['GDPR', 'LGPD', 'AI Act', 'DORA', 'BCB 4893', 'ANVISA', 'CCPA', 'HIPAA', 'PCI-DSS'],
                violationScanning: ['PCI', 'SQLI', 'XSS', 'Secrets', 'Shadow API'],
                enrichment: ['PII', 'Data Lineage', 'Trust Zone'],
                graphOS: { entityKinds: 17, relationshipKinds: 26 },
                certification: ['Bronze', 'Silver', 'Gold', 'Platinum'],
              },
            }, null, 2),
          }],
        },
      });
      break;

    default:
      respond({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${toolName}` } });
  }
}

// Main loop
let buffer = '';
process.stdin.on('data', (chunk: Buffer) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req: JsonRpcRequest = JSON.parse(line);
      handleRequest(req);
    } catch { /* skip malformed */ }
  }
});

process.stdin.on('end', () => {
  if (buffer.trim()) {
    try {
      const req: JsonRpcRequest = JSON.parse(buffer);
      handleRequest(req);
    } catch { /* skip */ }
  }
});
