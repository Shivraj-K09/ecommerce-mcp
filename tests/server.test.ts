import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { startHttpServer } from "../src/index";

describe("Commerce Operations MCP HTTP Server", () => {
  let serverInstance: Server;
  const PORT = 3999;

  beforeAll(async () => {
    serverInstance = await startHttpServer(PORT);
  });

  afterAll(() => {
    serverInstance?.close();
  });

  it("should respond with 200 OK and status JSON on GET /health", async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.server).toBe("commerce-ops");
    expect(data.version).toBe("1.0.0");
    expect(data.timestamp).toBeDefined();
  });

  it("should respond with HTML dashboard on GET /", async () => {
    const res = await fetch(`http://localhost:${PORT}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Commerce Operations MCP Server");
    expect(text).toContain("list_stuck_orders");
    expect(text).toContain("/mcp");
  });

  it("should handle MCP initialize on POST /mcp and return a session id", async () => {
    const res = await fetch(`http://localhost:${PORT}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toBeTruthy();

    const text = await res.text();
    expect(text).toContain("commerce-ops");
    expect(text).toContain('"tools"');
  });

  it("should reject MCP requests without a session id after initialize", async () => {
    const res = await fetch(`http://localhost:${PORT}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.message).toContain("session");
  });

  it("should route legacy /sse initialize requests through the same handler", async () => {
    const res = await fetch(`http://localhost:${PORT}/sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "legacy-test", version: "1.0.0" },
        },
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toBeTruthy();
  });
});
