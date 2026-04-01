# CLAUDE.md — Agent instructions for Education Assistant

This repository contains a Claude skill published as a standalone MCP server.

## What this does
Deep-research DS/ML/GenAI/Statistics topics and get curated learning resources.

## Key files
- `.claude/skill-config.md` — Original Claude Desktop skill definition
- `mcp-server/server.js` — Express-based MCP server (Vercel-deployable)

## How to run the MCP server
```bash
cd mcp-server && npm install && node server.js
```
Server starts on `http://localhost:3000`. Health check at `/api/health`.

## MCP tools exposed
- `run_education_assistant` — Research one or more DS/ML/GenAI/Stats topics

## Testing
```bash
node -e "require('./mcp-server/server.js'); console.log('OK')"
```
