export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ecommerce-mcp</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #111827;
      --muted: #6b7280;
      --border: #e5e7eb;
      --card-bg: #f9fafb;
      --code-bg: #f3f4f6;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2.5rem 1.5rem;
      max-width: 760px;
      margin: 0 auto;
      line-height: 1.5;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .brand-h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .btn {
      background: #111827;
      color: #ffffff;
      border: 1px solid #111827;
      padding: 0.45rem 0.9rem;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.85rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      transition: background 0.15s;
    }

    .btn:hover { background: #1f2937; }

    .description {
      color: var(--muted);
      font-size: 0.925rem;
      margin-bottom: 1.75rem;
    }

    .section-heading {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text);
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
    }

    .endpoint-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.6rem 0.85rem;
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
      font-size: 0.825rem;
      color: #374151;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
    }

    .endpoint-box code {
      color: #111827;
      font-weight: 600;
    }

    ul.tools-list {
      list-style: none;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }

    ul.tools-list li {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    ul.tools-list li:last-child {
      border-bottom: none;
    }

    ul.tools-list code {
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
      background: var(--code-bg);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-weight: 600;
      color: #111827;
      font-size: 0.8rem;
      min-width: 180px;
    }

    .tool-desc {
      color: var(--muted);
      font-size: 0.825rem;
    }

    footer {
      margin-top: 2.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
      font-size: 0.8rem;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand-h1">ecommerce-mcp</div>
    <a href="/table" class="btn">View Database Tables →</a>
  </header>

  <p class="description">Remotely hosted Model Context Protocol (MCP) server for e-commerce order fulfillment operations.</p>

  <div class="section-heading">MCP Connection Endpoints</div>
  <div class="endpoint-box">
    <span>Streamable HTTP Transport</span>
    <code id="mcp-endpoint">/mcp</code>
  </div>
  <div class="endpoint-box">
    <span>Health Check</span>
    <code id="health-endpoint">/health</code>
  </div>
  <div class="endpoint-box">
    <span>Database Reset Endpoint</span>
    <code id="reset-endpoint">/reset</code>
  </div>
  <div class="endpoint-box">
    <span>Database Tables Viewer</span>
    <code>/table</code>
  </div>

  <div class="section-heading">Registered Operational Tools</div>
  <ul class="tools-list">
    <li>
      <code>list_stuck_orders</code>
      <span class="tool-desc">Retrieves stuck e-commerce orders requiring attention</span>
    </li>
    <li>
      <code>investigate_order_issue</code>
      <span class="tool-desc">Diagnoses root cause & checks inventory across warehouses</span>
    </li>
    <li>
      <code>reallocate_inventory</code>
      <span class="tool-desc">Submits human-review escalation ticket for warehouse rerouting</span>
    </li>
    <li>
      <code>fix_shipping_address</code>
      <span class="tool-desc">Submits human-review escalation ticket for address correction</span>
    </li>
    <li>
      <code>issue_customer_credit</code>
      <span class="tool-desc">Issues goodwill store credit (capped at $25.00 automatic max)</span>
    </li>
    <li>
      <code>escalate_order_issue</code>
      <span class="tool-desc">Views & manages human-review escalation tickets</span>
    </li>
  </ul>

  <footer>
    <span>Streamable HTTP Transport</span>
    <span>v1.0.0</span>
  </footer>

  <script>
    const origin = window.location.origin;
    document.getElementById("mcp-endpoint").textContent = "POST/GET/DELETE " + origin + "/mcp";
    document.getElementById("health-endpoint").textContent = "GET " + origin + "/health";
    document.getElementById("reset-endpoint").textContent = "GET/POST " + origin + "/reset";
  </script>
</body>
</html>`;
}

export function renderTableHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Tables | ecommerce-mcp</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #111827;
      --muted: #6b7280;
      --border: #d1d5db;
      --header-bg: #f3f4f6;
      --stripe-bg: #f9fafb;
      --danger: #dc2626;
      --success: #16a34a;
      --warning: #d97706;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      max-width: 1050px;
      margin: 0 auto;
      line-height: 1.5;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .brand-h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .btn-reset {
      background: #dc2626;
      color: #ffffff;
      border: 1px solid #dc2626;
      padding: 0.45rem 0.9rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .btn-reset:hover { background: #b91c1c; }

    .nav-link {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .nav-link:hover { color: var(--text); }

    .table-section {
      margin-bottom: 2.5rem;
    }

    .table-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: #111827;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      font-size: 0.825rem;
    }

    .data-table th, .data-table td {
      padding: 0.65rem 0.85rem;
      text-align: left;
      border: 1px solid var(--border);
    }

    .data-table th {
      background: var(--header-bg);
      color: #374151;
      font-weight: 700;
      font-size: 0.775rem;
      text-transform: uppercase;
    }

    .data-table tbody tr:nth-child(even) {
      background: var(--stripe-bg);
    }

    .badge {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.725rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-failed { background: #fee2e2; color: #991b1b; }
    .badge-ready { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef3c7; color: #92400e; }

    code {
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
      font-size: 0.8rem;
    }

    .empty-cell {
      color: var(--muted);
      text-align: center;
      padding: 1.5rem;
    }
  </style>
</head>
<body>

  <header>
    <div>
      <div class="brand-h1">PostgreSQL Database Tables</div>
      <a href="/" class="nav-link">← Back to Overview</a>
    </div>
    <div class="header-actions">
      <button class="btn-reset" onclick="resetTableData()">🔄 Reset Table Data</button>
    </div>
  </header>

  <!-- Table 1: Orders -->
  <div class="table-section">
    <div class="table-title">Table: orders</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>id</th>
          <th>customer_name</th>
          <th>customer_email</th>
          <th>assigned_warehouse_id</th>
          <th>status</th>
          <th>failure_reason</th>
        </tr>
      </thead>
      <tbody id="orders-table-body">
        <tr><td colspan="6" class="empty-cell">Loading orders table...</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Table 2: Customer Credits -->
  <div class="table-section">
    <div class="table-title">Table: customer_credits</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>customer_id</th>
          <th>customer_name</th>
          <th>store_credit_balance</th>
          <th>history_count</th>
          <th>last_adjustment_reason</th>
        </tr>
      </thead>
      <tbody id="credits-table-body">
        <tr><td colspan="5" class="empty-cell">Loading customer credits table...</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Table 3: Escalation Tickets -->
  <div class="table-section">
    <div class="table-title">Table: escalation_tickets</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>id</th>
          <th>order_id</th>
          <th>type</th>
          <th>status</th>
          <th>reason</th>
          <th>created_at</th>
        </tr>
      </thead>
      <tbody id="tickets-table-body">
        <tr><td colspan="6" class="empty-cell">No escalation tickets in database.</td></tr>
      </tbody>
    </table>
  </div>

  <script>
    async function loadTableData() {
      try {
        const res = await fetch('/api/dashboard-data');
        const data = await res.json();

        // Render Orders Table Rows
        let ordersRows = '';
        for (let i = 0; i < data.orders.length; i++) {
          const o = data.orders[i];
          const badgeClass = o.status === 'FULFILLMENT_FAILED' ? 'badge-failed'
            : o.status === 'READY_FOR_SHIPMENT' ? 'badge-ready' : 'badge-pending';

          ordersRows += '<tr>' +
            '<td><code>' + o.id + '</code></td>' +
            '<td>' + o.customerName + '</td>' +
            '<td>' + o.customerEmail + '</td>' +
            '<td>' + o.assignedWarehouseId + '</td>' +
            '<td><span class="badge ' + badgeClass + '">' + o.status + '</span></td>' +
            '<td>' + (o.failureReason || '-') + '</td>' +
          '</tr>';
        }
        document.getElementById('orders-table-body').innerHTML = ordersRows || '<tr><td colspan="6" class="empty-cell">No rows found in orders table.</td></tr>';

        // Render Customer Credits Table Rows
        if (!data.credits || data.credits.length === 0) {
          document.getElementById('credits-table-body').innerHTML = '<tr><td colspan="5" class="empty-cell">No customer credits recorded.</td></tr>';
        } else {
          let creditsRows = '';
          for (let k = 0; k < data.credits.length; k++) {
            const c = data.credits[k];
            const lastReason = c.history && c.history.length > 0 ? c.history[c.history.length - 1].reason : 'None';
            creditsRows += '<tr>' +
              '<td><code>' + c.customerId + '</code></td>' +
              '<td>' + c.customerName + '</td>' +
              '<td><strong>$' + Number(c.balance).toFixed(2) + '</strong></td>' +
              '<td>' + (c.history ? c.history.length : 0) + ' record(s)</td>' +
              '<td>' + lastReason + '</td>' +
            '</tr>';
          }
          document.getElementById('credits-table-body').innerHTML = creditsRows;
        }

        // Render Tickets Table Rows
        if (!data.tickets || data.tickets.length === 0) {
          document.getElementById('tickets-table-body').innerHTML = '<tr><td colspan="6" class="empty-cell">No rows found in escalation_tickets table.</td></tr>';
        } else {
          let ticketsRows = '';
          for (let j = 0; j < data.tickets.length; j++) {
            const t = data.tickets[j];
            ticketsRows += '<tr>' +
              '<td><code>' + t.id + '</code></td>' +
              '<td><code>' + t.orderId + '</code></td>' +
              '<td>' + t.type + '</td>' +
              '<td><span class="badge badge-pending">' + t.status + '</span></td>' +
              '<td>' + t.reason + '</td>' +
              '<td>' + new Date(t.createdAt).toLocaleTimeString() + '</td>' +
            '</tr>';
          }
          document.getElementById('tickets-table-body').innerHTML = ticketsRows;
        }
      } catch (err) {
        console.error('Error loading database tables:', err);
      }
    }

    async function resetTableData() {
      try {
        await fetch('/reset');
        await loadTableData();
        alert('Database tables reset to default state.');
      } catch (err) {
        alert('Failed to reset database tables');
      }
    }

    loadTableData();
    setInterval(loadTableData, 3000);
  </script>
</body>
</html>`;
}
