import { IncomingMessage, ServerResponse } from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_INPUT_SCHEMA, runTool } from "../src/tool";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set in Vercel environment variables." }));
    return;
  }

  // Parse body for POST requests
  let body: any = {};
  if (req.method === "POST") {
    const raw = await new Promise<string>((resolve) => {
      let data = "";
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => resolve(data));
    });
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
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
  await transport.handleRequest(req, res, body);
}
