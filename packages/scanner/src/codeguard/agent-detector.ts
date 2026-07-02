import type { DiscoveredAgent, RepoFile } from "./types";

interface FrameworkPattern {
  name: string;
  signals: RegExp[];
  agentType: string;
  defaultRisk: string;
  defaultOversight: string;
  isAutonomous: boolean;
}

const FRAMEWORKS: FrameworkPattern[] = [
  {
    name: "OpenAI Agents SDK",
    signals: [/from\s+["']openai["'].*Agent|openai.*agents.*Runner|OpenAI.*Agent|from\s+["']@openai\/agents/, /agents\.Runner\.run/, /Agent\(.*instructions/, /handoff\s*\(/],
    agentType: "autonomous", defaultRisk: "high", defaultOversight: "l3_human_approval", isAutonomous: true,
  },
  {
    name: "LangChain",
    signals: [/from\s+["']langchain|import.*langchain|langchain\.agents|create_react_agent|AgentExecutor/, /from\s+["']@langchain/],
    agentType: "orchestrator", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "LangGraph",
    signals: [/from\s+["']langgraph/, /StateGraph|CompiledGraph|add_node|add_edge/, /langgraph\.prebuilt/],
    agentType: "orchestrator", defaultRisk: "high", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "CrewAI",
    signals: [/from\s+["']crewai/, /Crew\s*\(|Agent\s*\(.*role|Task\s*\(.*description/, /crewai\.tools/],
    agentType: "orchestrator", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "AutoGen",
    signals: [/from\s+["']autogen/, /autogen\.AssistantAgent|autogen\.UserProxyAgent|ConversableAgent/, /pyautogen|autogen_agentchat/],
    agentType: "autonomous", defaultRisk: "high", defaultOversight: "l3_human_approval", isAutonomous: true,
  },
  {
    name: "Claude Code / Anthropic",
    signals: [/from\s+["']anthropic/, /claude\.messages\.create|Anthropic\(\)|Claude\(/, /tool_use\b|@anthropic-ai\/sdk/, /claude_code|CLAUDE\.md/],
    agentType: "assistive", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "Cursor Origin",
    signals: [/\.cursor\/rules|\.cursor\/commands|\.cursor\/agents/, /cursor.*agent|origin.*agent/i],
    agentType: "assistive", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "OpenRouter",
    signals: [/from\s+["']openrouter|openrouter\.ai|openrouter\/chat/, /openrouter.*completions/],
    agentType: "gateway", defaultRisk: "low", defaultOversight: "l1_automated", isAutonomous: false,
  },
  {
    name: "Dify",
    signals: [/dify|dify\.ai|dify_app/, /dify.*workflow|dify.*agent/],
    agentType: "orchestrator", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "Semantic Kernel",
    signals: [/Microsoft\.SemanticKernel|using.*SemanticKernel|CreateKernel|Kernel\.Builder/, /semantic-kernel/],
    agentType: "orchestrator", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "LlamaIndex",
    signals: [/from\s+["']llama_index|llama_index\.agent|from\s+["']llamaindex/, /ReActAgent|OpenAIAgent|FunctionCallingAgent/],
    agentType: "retrieval", defaultRisk: "low", defaultOversight: "l1_automated", isAutonomous: false,
  },
  {
    name: "OpenAI SDK",
    signals: [/from\s+["']openai["']|import\s+OpenAI|openai\.chat\.completions/, /new\s+OpenAI\(/, /openai\.beta\.chat/],
    agentType: "assistive", defaultRisk: "low", defaultOversight: "l1_automated", isAutonomous: false,
  },
  {
    name: "MCP Server",
    signals: [/from\s+["']@modelcontextprotocol/, /Server\(.*name|server\.run\(|StdioServerTransport/, /mcp\/server|mcp\.server/],
    agentType: "gateway", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "n8n AI",
    signals: [/n8n.*ai|n8n.*agent|n8n.*workflow/, /@n8n/],
    agentType: "orchestrator", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    name: "Custom Agent",
    signals: [/\b(agent|assistant|bot|workflow|orchestrat|crew|autonomous|reasoning|planner|memory|router|function.calling|tool.use|handoff)\b/i],
    agentType: "assistive", defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
];

const SCAN_EXTENSIONS = [".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".cs", ".rb", ".php", ".yaml", ".yml", ".json", ".toml", ".md"];

function shouldScan(file: RepoFile): boolean {
  return SCAN_EXTENSIONS.some((ext) => file.name.endsWith(ext));
}

// ── Config-file agent detection (path-based) ─────────────────────────────────
// Detects agents DEFINED in config files: MCP servers, Claude Code agents/skills,
// Cursor rules, agents.md, opencode.json. These are definitive (high confidence)
// because the file's existence declares the agent — no content heuristics needed.

interface ConfigDetector {
  pattern: RegExp;
  framework: string;
  agentType: string;
  defaultRisk: string;
  defaultOversight: string;
  isAutonomous: boolean;
  /** If set, parses the file content and returns agent names (one agent per name). */
  parseAgents?: (content: string) => string[];
}

function parseMcpServers(content: string): string[] {
  try {
    const json = JSON.parse(content);
    const servers = json.mcpServers ?? json.servers ?? {};
    return Object.keys(servers);
  } catch { return []; }
}

function parseOpencodeAgents(content: string): string[] {
  try {
    // strip // comments for .jsonc
    const clean = content.replace(/^\s*\/\/.*$/gm, '');
    const json = JSON.parse(clean);
    const agents = json.agent ?? json.agents ?? {};
    const names = Object.keys(agents);
    // mcp servers declared inside opencode.json also count
    const mcp = Object.keys(json.mcp ?? {});
    return [...names, ...mcp.map(m => `mcp:${m}`)];
  } catch { return []; }
}

const CONFIG_DETECTORS: ConfigDetector[] = [
  {
    pattern: /(^|\/)(\.mcp\.json|mcp\.json|claude_desktop_config\.json|mcp_config\.json|\.vscode\/mcp\.json)$/i,
    framework: "MCP Server", agentType: "gateway",
    defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
    parseAgents: parseMcpServers,
  },
  {
    pattern: /(^|\/)\.claude\/agents\/[^/]+\.md$/i,
    framework: "Claude Code Agent", agentType: "assistive",
    defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    pattern: /(^|\/)\.claude\/skills\/[^/]+\/SKILL\.md$/i,
    framework: "Claude Code Skill", agentType: "assistive",
    defaultRisk: "low", defaultOversight: "l1_automated", isAutonomous: false,
  },
  {
    pattern: /(^|\/)\.claude\/commands\/[^/]+\.md$/i,
    framework: "Claude Code Command", agentType: "assistive",
    defaultRisk: "low", defaultOversight: "l1_automated", isAutonomous: false,
  },
  {
    pattern: /(^|\/)CLAUDE\.md$/i,
    framework: "Claude Code", agentType: "assistive",
    defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    pattern: /(^|\/)AGENTS?\.md$/i,
    framework: "Agents.md Instructions", agentType: "assistive",
    defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    pattern: /(^|\/)(\.cursorrules|\.cursor\/(rules|commands|agents)\/[^/]+)$/i,
    framework: "Cursor Origin", agentType: "assistive",
    defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
  {
    pattern: /(^|\/)opencode\.jsonc?$/i,
    framework: "OpenCode", agentType: "assistive",
    defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
    parseAgents: parseOpencodeAgents,
  },
  {
    pattern: /(^|\/)\.opencode\/(agent|agents)\/[^/]+\.md$/i,
    framework: "OpenCode Agent", agentType: "assistive",
    defaultRisk: "medium", defaultOversight: "l2_human_review", isAutonomous: false,
  },
];

async function detectConfigAgentsInternal(
  files: RepoFile[],
  readFile: (path: string) => Promise<string>
): Promise<DiscoveredAgent[]> {
  const discovered: DiscoveredAgent[] = [];

  for (const file of files) {
    for (const det of CONFIG_DETECTORS) {
      if (!det.pattern.test(file.path)) continue;

      let agentNames: string[] = [];
      if (det.parseAgents) {
        try {
          const content = await readFile(file.path);
          agentNames = det.parseAgents(content);
        } catch { /* file unreadable — still register by path */ }
      }

      if (agentNames.length === 0) {
        // One agent per config file, named from the file
        const base = file.name.replace(/\.[^.]+$/, "") || file.name;
        agentNames = [base];
      }

      for (const name of agentNames) {
        const agentName = `${det.framework.replace(/\s+/g, "")}_${name}`.slice(0, 60);
        if (discovered.some(d => d.name === agentName && d.filePath === file.path)) continue;
        discovered.push({
          name: agentName,
          filePath: file.path,
          framework: det.framework,
          agentType: det.agentType,
          confidence: det.parseAgents ? 95 : 85,
          evidence: [`Config file: ${file.path}`],
          suggestedRiskLevel: det.defaultRisk,
          suggestedOversightLevel: det.defaultOversight,
          isAutonomous: det.isAutonomous,
          capabilities: [det.framework],
          modelName: undefined,
          modelProvider: undefined,
        });
      }
      break; // first matching detector wins for this file
    }
  }

  return discovered;
}

export const detectConfigAgents = detectConfigAgentsInternal;

export async function detectAgents(
  files: RepoFile[],
  readFile: (path: string) => Promise<string>
): Promise<DiscoveredAgent[]> {
  // 1. Path-based config detection (definitive: MCP, Claude, Cursor, agents.md, opencode)
  const discovered: DiscoveredAgent[] = await detectConfigAgentsInternal(files, readFile);

  // 2. Content-based framework detection
  const scanFiles = files.filter(shouldScan).slice(0, 200);

  for (const file of scanFiles) {
    try {
      const content = await readFile(file.path);
      if (!content || content.length > 500000) continue;

      for (const fw of FRAMEWORKS) {
        const matchedSignals = fw.signals.filter((s) => s.test(content));
        if (matchedSignals.length === 0) continue;
        if (fw.name === "Custom Agent" && matchedSignals.length < 2) continue;

        const confidence = Math.min(95, 40 + matchedSignals.length * 15);

        const existing = discovered.find((d) => d.filePath === file.path && d.framework === fw.name);
        if (existing) {
          existing.evidence.push(...matchedSignals.map((s) => `Pattern: ${s.source.slice(0, 60)}`));
          existing.confidence = Math.max(existing.confidence, confidence);
          continue;
        }

        const agentName = `${fw.name.replace(/\s+/g, "")}Agent_${file.name.replace(/\.[^.]+$/, "")}`.slice(0, 60);

        discovered.push({
          name: agentName,
          filePath: file.path,
          framework: fw.name,
          agentType: fw.agentType,
          confidence,
          evidence: matchedSignals.map((s) => `Pattern: ${s.source.slice(0, 60)}`),
          suggestedRiskLevel: fw.defaultRisk,
          suggestedOversightLevel: fw.defaultOversight,
          isAutonomous: fw.isAutonomous,
          capabilities: [fw.name],
          modelName: undefined,
          modelProvider: undefined,
        });
      }
    } catch {}
  }

  return discovered;
}