export const DEFAULT_SILICONFLOW_KEY = 'sk-bxsuvptkfzbpzvsuvswhhokmwvlhbtgpnvifylzwauurzqtq';
export const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1/chat/completions';

export const AVAILABLE_MODELS = [
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'Qwen 2.5 Coder 32B',
    tag: 'Recomendado para Código',
    badge: 'Code Specialist',
    description: 'Especialista em detecção de bugs, correção de vulnerabilidades e geração de código seguro.',
  },
  {
    id: 'deepseek-ai/DeepSeek-V3',
    name: 'DeepSeek V3',
    tag: 'Recomendado para Compliance',
    badge: 'Fast & Smart',
    description: 'Excelente para interpretação de leis (EU AI Act, LGPD, NIST) e geração de relatórios executivos.',
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    name: 'DeepSeek R1 (Distill 32B)',
    tag: 'Raciocínio Lógico',
    badge: 'Deep Reasoning',
    description: 'Análise aprofundada com cadeia de pensamento (CoT) para auditorias regulatórias complexas.',
  },
];

export function getSiliconFlowApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('siliconflow_api_key');
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_SILICONFLOW_KEY;
}

export function setSiliconFlowApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('siliconflow_api_key', key.trim());
  }
}

export function getSelectedModel(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('siliconflow_model');
    if (saved) return saved;
  }
  return 'Qwen/Qwen2.5-Coder-32B-Instruct';
}

export function setSelectedModel(modelId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('siliconflow_model', modelId);
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callSiliconFlow(messages: ChatMessage[], modelOverride?: string): Promise<string> {
  const apiKey = getSiliconFlowApiKey();
  const model = modelOverride || getSelectedModel();

  const response = await fetch(SILICONFLOW_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SiliconFlow API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Nenhuma resposta retornada pelo modelo.';
}

export interface RemediationResult {
  lawArticle: string;
  explanation: string;
  remediationSnippet: string;
  originalCodeSnippet?: string;
  bestPractices: string[];
}

export async function generateRemediationWithAI(
  violation: {
    ruleId: string;
    message: string;
    severity: string;
    file?: string;
    line?: number;
    regulation?: string;
    codeSnippet?: string;
  }
): Promise<RemediationResult> {
  const prompt = `Você é um Auditor Sênior de Governança de IA, Segurança e Compliance Jurídico-Técnico.
Analise a seguinte violação detectada no código do repositório e forneça uma remediação precisa.

Detalhes da Violação:
- Regulação: ${violation.regulation || 'Geral / OWASP / AI Governance'}
- Regra/ID: ${violation.ruleId}
- Mensagem: ${violation.message}
- Severidade: ${violation.severity}
- Arquivo: ${violation.file || 'Desconhecido'} (Linha: ${violation.line || 'N/A'})
${violation.codeSnippet ? `\nTrecho do Código com Problema:\n\`\`\`\n${violation.codeSnippet}\n\`\`\`` : ''}

Por favor, responda estritamente em formato JSON com as seguintes chaves:
{
  "lawArticle": "Artigo ou seção exata da lei/norma (ex: EU AI Act Art. 14 / LGPD Art. 46 / OWASP LLM01)",
  "explanation": "Explicação técnica e jurídica clara em português sobre por que isso viola a regra e qual o impacto.",
  "remediationSnippet": "Código corrigido e seguro com boas práticas implementadas (comentado em português)",
  "bestPractices": ["Dica 1", "Dica 2", "Dica 3"]
}`;

  const raw = await callSiliconFlow([
    { role: 'system', content: 'Você é um especialista em conformidade de IA e segurança de software. Responda em JSON válido.' },
    { role: 'user', content: prompt }
  ], 'Qwen/Qwen2.5-Coder-32B-Instruct');

  try {
    const jsonMatch = raw.match(/```json([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;
    const parsed = JSON.parse(jsonStr.trim());
    return {
      lawArticle: parsed.lawArticle || violation.ruleId,
      explanation: parsed.explanation || 'Análise de remediação gerada.',
      remediationSnippet: parsed.remediationSnippet || '// Código seguro sugerido',
      originalCodeSnippet: violation.codeSnippet,
      bestPractices: parsed.bestPractices || ['Implementar validação estrita', 'Registrar logs de auditoria'],
    };
  } catch (e) {
    return {
      lawArticle: violation.ruleId,
      explanation: raw,
      remediationSnippet: '// Verifique o parecer técnico acima',
      bestPractices: ['Revisar governança de IA e aplicar controles de mitigação'],
    };
  }
}

export async function generateExecutiveSummaryWithAI(scannerResult: any): Promise<string> {
  const overallScore = scannerResult.compliance?.overallScore ?? 75;
  const regulations = Object.entries(scannerResult.compliance?.regulations || {})
    .map(([k, v]: [string, any]) => `- ${k}: ${v.status} (Score: ${v.score ?? 'N/A'})`)
    .join('\n');
  const agentCount = scannerResult.source?.agents?.length || 0;
  const shadowAICount = scannerResult.shadowAI?.length || 0;
  const violationsCount = scannerResult.violations?.length || 0;

  const prompt = `Você é o Diretor Global de Compliance e Ética em Inteligência Artificial.
Gere um **Parecer Executivo de Auditoria Regulatória** para a diretoria e comitê de riscos baseado nos dados do scan:

- Repositório / Projeto: ${scannerResult.repo?.name || 'Projeto IA'}
- Score Geral de Conformidade: ${overallScore}/100
- Agentes de IA Detectados: ${agentCount}
- Ocorrências de Shadow AI (IAs Não Declaradas): ${shadowAICount}
- Total de Violações/Riscos de Código: ${violationsCount}
- Status Regulatório:
${regulations}

Estruture a resposta em Markdown elegante com:
1. 🎯 **Resumo Executivo (Executive Overview)**
2. ⚠️ **Principais Riscos e Impacto Regulatório (EU AI Act, LGPD, etc.)**
3. 🛡️ **Plano de Ação Prioritário em 3 Etapas**
4. 📜 **Veredito de Prontidão para Produção (Ready / Needs Remediation / Blocked)**`;

  return await callSiliconFlow([
    { role: 'system', content: 'Você é um consultor sênior executivo em governança de IA. Responda em português formal e direto.' },
    { role: 'user', content: prompt }
  ], 'deepseek-ai/DeepSeek-V3');
}
