import type { RepoFileInfo } from "./types";

const AI_FRAMEWORK_PATTERNS: Array<{ name: string; regex: RegExp; category: string }> = [
  { name: "OpenAI Agents SDK", regex: /openai.*agents|agents\.Runner|openai.*Agent/i, category: "ai_framework" },
  { name: "LangChain", regex: /langchain|langgraph|create_react_agent/i, category: "ai_framework" },
  { name: "LangGraph", regex: /langgraph|StateGraph|CompiledGraph/i, category: "ai_framework" },
  { name: "CrewAI", regex: /crewai|Crew\s*\(|Agent\s*\(.*role/i, category: "ai_framework" },
  { name: "AutoGen", regex: /autogen|AssistantAgent|ConversableAgent/i, category: "ai_framework" },
  { name: "Anthropic SDK", regex: /anthropic|claude\.messages/i, category: "ai_sdk" },
  { name: "OpenAI SDK", regex: /openai\.chat|openai\.beta/i, category: "ai_sdk" },
  { name: "OpenRouter", regex: /openrouter/i, category: "ai_sdk" },
  { name: "MCP Server", regex: /modelcontextprotocol|StdioServerTransport/i, category: "ai_protocol" },
  { name: "Dify", regex: /dify|dify_app/i, category: "ai_platform" },
  { name: "Semantic Kernel", regex: /SemanticKernel|CreateKernel/i, category: "ai_framework" },
  { name: "Cursor Origin", regex: /\.cursor\/rules|\.cursor\/agents|\.cursor\/commands/i, category: "ai_tool" },
  { name: "n8n AI", regex: /n8n.*ai|n8n.*agent/i, category: "ai_platform" },
  { name: "LlamaIndex", regex: /llama_index|llamaindex/i, category: "ai_framework" },
  { name: "Claude Code", regex: /CLAUDE\.md|claude_code/i, category: "ai_tool" },
];

const WEB_FRAMEWORK_PATTERNS: Array<{ name: string; regex: RegExp; category: string }> = [
  { name: "Next.js", regex: /next(?:\.config)?\.[jt]s|next\//, category: "web_framework" },
  { name: "NestJS", regex: /@nestjs\/|\.module\.ts|\.controller\.ts|\.service\.ts/, category: "web_framework" },
  { name: "Express", regex: /express|express\.Router/, category: "web_framework" },
  { name: "FastAPI", regex: /fastapi|from\s+fastapi/, category: "web_framework" },
  { name: "Django", regex: /django|manage\.py|wsgi\.py|asgi\.py|urls\.py/, category: "web_framework" },
  { name: "Flask", regex: /flask|Flask\s*\(/, category: "web_framework" },
  { name: "Spring Boot", regex: /springboot|@SpringBootApplication|pom\.xml/, category: "web_framework" },
  { name: ".NET/C#", regex: /\.cs$|Program\.cs|\.csproj/, category: "web_framework" },
  { name: "Go Fiber", regex: /fiber|fiber\.New/, category: "web_framework" },
  { name: "Gin", regex: /gin\.Default|gin\.New|gin\.RouterGroup/, category: "web_framework" },
  { name: "Remix", regex: /@remix-run|remix\.config/, category: "web_framework" },
  { name: "SvelteKit", regex: /@sveltejs\/kit|svelte\.config/, category: "web_framework" },
  { name: "Nuxt", regex: /nuxt\.config|@nuxt/, category: "web_framework" },
];

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript (React)",
  ".js": "JavaScript", ".jsx": "JavaScript (React)",
  ".py": "Python", ".go": "Go", ".rs": "Rust",
  ".java": "Java", ".cs": "C#", ".rb": "Ruby",
  ".php": "PHP", ".swift": "Swift", ".kt": "Kotlin",
  ".scala": "Scala", ".c": "C", ".cpp": "C++",
};

export function detectFrameworks(files: RepoFileInfo[]): {
  frameworks: string[];
  languages: string[];
} {
  const detectedFrameworks = new Set<string>();
  const detectedLanguages = new Set<string>();

  for (const file of files) {
    const ext = file.ext.toLowerCase();
    const lang = LANGUAGE_MAP[ext];
    if (lang) detectedLanguages.add(lang);

    for (const fw of AI_FRAMEWORK_PATTERNS) {
      if (fw.regex.test(file.path) || fw.regex.test(file.name)) {
        detectedFrameworks.add(fw.name);
      }
    }

    for (const fw of WEB_FRAMEWORK_PATTERNS) {
      if (fw.regex.test(file.path) || fw.regex.test(file.name)) {
        detectedFrameworks.add(fw.name);
      }
    }
  }

  if (detectedLanguages.has("Python")) {
    if (detectedFrameworks.has("FastAPI")) detectedFrameworks.delete("Flask");
    if (!detectedFrameworks.has("FastAPI") && !detectedFrameworks.has("Django") && !detectedFrameworks.has("Flask")) {
      detectedFrameworks.add("Python (standalone)");
    }
  }

  if (detectedLanguages.has("Go")) {
    if (!detectedFrameworks.has("Gin") && !detectedFrameworks.has("Go Fiber")) {
      detectedFrameworks.add("Go (standalone)");
    }
  }

  return {
    frameworks: [...detectedFrameworks],
    languages: [...detectedLanguages],
  };
}