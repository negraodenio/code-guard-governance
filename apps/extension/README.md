# CodeGuard AI — AI Compliance & Code Intelligence System

https://code-guard.eu

AI system for auditing, validating, and governing AI-generated code in production environments.

---

## 🚨 Problem

AI is writing more code than ever.

But:

- Generated code introduces hidden security risks  
- Compliance (GDPR, AI Act) is often ignored  
- Teams lack visibility and control  
- Errors scale faster than traditional review processes  

---

## 💡 Solution: Triple-Channel Protection

CodeGuard AI analyzes and validates code using a unified architecture that works everywhere:

1. 💻 **IDE Extension**: Real-time scanning and auto-fixes directly in VS Code & Cursor.
2. 🤖 **MCP Server**: Give your AI agents (Claude, Cursor) the context they need to follow standards.
3. 🌐 **REST API & CLI**: Automate compliance in your CI/CD Pipeline (Vercel, GitHub Actions).

---

## ⚙️ Core Capabilities

- 🔍 Detect vulnerabilities and unsafe patterns  
- 🛡 Validate compliance (GDPR, AI Act, security standards)  
- 🧠 Audit AI-generated code before deployment  
- 📊 Provide structured, actionable feedback  
- 🔄 Analyze code changes using diff-based auditing  

---

## 🌐 REST API

CodeGuard provides a secure REST API for integrating compliance scanning into your applications and workflows.

### Quick Start

```bash
# 1. Set environment variables
export CODEGUARD_API_KEYS="your-api-key-1,your-api-key-2"
export TRANSPORT_MODE=sse

# 2. Start the API server
npm run start:mcp

# 3. Test the API
curl -X POST http://localhost:3000/api/scan \
  -H "x-api-key: your-api-key-1" \
  -H "Content-Type: application/json" \
  -d '{"region": "BR", "frameworks": ["gdpr", "lgpd"]}'
```

---

## 🚀 Deploy to Vercel

Deploy your CodeGuard API to production in minutes:

```bash
npm run vercel:deploy
```

**Required Environment Variables:**
- `CODEGUARD_API_KEYS`
- `CODEGUARD_LICENSE_KEY`
- `OPENAI_API_KEY` (Optional)

---

## 🛠 Tech Stack

- **Core**: TypeScript / Node.js  
- **Intelligence**: Multi-provider LLM (GPT-4o, Claude, MiniMax 2.7)  
- **Protocol**: Model Context Protocol (MCP)  
- **Platform**: Vercel / Supabase  

---

## 👥 Who is this for

- Engineering teams using AI-generated code  
- Companies operating under GDPR / AI Act  
- Platforms integrating LLM-based development workflows  

---

## 🔥 Positioning

Not a linter. Not a scanner.  
**A system for governing AI-generated code.**
