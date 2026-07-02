import type { DataFlow, LineageResult, DataFlowNode } from '../types';

interface FileInfo { path: string; content: string; }

const SOURCE_PATTERNS: Array<{ category: string; regex: RegExp; riskWeight: number }> = [
  { category: 'cpf', regex: /\bcpf\b|\bCPF\b|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, riskWeight: 10 },
  { category: 'cnpj', regex: /\bcnpj\b|\bCNPJ\b/, riskWeight: 5 },
  { category: 'email', regex: /\bemail\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, riskWeight: 8 },
  { category: 'password', regex: /\bpassword\b|\bsenha\b|\bpasswd\b/, riskWeight: 10 },
  { category: 'credit_card', regex: /\bcredit.?card\b|\bcvv\b|\bcvc\b|\bcard.?number\b/, riskWeight: 10 },
  { category: 'api_key', regex: /\bapi[_-]?key\b|\bapi[_-]?secret\b/, riskWeight: 10 },
  { category: 'token', regex: /\baccess[_-]?token\b|\brefresh[_-]?token\b/, riskWeight: 8 },
  { category: 'phone', regex: /\bphone\b|\btelefone\b|\bcelular\b/, riskWeight: 5 },
  { category: 'address', regex: /\baddress\b|\bendere[cç]o\b|\bcep\b/, riskWeight: 5 },
  { category: 'health_data', regex: /\bpaciente\b|\bpatient\b|\bdiagnos[ei]s\b|\bprontu[aá]rio\b/, riskWeight: 10 },
  { category: 'financial_data', regex: /\bpayment\b|\btransaction\b|\btransa[cç][aã]o\b|\baccount\b|\bconta\b/, riskWeight: 8 },
  { category: 'biometric', regex: /\bbiometria\b|\bbiometric\b|\bface.?id\b/, riskWeight: 10 },
];

const TRANSFORM_PATTERNS: Array<{ category: string; regex: RegExp }> = [
  { category: 'encrypt', regex: /\bencrypt\b|\bEncrypt\b|\bAES\b|\bcrypto\./i },
  { category: 'hash', regex: /\bhash\b|\bHash\b|\bbcrypt\b|\bargon2\b|\bsha256\b/i },
  { category: 'mask', regex: /\bmask\b|\bMask\b|\bredact\b|\bRedact\b|\bsanitize\b/i },
  { category: 'validate', regex: /\bvalidate\b|\bValidate\b|\bescape\b/i },
  { category: 'serialize', regex: /\bJSON\.stringify\b|\bjson\.dumps\b|\bMarshal\b/i },
];

const SINK_PATTERNS: Array<{ category: string; regex: RegExp; riskWeight: number }> = [
  { category: 'openai', regex: /\bopenai\.chat\.completions\b|\bopenai\.beta\b/, riskWeight: 10 },
  { category: 'anthropic', regex: /\bclaude\.messages\.create\b|\banthropic\.messages\b/, riskWeight: 10 },
  { category: 'openrouter', regex: /\bopenrouter\b/, riskWeight: 5 },
  { category: 'database', regex: /\bdb\.(?:insert|update|save|create|delete)\b|\b\.execute\b|\b\.query\b/, riskWeight: 8 },
  { category: 'http_client', regex: /\bfetch\s*\(|\baxios\.(?:get|post|put|delete)\b|\bhttp\.request\b/, riskWeight: 8 },
  { category: 'log', regex: /\bconsole\.log\b|\bconsole\.error\b|\blogger\.(?:info|error|warn)\b/, riskWeight: 3 },
  { category: 'storage', regex: /\b\.upload\b|\b\.putObject\b|\b\.write\b|\bs3\.(?:put|upload)\b/i, riskWeight: 5 },
  { category: 'webhook', regex: /\bwebhook\b|\bcallback\b|\bnotify\b/, riskWeight: 5 },
];

function computeRiskLevel(weight: number): DataFlow['riskLevel'] {
  if (weight >= 18) return 'critical';
  if (weight >= 14) return 'high';
  if (weight >= 10) return 'medium';
  return 'low';
}

export function traceDataFlows(files: FileInfo[]): LineageResult {
  const flows: DataFlow[] = [];
  let flowId = 0;

  for (const file of files) {
    const content = file.content;
    if (!content || content.length > 500000) continue;
    const lines = content.split('\n');

    const fileSources: Array<{ category: string; line: number; content: string; riskWeight: number }> = [];
    const fileTransforms: Array<{ category: string; line: number; content: string }> = [];
    const fileSinks: Array<{ category: string; line: number; content: string; riskWeight: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('/*')) continue;

      for (const src of SOURCE_PATTERNS) {
        if (src.regex.test(line)) {
          fileSources.push({ category: src.category, line: i + 1, content: line.trim().slice(0, 80), riskWeight: src.riskWeight });
        }
      }
      for (const tr of TRANSFORM_PATTERNS) {
        if (tr.regex.test(line)) {
          fileTransforms.push({ category: tr.category, line: i + 1, content: line.trim().slice(0, 80) });
        }
      }
      for (const sk of SINK_PATTERNS) {
        if (sk.regex.test(line)) {
          fileSinks.push({ category: sk.category, line: i + 1, content: line.trim().slice(0, 80), riskWeight: sk.riskWeight });
        }
      }
    }

    if (fileSources.length > 0 && fileSinks.length > 0) {
      for (const source of fileSources) {
        for (const sink of fileSinks) {
          const transform = fileTransforms.length > 0 ? fileTransforms[0] : null;
          const totalRisk = source.riskWeight + sink.riskWeight;

          flows.push({
            id: `flow_${flowId++}`,
            source: { type: 'source', category: source.category, file: file.path, line: source.line, content: source.content },
            transformation: transform ? { type: 'transform', category: transform.category, file: file.path, line: transform.line, content: transform.content } : null,
            sink: { type: 'sink', category: sink.category, file: file.path, line: sink.line, content: sink.content },
            riskLevel: computeRiskLevel(totalRisk),
            confidence: 60,
            evidence: [
              `Source: ${source.category} at ${file.path}:${source.line}`,
              ...(transform ? [`Transform: ${transform.category}`] : []),
              `Sink: ${sink.category} at ${file.path}:${sink.line}`,
            ],
          });
        }
      }
    }
  }

  const criticalCount = flows.filter(f => f.riskLevel === 'critical').length;
  const highCount = flows.filter(f => f.riskLevel === 'high').length;
  let overallRisk: DataFlow['riskLevel'] = 'low';
  if (criticalCount >= 3) overallRisk = 'critical';
  else if (criticalCount >= 1 || highCount >= 3) overallRisk = 'high';
  else if (highCount >= 1 || flows.length >= 5) overallRisk = 'medium';

  const sourceKinds = new Set(flows.map(f => f.source.category));
  const sinkKinds = new Set(flows.map(f => f.sink.category));

  return {
    flows,
    totalFlows: flows.length,
    riskLevel: overallRisk,
    summary: `${flows.length} data flows: ${sourceKinds.size} source types → ${sinkKinds.size} sink types. Risk: ${overallRisk}.`,
  };
}
