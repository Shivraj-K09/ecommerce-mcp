# ecommerce-mcp

A TypeScript MCP (Model Context Protocol) server for e-commerce ops teams. It empowers AI agents to investigate stuck fulfillment orders, enforce safety guardrails, submit human-review escalation tickets, and log durable audit trails.

Backed by a real **PostgreSQL database** (Render Postgres) with auto-migration schema definition and synthetic data seeding on startup.

---

## 🎯 Problem Solved & Operational Workflow

Ops teams frequently context-switch across order management, warehouse inventory stock, shipping address validation, and fulfillment error logs when orders get stuck. This server exposes that entire operational workflow via MCP tools in a unified AI conversation.

### Typical Workflow:

1. **List Stuck Orders**: Identify orders stuck in `FULFILLMENT_FAILED`.
2. **Investigate Order Issue**: Diagnose root cause, validate address integrity, and analyze stock across all warehouses (`WH-EAST`, `WH-WEST`, `WH-CENTRAL`).
3. **Human Escalation Safety Boundary**:
   - **Warehouse Rerouting**: Instead of auto-changing warehouses, gather stock evidence and submit a **Human-Review Escalation Ticket** (`WAREHOUSE_REROUTE`).
   - **Shipping Address Corrections**: Gather address validation evidence and submit a **Human-Review Escalation Ticket** (`ADDRESS_CORRECTION`).
4. **Store Credit Guardrails**: Issue goodwill store credit (automatically capped at **$25.00 max** and blocked on duplicate credit attempts per order ID; larger amounts or duplicates generate a manager review ticket).
5. **Locked State Safeguards**: Strictly lock `SHIPPED` and `CANCELLED` orders against modifications or credit adjustments.

---

## 🛠️ Registered MCP Tools

| Tool | What it does | Safety & Guardrails |
| :--- | :--- | :--- |
| `list_stuck_orders` | Lists orders in `FULFILLMENT_FAILED` status | Read-only |
| `investigate_order_issue` | Root cause diagnostics + multi-warehouse inventory view + recommended next step | Read-only |
| `reallocate_inventory` | Submits human-review ticket to reassign an order to an alternate warehouse with stock | **Human Review**: Does NOT auto-mutate order; creates `WAREHOUSE_REROUTE` ticket |
| `fix_shipping_address` | Submits human-review ticket to correct invalid shipping address details | **Human Review**: Does NOT auto-mutate address; creates `ADDRESS_CORRECTION` ticket |
| `issue_customer_credit` | Applies goodwill store credit or deduction for customer linked to an order | **$25.00 Cap**: Capped at $25.00 max & blocks duplicates; generates `STORE_CREDIT_APPROVAL` ticket if exceeded |
| `escalate_order_issue` | Views and manages human-review escalation tickets (`PENDING_HUMAN_REVIEW`) | Read / Query |

*Note: Order IDs use the format `ORD-1001`. AI agents normalize user text like "order 1001" to this canonical format before invoking tools.*

---

## 🌐 Endpoints & Hosted URLs

- **MCP Endpoint (Streamable HTTP)**: `https://ecommerce-mcp-8dm5.onrender.com/mcp`
- **Developer Overview**: `https://ecommerce-mcp-8dm5.onrender.com/`
- **Health Check**: `https://ecommerce-mcp-8dm5.onrender.com/health`
- **Database Tables Viewer**: `https://ecommerce-mcp-8dm5.onrender.com/table`
- **Database Reset API**: `https://ecommerce-mcp-8dm5.onrender.com/reset`

---

## 💻 Local Setup & Execution

### Requirements
- **Node.js**: v20+
- **Package Manager**: `pnpm`

### Installation & Verification

```bash
# Install dependencies
pnpm install

# Build ES modules bundle
pnpm build

# Run unit & integration test suite (24 tests)
pnpm test
```

### Run Server

**Streamable HTTP Transport (Port 8000)**:
```bash
pnpm start:http
```

**STDIO Transport (For Claude Desktop / Local MCP Clients)**:
```bash
pnpm start
```

**Custom Port Execution**:
```powershell
$env:PORT="8000"; pnpm start:http
```

---

## 🗄️ PostgreSQL Database Integration

- **Production / Live**: Connects to Render Postgres using `DATABASE_URL`.
- **Auto-Migration & Seeding**: Executes `CREATE TABLE IF NOT EXISTS` on boot for `warehouses`, `inventory`, `orders`, `fulfillment_logs`, `customer_credits`, and `escalation_tickets`, automatically populating synthetic test data if tables are empty.
- **On-Demand Reset**: Trigger `GET /reset` or click **Reset Table Data** on `/table` to wipe temporary records and restore clean default seed data anytime.
- **Offline Testing Fallback**: Automatically falls back to fast in-memory mocking during offline `pnpm test` runs.

---

## 📁 Project Structure

```text
src/
  ├── index.ts                     # HTTP + STDIO transport server entrypoint & routes
  ├── db.ts                        # PostgreSQL connection pool, auto-migration, & sync
  ├── db/
  │   └── schema.ts                # DDL SQL statements & TypeScript entity definitions
  ├── data/
  │   └── seeds.ts                 # Initial synthetic test data (orders, inventory, logs)
  ├── tools/
  │   ├── index.ts                 # MCP tool registry exports
  │   ├── list-stuck-orders.ts
  │   ├── investigate-order-issue.ts
  │   ├── reallocate-inventory.ts   # Submits WAREHOUSE_REROUTE escalation tickets
  │   ├── fix-shipping-address.ts   # Submits ADDRESS_CORRECTION escalation tickets
  │   ├── issue-customer-credit.ts  # Capped at $25.00 max & duplicate check
  │   └── escalate-order-issue.ts   # Escalation ticket query tool
  └── views/
      └── dashboard.ts             # Clean documentation & HTML database tables viewer
tests/                             # Vitest test suite (db.test.ts, tools.test.ts, server.test.ts)
scripts/
  └── build.mjs                    # esbuild bundler script
```

---

## 🧪 Testing

```bash
pnpm test
```
All 24 test cases cover:
1. PostgreSQL schema auto-creation, loading, and queries.
2. Escalation ticket creation for warehouse reroutes and address fixes.
3. $25.00 store credit cap and duplicate credit rejection.
4. Locked state invariant enforcement for `SHIPPED` and `CANCELLED` orders.
5. HTTP endpoints and MCP initialize handshakes.

---

## 📋 Sample Orders (Seed Data)

| Order ID | Customer | Initial Issue |
| :--- | :--- | :--- |
| `ORD-1001` | Alice Johnson | Out of stock at `WH-EAST` (25 units available at `WH-WEST`) |
| `ORD-1002` | Bob Smith | Invalid shipping ZIP (`INVALID_ZIP`) |
| `ORD-1003` | Charlie Brown | `PAID` state, stock issue at `WH-CENTRAL` |
| `ORD-1004` | Diana Prince | Out of stock at `WH-EAST` (stock available at `WH-CENTRAL`) |
| `ORD-1005` | Evan Wright | `SHIPPED` (Strictly locked from reallocations or credits) |
