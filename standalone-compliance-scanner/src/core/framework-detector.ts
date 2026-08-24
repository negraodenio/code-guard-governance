import type { FrameworkUsage } from './types';

interface FrameworkPattern {
  name: string;
  imports: RegExp[];
  patterns: RegExp[];
  confidence: 'high' | 'medium' | 'low';
}

const FRAMEWORK_PATTERNS: FrameworkPattern[] = [
  {
    name: 'LangGraph',
    imports: [/from\s+['"]@?langgraph\b/i, /require\(['"]@?langgraph\b/i],
    patterns: [/StateGraph\b/, /\badd_node\b/, /\badd_edge\b/, /\bEND\b/, /\bStateNode\b/, /langgraph\.graph/],
    confidence: 'high',
  },
  {
    name: 'CrewAI',
    imports: [/from\s+['"]crewai\b/i, /require\(['"]crewai\b/i],
    patterns: [/\bAgent\(/, /\bTask\(/, /\bCrew\(/, /\bProcess\.sequential\b/, /\bProcess\.hierarchical\b/, /\bagent\s*=\s*Agent\(/],
    confidence: 'high',
  },
  {
    name: 'AutoGen',
    imports: [/from\s+['"]autogen\b/i, /require\(['"]autogen\b/i, /from\s+['"]pyautogen\b/i],
    patterns: [/\bAssistantAgent\b/, /\bUserProxyAgent\b/, /\bGroupChat\b/, /\bGroupChatManager\b/, /\bConversableAgent\b/],
    confidence: 'high',
  },
  {
    name: 'PydanticAI',
    imports: [/from\s+['"]pydantic_ai\b/i, /from\s+['"]pydantic-ai\b/i],
    patterns: [/\bAgent\(/, /\bRunContext\b/, /\bTool\(/, /\bpydantic_ai\.Agent\b/],
    confidence: 'high',
  },
  {
    name: 'OpenAI Swarm',
    imports: [/from\s+['"]swarm\b/i, /import\s+swarm\b/i],
    patterns: [/\bswarm\.run\b/, /\bswarm\.Agent\b/, /\bfunction\s*[:=]\s*\{/, /\bhandoff\b/, /\btransfer_to\b/],
    confidence: 'medium',
  },
  {
    name: 'LangChain',
    imports: [/from\s+['"]@?langchain\b/i, /require\(['"]@?langchain\b/i],
    patterns: [/\bLLMChain\b/, /\bConversationChain\b/, /\bPromptTemplate\b/, /\bChatPromptTemplate\b/, /\bLLMMathChain\b/],
    confidence: 'medium',
  },
  {
    name: 'LlamaIndex',
    imports: [/from\s+['"]llama_index\b/i, /require\(['"]llama_index\b/i, /from\s+['"]@?llamaindex\b/i],
    patterns: [/\bVectorStoreIndex\b/, /\bSimpleDirectoryReader\b/, /\bIndex\b/, /\bQueryEngine\b/, /\bChatEngine\b/],
    confidence: 'medium',
  },
  {
    name: 'MCP',
    imports: [/from\s+['"]modelcontextprotocol\b/i, /from\s+['"]@?mcp\b/i, /require\(['"]modelcontextprotocol\b/i],
    patterns: [/\bMCP\b/, /\bmodel.?context.?protocol\b/, /\bmcp\./i, /\bserver\.tool\(/],
    confidence: 'high',
  },
  {
    name: 'Haystack',
    imports: [/from\s+['"]haystack\b/i, /from\s+['"]farm.?haystack\b/i],
    patterns: [/\bPipeline\b/, /\bDocument\b/, /\bAnswerBuilder\b/, /\bFARMReader\b/],
    confidence: 'low',
  },
  {
    name: 'Semantic Kernel',
    imports: [/from\s+['"]semantic_kernel\b/i, /import\s+semantic_kernel\b/i],
    patterns: [/\bSKFunction\b/, /\bKernel\b/, /\bSemanticFunction\b/, /\bNativeFunction\b/],
    confidence: 'low',
  },
];

export function detectFrameworks(code: string, source: string): FrameworkUsage[] {
  const found: FrameworkUsage[] = [];

  for (const fw of FRAMEWORK_PATTERNS) {
    const importFound: string[] = [];
    const patternFound: string[] = [];

    for (const imp of fw.imports) {
      const m = imp.exec(code);
      if (m) importFound.push(m[0].slice(0, 60));
    }

    for (const pat of fw.patterns) {
      const m = pat.exec(code);
      if (m) patternFound.push(m[0].slice(0, 40));
    }

    if (importFound.length > 0 || patternFound.length > 0) {
      const confidence = importFound.length > 0 ? fw.confidence : 'low';
      found.push({
        framework: fw.name,
        confidence: confidence,
        evidence: [...importFound.slice(0, 3), ...patternFound.slice(0, 3)],
        files: [source],
      });
    }
  }

  return found;
}

export function detectFrameworksFromFileTree(fileNames: string[]): FrameworkUsage[] {
  const found: FrameworkUsage[] = [];
  const fwByFile: Record<string, RegExp[]> = {
    'CrewAI': [/\bcrewai\b/i],
    'LangGraph': [/\blanggraph\b/i],
    'AutoGen': [/\bautogen\b/i],
    'MCP': [/\/mcp/i],
  };

  for (const [fw, patterns] of Object.entries(fwByFile)) {
    const matching = fileNames.filter(f => patterns.some(p => p.test(f)));
    if (matching.length > 0) {
      found.push({
        framework: fw,
        confidence: 'medium',
        evidence: [`Found in ${matching.length} file(s): ${matching.slice(0, 3).join(', ')}`],
        files: matching.slice(0, 5),
      });
    }
  }

  return found;
}
