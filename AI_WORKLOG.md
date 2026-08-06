# AI Worklog

Short log of how AI tools were used on this project and what I checked myself.

## Tools and models

- **Cursor** (agent mode) for most of the coding, debugging, and tests
- **Context7 MCP** to read MCP TypeScript SDK docs (Streamable HTTP, sessions)
- Manual agent testing in Cursor with the ecommerce-mcp MCP connected

I did not stick to one model for everything. I used whatever Cursor routed for implementation and review.

## How the work was split

**AI helped with:**

- Project structure, tool handlers, Express/MCP wiring
- Fixing the server exiting immediately (listen error handling, CJS build)
- Session-based HTTP transport (one transport per client session)
- Writing and expanding vitest tests
- Hard-test prompts for the agent and reading the results

**I decided / verified:**

- Scope: stuck orders only, synthetic data, no real auth
- Which tools to ship (5 tools, no separate retrigger — reallocate + fix address cover it)
- That agent stress tests passed before calling it done
- Tool bug fixes after testing (stale diagnostics, double stock deduct, credit ID confusion)

## Prompts that mattered

Examples of instructions that actually moved the work forward:

- “Fix the server closing instantly without breaking the codebase”
- “Check against MCP docs — are we overcomplicating?”
- “Fix the three tool bugs from agent testing”
- “Give agent prompts to try to break the MCP”

I tried to give constraints: no extra files unless needed, no `.js` extensions in imports, keep diffs small.

## AI suggestions I changed or rejected

1. **Single shared HTTP transport for all clients** — docs say per-session transports. We changed to a session map on initialize. Good catch from comparing to SDK examples.

2. **Startup via `node -e require(...)`** — worked but was awkward. Replaced with `node build/index.js --http`.

3. **Mock Express server in tests** — tests did not hit the real server. Replaced with tests that call `startHttpServer` for real.

4. **Accepting bare order numbers like `1001` in the server** — left as-is. Tools expect `ORD-1001`; the agent normalizes user text. That matches normal MCP usage.

## How I verified AI output

- `pnpm build` and `pnpm test` (25 tests)
- Manual `pnpm start:http` and curl on `/health`
- MCP initialize POST on `/mcp`
- 8 agent conversation tests (happy path, bad IDs, shipped order, parallel fixes, etc.)
- Restart server between full demo runs (in-memory state)

## Remaining gaps

- **Demo video** — Recorded and included (YouTube link)
- **In-memory DB** — fine for the assignment; data resets on restart
- **No auth on HTTP endpoint** — OK for synthetic demo; would need auth in production

- **Deployed at**: https://ecommerce-mcp-8dm5.onrender.com/mcp
- **Repo**: https://github.com/Shivraj-K09/ecommerce-mcp

## Risks if someone uses this for real

- No persistence across restarts
- No rate limiting or auth on `/mcp`
- Stock math does not return inventory to the old warehouse on reallocate (simplified mock)

Those are acceptable for this challenge; called out here on purpose.
