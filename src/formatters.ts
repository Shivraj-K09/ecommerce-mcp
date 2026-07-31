import { Order, Warehouse, FulfillmentLog } from "./types/index";

export function formatStuckOrdersList(orders: Order[]): string {
  if (orders.length === 0) {
    return "No stuck or failed orders found in the queue.";
  }

  const formatted = orders
    .map((ord) => {
      const itemsSummary = ord.items
        .map((i) => `${i.quantity}x ${i.sku}`)
        .join(", ");
      return (
        `Order ID: ${ord.id}\n` +
        `  Customer: ${ord.customerName} (${ord.customerEmail})\n` +
        `  Items: ${itemsSummary}\n` +
        `  Assigned Warehouse: ${ord.assignedWarehouseId}\n` +
        `  Status: ${ord.status}\n` +
        `  Failure Reason: ${ord.failureReason || "Unspecified operational error"}\n` +
        `  Created At: ${ord.createdAt}`
      );
    })
    .join("\n\n---\n\n");

  return `Found ${orders.length} stuck/failed order(s):\n\n${formatted}`;
}

export function formatDiagnosticReport(
  order: Order,
  assignedWh: Warehouse | undefined,
  allWarehouses: Warehouse[],
  logs: FulfillmentLog[],
  stockAnalysis: string[],
  recommendedAction: string,
): string {
  const addr = order.shippingAddress;
  const addressAnalysis = addr.isValid
    ? `  Address is valid: ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}, ${addr.country}`
    : `  ADDRESS INVALID: ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}\n  Validation Error: ${addr.validationError || "Zip code / carrier format error"}`;

  const logsFormatted =
    logs.length > 0
      ? logs
          .map((l) => `  [${l.timestamp}] [${l.level}] ${l.message}`)
          .join("\n")
      : "  No fulfillment logs recorded.";

  return (
    `DIAGNOSTIC REPORT FOR ORDER: ${order.id}\n` +
    `========================================\n` +
    `Customer: ${order.customerName} (${order.customerEmail})\n` +
    `Current Status: ${order.status}\n` +
    `Failure Reason: ${order.failureReason || "None"}\n` +
    `Assigned Warehouse: ${assignedWh ? assignedWh.name : order.assignedWarehouseId}\n\n` +
    `INVENTORY STOCK ANALYSIS:\n${stockAnalysis.join("\n\n")}\n\n` +
    `SHIPPING ADDRESS ANALYSIS:\n${addressAnalysis}\n\n` +
    `FULFILLMENT AUDIT LOGS:\n${logsFormatted}\n\n` +
    `RECOMMENDED OPERATIONAL ACTION:\n  ${recommendedAction}`
  );
}
