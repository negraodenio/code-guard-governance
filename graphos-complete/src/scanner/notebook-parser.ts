import type { NotebookAnalysis, NotebookCell, ExtractedPrompt } from './types';
import { detectFrameworks } from './framework-detector';
import { detectMemorySystems } from './memory-detector';

const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /pk-[a-zA-Z0-9]{20,}/g,
  /[A-Za-z0-9_-]{32,40}/g,
];

const EDUCATIONAL_KEYWORDS = /tutorial|guide|learn|example|demonstrat|walkthrough|basic|introduction|beginn|step.?by.?step|101|getting.?started/i;
const PRODUCTION_KEYWORDS = /production|deploy|container|docker|kubernetes|monitoring|observability|logging|load.?test|scale|reliability/i;
const ENTERPRISE_KEYWORDS = /enterprise|govern|compliance|audit|sso|rbac|multi.?tenant|team|org|iam|policy|approval|workflow/i;

export function parseNotebook(path: string, content: string): NotebookAnalysis | null {
  let json: any;
  try { json = JSON.parse(content); } catch { return null; }

  if (!json.cells || !Array.isArray(json.cells)) return null;

  const cells: NotebookCell[] = json.cells.map((c: any) => ({
    type: c.cell_type ?? 'raw',
    source: (c.source ?? []).join(''),
    lineCount: (c.source ?? []).length,
  }));

  const codeCells = cells.filter(c => c.type === 'code');
  const markdownCells = cells.filter(c => c.type === 'markdown');
  const allSource = cells.map(c => c.source).join('\n');
  const codeSource = codeCells.map(c => c.source).join('\n');

  // API Keys
  const foundKeys = new Set<string>();
  for (const pattern of API_KEY_PATTERNS) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(allSource)) !== null) {
      const key = m[0].trim();
      if (key.length >= 20 && key.length <= 60) foundKeys.add(key);
    }
  }

  // Extract prompts from markdown cells and code strings
  const prompts = extractPrompts(cells, path);

  // Framework detection
  const frameworks = detectFrameworks(codeSource, path);

  // Memory systems
  const memorySystems = detectMemorySystems(codeSource);

  // External services from code
  const externalServices = detectExternalServicesFromCode(codeSource);

  // Agent roles from code content
  const agentRoles = detectAgentRoles(codeSource);

  // Classification scores
  const educationalScore = scoreByKeywords(allSource, EDUCATIONAL_KEYWORDS);
  const productionScore = scoreByKeywords(allSource, PRODUCTION_KEYWORDS);
  const enterpriseScore = scoreByKeywords(allSource, ENTERPRISE_KEYWORDS);

  return {
    totalCells: cells.length,
    codeCells: codeCells.length,
    markdownCells: markdownCells.length,
    hasAPIKeys: foundKeys.size > 0,
    apiKeyCount: foundKeys.size,
    prompts,
    frameworks,
    memorySystems,
    externalServices,
    agentRoles,
    isEducational: educationalScore > 5,
    isProduction: productionScore > 3,
    isEnterprise: enterpriseScore > 3,
    educationalScore,
    productionScore,
  };
}

