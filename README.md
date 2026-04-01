# 📚 Education Assistant

> Deep-research DS/ML/GenAI/Statistics topics and get curated learning resources.

[![MCP Server](https://img.shields.io/badge/MCP_Server-Vercel-black)](https://education-assistant-mcp.vercel.app/api/mcp)
[![Claude Skill](https://img.shields.io/badge/Claude-Skill-violet)](https://github.com/ritwikmoitra/education-assistant)

## The problem

Learning technical topics like ML and statistics is hard when you don't know where to start. Generic search results are overwhelming, often paywalled, and lack structured guidance. This tool gives you a structured research summary plus a vetted Top 5 free resource list per topic — instantly.

## How it works

You provide a list of topics. The skill runs web searches for source material, calls Claude Opus for a structured 6-section research summary (definition, agenda, prerequisites, analogy, applications, pitfalls), then curates 5 free verified resources per topic. Results are tracked in a registry to avoid repeats across sessions.

## MCP Server (Claude Desktop)

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "education-assistant": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["mcp-remote", "https://education-assistant-mcp.vercel.app/api/mcp"]
    }
  }
}
```

## Run locally

```bash
git clone https://github.com/ritwikmoitra/education-assistant
cd education-assistant/mcp-server
npm install
node server.js   # http://localhost:3000/api/mcp
```

## Project structure

```
education-assistant/
  mcp-server/          ← Vercel MCP server (Express + MCP SDK)
    server.js
    package.json
    vercel.json
  .claude/
    skill-config.md    ← Original Claude Desktop skill definition
  CLAUDE.md
  README.md
```

## Tech stack

![Claude API](https://img.shields.io/badge/Claude_API-Opus-violet)
![Claude Opus](https://img.shields.io/badge/Claude-Opus-blue)
![Web Search](https://img.shields.io/badge/Web_Search-enabled-green)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![Google Docs](https://img.shields.io/badge/Google_Docs-export-orange)
![Zapier](https://img.shields.io/badge/Zapier-MCP-red)

---
Built with the [Claude AI Portfolio Builder](https://github.com/ritwikmoitra/portfolio) · Part of my [AI Engineering Portfolio](https://ritwikmoitra.github.io/portfolio)
