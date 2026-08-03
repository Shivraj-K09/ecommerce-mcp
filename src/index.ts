import type { Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { McpServer, isInitializeRequest } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import { registerCommerceTools } from "./tools";
import { renderDashboardHtml } from "./views/dashboard";

dotenv.config();

function createCommerceServer(): McpServer {
  const server = new McpServer({
    name: "ecommerce-mcp",
    version: "1.0.0",
  });
  registerCommerceTools(server);
  return server;
}

function sendJsonRpcError(
  res: Response,
  status: number,
  code: number,
  message: string,
): void {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
}

export async function startHttpServer(port: number): Promise<HttpServer> {
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());

  const transports = new Map<string, StreamableHTTPServerTransport>();

  const handleMcpRoute = async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        await transports.get(sessionId)!.handleRequest(req, res, req.body);
        return;
      }

      if (
        !sessionId &&
        req.method === "POST" &&
        isInitializeRequest(req.body)
      ) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports.set(id, transport);
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (id) {
            transports.delete(id);
          }
        };

        const server = createCommerceServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (sessionId) {
        sendJsonRpcError(res, 404, -32001, "Session not found");
        return;
      }

      sendJsonRpcError(
        res,
        400,
        -32000,
        "Bad Request: No valid session ID provided",
      );
    } catch (err) {
      console.error("Error handling MCP request:", err);
      if (!res.headersSent) {
        sendJsonRpcError(res, 500, -32603, "Internal server error");
      }
    }
  };

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: "ecommerce-mcp",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (_req: Request, res: Response) => {
    res.send(renderDashboardHtml());
  });

  // Single Streamable HTTP MCP endpoint (replaces deprecated HTTP+SSE /sse + /messages).
  // Spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
  app.all("/mcp", handleMcpRoute);

  const httpServer = await new Promise<HttpServer>((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(server);
    });
  });

  const shutdown = async () => {
    console.error("Shutting down server...");
    for (const [id, transport] of transports) {
      try {
        await transport.close();
        transports.delete(id);
      } catch (err) {
        console.error(`Error closing transport for session ${id}:`, err);
      }
    }

    httpServer.close(() => {
      process.exit(0);
    });
  };

  if (!process.env.VITEST) {
    process.on("SIGINT", () => void shutdown());
    process.on("SIGTERM", () => void shutdown());
  }

  console.error(`ecommerce-mcp Server running on HTTP port ${port}`);
  console.error(`MCP Endpoint: http://localhost:${port}/mcp`);
  console.error(`Health: http://localhost:${port}/health`);

  return httpServer;
}

async function startStdioServer() {
  const server = createCommerceServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ecommerce-mcp Server running on STDIO transport");
}

async function main() {
  const wantsHttp =
    process.argv.includes("--http") ||
    process.env.TRANSPORT === "http" ||
    Boolean(process.env.PORT);

  if (wantsHttp) {
    const port = parseInt(process.env.PORT || "8000", 10);
    await startHttpServer(port);
  } else {
    await startStdioServer();
  }
}

if (!process.env.VITEST) {
  main().catch((error: unknown) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}
