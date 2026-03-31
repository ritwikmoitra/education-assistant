import type { VercelRequest, VercelResponse } from "@vercel/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_INPUT_SCHEMA, runTool } from "../src/tool";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not set in Vercel environment variables. Set it at: vercel.com/dashboard -> project -> Settings -> Environment Variables" });
    return;
  }

  const server = new McpServer({ name: TOOL_NAME, version: "1.0.0" });

  server.tool(TOOL_NAME, TOOL_DESCRIPTION, TOOL_INPUT_SCHEMA, async (input) => {
    try {
      const result = await runTool(input as Record<string, string>, apiKey);
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
    }
  });

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req as any, res as any, req.body);
}