function extractPrompts(cells: NotebookCell[], source: string): ExtractedPrompt[] {
  const codeSource = cells.filter(c => c.type === 'code').map(c => c.source).join('\n');
  const prompts: ExtractedPrompt[] = [];
  const seenHashes = new Set<string>();
  const addPrompt = (type: ExtractedPrompt['type'], content: string, framework?: string) => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 20) return;
    const hash = simpleHash(trimmed);
    if (seenHashes.has(hash)) return;
    seenHashes.add(hash);
    prompts.push({ type, content: trimmed.slice(0, 500), source, hash, framework });
  };

  // Markdown cells with prompt patterns
  for (const cell of cells) {
    if (cell.type === 'markdown') {
      if (/\bsystem\s*(prompt|message|instruction)\b/i.test(cell.source)) {
        addPrompt('system', cell.source);
      }
      if (/\b(few-shot|few_shot|example)\b/i.test(cell.source)) {
        addPrompt('few_shot', cell.source);
      }
      if (/\b(chain.?of.?thought|cot|reasoning)\b/i.test(cell.source)) {
        addPrompt('chain_of_thought', cell.source);
      }
      if (/\b(react|reAct|thought.?action.?observation)\b/i.test(cell.source)) {
        addPrompt('react', cell.source);
      }
      if (/\b(role|persona|act\s+as)\b/i.test(cell.source)) {
        addPrompt('role', cell.source);
      }
    }
  }

  // Code cells with system prompt assignments
  if (codeHasPromptPattern(codeSource, 'system_prompt')) addPrompt('system', extractPromptValue(codeSource, 'system_prompt'), 'general');
  if (codeHasPromptPattern(codeSource, 'system_message')) addPrompt('system', extractPromptValue(codeSource, 'system_message'), 'general');
  if (codeHasPromptPattern(codeSource, 'messages')) addPrompt('template', extractPromptValue(codeSource, 'messages'), 'general');

  return prompts;
}

function codeHasPromptPattern(code: string, varName: string): boolean {
  return new RegExp(`${varName}\\s*[=:]\\s*[\`"']|${varName}\\s*[=:]\\s*\\[`).test(code);
}

function extractPromptValue(code: string, varName: string): string {
  const match = code.match(new RegExp(`${varName}\\s*[=:]\\s*([\`"'])([^\\1]*?)\\1`));
  return match ? match[2].slice(0, 300) : '';
}

function detectExternalServicesFromCode(code: string): string[] {
  const services: string[] = [];
  if (/openai|gpt|text-davinci/i.test(code)) services.push('OpenAI');
  if (/anthropic|claude/i.test(code)) services.push('Anthropic');
  if (/google|gemini|palm/i.test(code)) services.push('Google AI');
  if (/hugging[-\s]?face/i.test(code)) services.push('Hugging Face');
  if (/cohere/i.test(code)) services.push('Cohere');
  if (/mistral/i.test(code)) services.push('Mistral');
  if (/stripe|paddle|lemonsqueezy/i.test(code)) services.push('Payment');
  if (/supabase|firebase|mongodb|postgres/i.test(code)) services.push('Database');
  return Array.from(new Set(services));
}

function detectAgentRoles(code: string): string[] {
  const roles: string[] = [];
  if (/orchestrat|coordinator|supervisor|manager|leader/i.test(code)) roles.push('Coordinator');
  if (/worker|sub.?agent|delegate|execute/i.test(code)) roles.push('Worker');
  if (/review|evaluat|grade|score|assess|critic|judge/i.test(code)) roles.push('Reviewer/Evaluator');
  if (/router|classif|dispatch|intent|decide/i.test(code)) roles.push('Router');
  if (/memory|remember|recall|vector|embedding/i.test(code)) roles.push('Memory Agent');
  if (/research|search|retriev|investigat/i.test(code)) roles.push('Research Agent');
  if (/tool|function.?call|api.?call|plugin|integrat/i.test(code)) roles.push('Tool Agent');
  if (/multi.?agent|swarm|team|collaborat|communicat|message.?pass/i.test(code)) roles.push('Multi-Agent');
  if (/debate|disagree|adversar|reflect|argue/i.test(code)) roles.push('Debate System');
  if (/plan|strateg|decompos|task.?break|goal|hierarch/i.test(code)) roles.push('Planning System');
  if (/self.?improv|self.?heal|reflection|iterative/i.test(code)) roles.push('Self-Improving');
  if (/human.?in.?the.?loop|approval|confirm|feedback|intervent/i.test(code)) roles.push('HITL');
  return Array.from(new Set(roles));
}

function scoreByKeywords(text: string, pattern: RegExp): number {
  let count = 0;
  const re = new RegExp(pattern.source, 'gi');
  let _m: RegExpExecArray | null;
  while ((_m = re.exec(text)) !== null) count++;
  return count;
}

function simpleHash(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(16)}`;
}
