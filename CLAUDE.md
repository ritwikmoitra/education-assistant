# CLAUDE.md — Agent instructions for Education Assistant

## What this does
Deep-research learning companion that builds structured 6-section study guides for any DS/ML/GenAI/Statistics topic, plus a curated Top 5 free resource list calibrated to the user's comfort level.

## Repository structure
- `mcp/api/index.ts` — Vercel serverless MCP entry point
- `mcp/src/tool.ts` — Core skill logic: system prompt, input schema, Anthropic API call
- `mcp/package.json` / `mcp/tsconfig.json` / `mcp/vercel.json` — MCP server config
- `.claude/skill-config.md` — Original Claude Desktop skill definition (source of truth)

## MCP endpoint
`https://education-assistant.vercel.app/api/mcp`
Transport: HTTP/SSE. Requires `ANTHROPIC_API_KEY` env var in Vercel.

## Tool: education_assistant
- Input: `topics` (string), `comfort_level` (Beginner | Intermediate | Advanced)
- Output: Structured markdown with 6-section summaries + Top 5 resources per topic

## Connect to Claude Desktop
```json
{
  "mcpServers": {
    "education-assistant": {
      "url": "https://education-assistant.vercel.app/api/mcp",
      "type": "http"
    }
  }
}
```

## Deploy your own
```bash
cd mcp && npm install && vercel --prod
vercel env add ANTHROPIC_API_KEY production
```

## Modify the skill logic
Edit `mcp/src/tool.ts` — specifically `SYSTEM_PROMPT` and the `userMessage` builder.
The source skill definition in `.claude/skill-config.md` is the reference.
