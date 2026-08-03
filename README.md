# ecommerce-mcp

A TypeScript MCP server for e-commerce ops teams. It helps an AI agent investigate stuck orders, fix common fulfillment problems, and log what changed.

All data is fake (in-memory). Nothing connects to a real store.

## Problem this solves

Ops teams often jump between order status, warehouse stock, shipping addresses, and error logs when something fails. This server puts that into MCP tools so an agent can run the workflow in one conversation.

Typical flow:

1. List stuck orders
2. Investigate one order (stock, address, logs)
3. Fix it (reallocate warehouse, fix address, or issue credit)
4. Investigate again to confirm

## MCP tools

| Tool                      | What it does                                  |
| ------------------------- | --------------------------------------------- |
| `list_stuck_orders`       | Lists orders in `FULFILLMENT_FAILED`          |
| `investigate_order_issue` | Root cause + stock view + suggested next step |
| `reallocate_inventory`    | Move order to another warehouse with stock    |
| `fix_shipping_address`    | Update and validate shipping address          |
| `issue_customer_credit`   | Add or deduct store credit (via order ID)     |

Order IDs use the format `ORD-1001`. The agent usually converts “order 1001” to that format before calling a tool.

## Hosted URL

```
https://ecommerce-mcp-8dm5.onrender.com/mcp
```

Dashboard: https://ecommerce-mcp-8dm5.onrender.com  
Health: https://ecommerce-mcp-8dm5.onrender.com/health

Health check: `GET /health`  
Dashboard: `GET /`

MCP uses **Streamable HTTP** on a single `/mcp` endpoint (the current MCP remote transport).

## Local setup

Requirements: Node 20+, pnpm

```bash
pnpm install
pnpm build
pnpm test
```

Run HTTP (port 8000):

```bash
pnpm start:http
```

Run STDIO (for Claude Desktop / local MCP clients):

```bash
pnpm start
```

Custom port:

```bash
# PowerShell
$env:PORT="3001"; pnpm start:http
```

Restart the server if you want fresh seed data. The database lives in memory and changes stick until you restart.

## Connect an MCP client

**HTTP:** point your client at `http://localhost:8000/mcp` (or your hosted URL).

**STDIO:** run `node build/index.js` or use the `mcp-server` bin after build.

## Project layout

```
src/
  index.ts          # HTTP + STDIO entry, session handling
  db.ts             # In-memory store
  data/seeds.ts     # Sample orders and inventory
  tools/            # MCP tool handlers
  views/dashboard.ts
tests/              # vitest
scripts/build.mjs   # esbuild bundle step
```

## Tests

```bash
pnpm test
```

Covers the database, tools, and HTTP endpoints (including MCP initialize).

## What we skipped on purpose

- Real database or payment APIs
- Auth / user accounts
- Full admin UI (only a small HTML status page)
- CI/CD pipeline

## Sample orders (seed data)

| Order    | Issue                                          |
| -------- | ---------------------------------------------- |
| ORD-1001 | Out of stock at WH-EAST (stock at WH-WEST)     |
| ORD-1002 | Invalid shipping ZIP                           |
| ORD-1003 | PAID, keyboard stock problem at WH-CENTRAL     |
| ORD-1004 | Out of stock at WH-EAST (chairs at WH-CENTRAL) |
| ORD-1005 | Already SHIPPED (should block reallocation)    |

## Notes

- `reallocate_inventory` sets status to `READY_FOR_SHIPMENT` — there is no separate “retrigger” tool.
- Credit tool needs an **order ID**, not a customer ID like `CUST-501`.
- If port 8000 is busy, set `PORT` or stop the other process.
