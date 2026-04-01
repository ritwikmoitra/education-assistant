// education-assistant MCP Server
// Express + @modelcontextprotocol/sdk — Streamable HTTP transport (stateless, Vercel-compatible)
// BYOK: users pass their Anthropic API key as a tool argument.

const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const Anthropic = require('@anthropic-ai/sdk').default;

const app = express();
app.use(express.json());

const SKILL_NAME    = 'education-assistant';
const SKILL_VERSION = '1.0.0';

const TOOL_DEFINITIONS = [
  {
    name: 'research_topics',
    description: 'Deep-research one or more DS/ML/GenAI/Statistics topics. Returns a structured 6-section summary (definition, learning agenda, prerequisites, real-life analogy, applications, pitfalls) plus a curated Top 5 free resource list per topic.',
    inputSchema: {
      type: 'object',
      properties: {
        anthropic_api_key: {
          type: 'string',
          description: 'Your Anthropic API key (sk-ant-...)'
        },
        topics: {
          type: 'string',
          description: 'Comma-separated list of topics to research. e.g. "BSTS, causal inference, difference-in-differences"'
        },
        comfort_level: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Your familiarity with the topic. Calibrates depth, analogies, and resource difficulty.'
        }
      },
      required: ['anthropic_api_key', 'topics']
    }
  }
];

const SKILL_SYSTEM_PROMPT = `You are a deep-research education assistant specialising in Data Science, Machine Learning, Generative AI, and Statistics. For each topic the user provides, produce a structured research summary with exactly these 6 sections:

1. **Definition** — clear, precise definition (2-3 sentences)
2. **Learning Agenda** — numbered step-by-step learning path (5-7 steps)
3. **Prerequisites** — what the learner should know first (bullet list)
4. **Real-Life Analogy** — one vivid, memorable analogy
5. **Applications** — 3-5 concrete real-world use cases
6. **Common Pitfalls** — 3-5 mistakes beginners make

After the summary, provide a "Top 5 Free Resources" section as a markdown table with columns: #, Title (linked), Type, Source, Relevance (star rating).

Calibrate depth and language to the user's comfort level (beginner/intermediate/advanced). For beginners: simpler analogies, more prerequisite detail. For advanced: concise, focus on edge cases and papers.

NEVER invent resource URLs. Only include links you are confident exist. If fewer than 5 strong free resources exist, say so honestly.`;

function buildMCPServer() {
  const server = new Server(
    { name: SKILL_NAME, version: SKILL_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!TOOL_DEFINITIONS.find(t => t.name === name)) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const apiKey = args.anthropic_api_key;
    if (!apiKey || !String(apiKey).startsWith('sk-ant-')) {
      return {
        content: [{ type: 'text', text: '⚠️ Provide a valid Anthropic API key (starts with sk-ant-).' }],
        isError: true
      };
    }

    const topics = args.topics || '';
    const comfortLevel = args.comfort_level || 'intermediate';

    if (!topics.trim()) {
      return {
        content: [{ type: 'text', text: '⚠️ Please provide at least one topic to research.' }],
        isError: true
      };
    }

    try {
      const client = new Anthropic({ apiKey });

      const userMessage = `Please research the following topic(s) at ${comfortLevel} level:\n\n${topics}\n\nFor each topic, provide the full 6-section structured summary followed by the Top 5 free resources table.`;

      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: SKILL_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      });

      return {
        content: [{ type: 'text', text: response.content[0].text }]
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error calling Anthropic API: ${err.message}` }],
        isError: true
      };
    }
  });

  return server;
}

// MCP endpoint — handles all transport methods
app.all('/api/mcp', async (req, res) => {
  try {
    // CRITICAL: sessionIdGenerator MUST be undefined for stateless (serverless) mode.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    const server = buildMCPServer();
    await server.connect(transport);

    // Express req/res are Node.js IncomingMessage/ServerResponse — compatible with MCP SDK.
    if (req.method === 'POST') {
      await transport.handleRequest(req, res, req.body);
    } else {
      await transport.handleRequest(req, res);
    }
  } catch (err) {
    console.error('[MCP] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: { code: '500', message: err.message || 'Internal server error' }
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: SKILL_NAME, version: SKILL_VERSION });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`✓ MCP server running — http://localhost:${PORT}/api/mcp`)
  );
}
