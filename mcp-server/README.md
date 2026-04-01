# Education Assistant — MCP Server

> Deep-research DS/ML/GenAI/Statistics topics and get curated learning resources.

## Add to Claude Desktop

In `%APPDATA%\Claude\claude_desktop_config.json`:

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

Restart Claude Desktop after saving.

## Tools

| Tool | Description |
|---|---|
| `research_topics` | Research DS/ML/GenAI/Stats topics with structured summary + Top 5 free resources |

**Inputs:** `topics` (comma-separated), `comfort_level` (beginner/intermediate/advanced), `anthropic_api_key`

## Local development

```bash
npm install
node server.js   # http://localhost:3000
curl http://localhost:3000/api/health
```
