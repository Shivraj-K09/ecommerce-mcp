export function renderDashboardHtml(port = 8001): string {
  const host = process.env.HOST || "127.0.0.1";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Commerce Operations MCP Server</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; line-height: 1.6; }
          .card { background: #1e293b; padding: 2rem; border-radius: 12px; max-width: 650px; margin: 0 auto; border: 1px solid #334155; }
          h1 { color: #38bdf8; margin-top: 0; }
          code { background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 4px; color: #f43f5e; font-size: 0.9em; }
          .endpoint { background: #334155; padding: 0.5rem 1rem; border-radius: 6px; margin: 0.5rem 0; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🛒 Commerce Operations MCP Server</h1>
          <p>Remotely hosted AI Model Context Protocol Server for E-Commerce Operations.</p>
          <h3>🌐 MCP Connection Endpoints:</h3>
          <div class="endpoint">Primary MCP: <code>POST/GET/DELETE http://${host}:${port}/mcp</code></div>
          <div class="endpoint">Health Status: <code>GET http://${host}:${port}/health</code></div>
          <p>Legacy clients may also use <code>/sse</code> and <code>/messages</code>.</p>
          <h3>🛠️ Registered Tools:</h3>
          <ul>
            <li><code>list_stuck_orders</code></li>
            <li><code>investigate_order_issue</code></li>
            <li><code>reallocate_inventory</code></li>
            <li><code>fix_shipping_address</code></li>
            <li><code>issue_customer_credit</code></li>
          </ul>
        </div>
      </body>
    </html>
  `;
}
