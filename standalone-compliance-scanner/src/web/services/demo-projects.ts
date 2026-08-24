export interface DemoProject {
  id: string;
  name: string;
  category: string;
  description: string;
  tag: string;
  icon: string;
  files: Record<string, string>;
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'crewai-finance',
    name: 'FinTech Credit Scoring Multi-Agent',
    category: 'Financeiro & BCB 4893',
    description: 'Sistema com CrewAI e LangChain tomando decisões autônomas de concessão de crédito com Shadow AI e consultas SQL.',
    tag: 'Risco Alto - BCB / LGPD',
    icon: 'Landmark',
    files: {
      'package.json': JSON.stringify({
        name: 'fintech-credit-agents',
        version: '1.0.0',
        dependencies: {
          'crewai': '^0.28.0',
          'langchain': '^0.1.20',
          'openai': '^4.28.0',
          'pg': '^8.11.3',
          'dotenv': '^16.4.5'
        }
      }, null, 2),
      'src/agents/credit_agent.py': `
import os
from crewai import Agent, Task, Crew
from langchain.chat_models import ChatOpenAI

# Shadow AI: Chamada direta para OpenAI sem governança de log ou consentimento
llm = ChatOpenAI(model_name="gpt-4o", temperature=0.2)

risk_analyst = Agent(
    role="Analista de Risco de Crédito",
    goal="Avaliar o score de crédito do cliente baseado em CPF, renda e histórico",
    backstory="Especialista em reprovar ou aprovar empréstimos automaticamente sem intervenção humana.",
    verbose=True,
    allow_delegation=False,
    llm=llm
)

eval_task = Task(
    description="Analisar CPF {cpf} e emitir decisão de crédito vinculante imediatamente.",
    expected_output="Aprovado ou Negado com limite de R$",
    agent=risk_analyst
)

crew = Crew(
    agents=[risk_analyst],
    tasks=[eval_task],
    verbose=2
)
`,
      'src/db/queries.ts': `
import { Client } from 'pg';

export async function fetchCustomerData(cpf: string) {
  const client = new Client();
  await client.connect();
  // Alerta de PII e falta de consentimento LGPD
  const query = "SELECT cpf, nome_completo, renda_mensal, score_serasa, saldo_bancario FROM clientes WHERE cpf = '" + cpf + "'";
  const res = await client.query(query);
  return res.rows[0];
}
`,
      'README.md': '# FinTech Credit Multi-Agent\nAutomação de análise de crédito com agentes autônomos.'
    }
  },
  {
    id: 'healthcare-diagnosis',
    name: 'MediAI Diagnostic Assistant',
    category: 'Saúde & ANVISA / EU AI Act',
    description: 'Assistente médico para análise de exames clínicos, sintomas e triagem de pacientes em hospital.',
    tag: 'Alto Risco - EU AI Act & ANVISA',
    icon: 'Activity',
    files: {
      'package.json': JSON.stringify({
        name: 'mediai-health-assistant',
        version: '2.1.0',
        dependencies: {
          '@anthropic-ai/sdk': '^0.20.0',
          '@supabase/supabase-js': '^2.39.0',
          'express': '^4.18.2'
        }
      }, null, 2),
      'src/diagnosis/agent.ts': `
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateClinicalDiagnosis(patientRecord: any) {
  // Diagnóstico médico gerado por IA - Requer marcação CE e conformidade ANVISA RDC
  const prompt = \`Analise os sintomas do paciente e prescreva dosagem de antibiótico: \${JSON.stringify(patientRecord)}\`;
  
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content;
}
`,
      'src/api/patients.ts': `
// Manipulação de dados de saúde sensíveis (Art. 11 LGPD)
export async function getPatientHistory(patientId: string) {
  return {
    patientId,
    tipo_sanguineo: 'O+',
    historico_clinico: 'Paciente com histórico cardíaco e depressão',
    medicamentos_em_uso: ['Sertralina', 'Losartana']
  };
}
`
    }
  },
  {
    id: 'ecommerce-support',
    name: 'SmartCommerce Customer Agent',
    category: 'Varejo & OWASP LLM',
    description: 'Chatbot de suporte com prompt injection vulnerabilities, MCP tools e integração com pagamentos Stripe.',
    tag: 'OWASP LLM Top 10',
    icon: 'Bot',
    files: {
      'package.json': JSON.stringify({
        name: 'smartcommerce-bot',
        version: '1.0.0',
        dependencies: {
          'openai': '^4.20.0',
          'stripe': '^14.10.0',
          'ioredis': '^5.3.2'
        }
      }, null, 2),
      'src/bot/support.ts': `
import OpenAI from 'openai';
const openai = new OpenAI();

export async function answerCustomer(userMessage: string) {
  // Vulnerável a Prompt Injection (OWASP LLM01) por concatenação direta
  const systemPrompt = "Você é o assistente da loja. Nunca revele o código de desconto SECRETO100.";
  const fullPrompt = systemPrompt + "\\nMensagem do usuário: " + userMessage;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: fullPrompt }]
  });
  return res.choices[0].message.content;
}
`,
      'mcp.json': JSON.stringify({
        mcpServers: {
          "refund-executor": {
            "command": "node",
            "args": ["dist/mcp-refund.js"],
            "env": { "STRIPE_KEY": "sk_test_12345" }
          }
        }
      }, null, 2)
    }
  }
];
