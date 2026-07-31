import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";
import { formatDiagnosticReport } from "../formatters";
import type { Order } from "../types/index";

function warehouseHasStock(
  warehouseId: string,
  order: Order,
): boolean {
  return order.items.every((item) => {
    const inv = db.getInventoryItem(item.sku);
    return inv && (inv.stockByWarehouse[warehouseId] ?? 0) >= item.quantity;
  });
}

export function buildRecommendedAction(orderId: string, order: Order): string {
  if (!order.shippingAddress.isValid) {
    return `Use tool 'fix_shipping_address' to update the ZIP code or address details for order ${orderId}.`;
  }

  if (order.status === "READY_FOR_SHIPMENT" || order.status === "SHIPPED") {
    return "No action required. Order is ready for shipment or already shipped.";
  }

  if (order.status === "CANCELLED") {
    return "No action required. Order is cancelled.";
  }

  const allWarehouses = db.getWarehouses();
  const alternateWarehouse = allWarehouses.find(
    (wh) =>
      wh.id !== order.assignedWarehouseId &&
      warehouseHasStock(wh.id, order),
  );

  if (alternateWarehouse) {
    return `Reallocate order ${orderId} from ${order.assignedWarehouseId} to ${alternateWarehouse.name} (${alternateWarehouse.id}) using tool 'reallocate_inventory'.`;
  }

  if (warehouseHasStock(order.assignedWarehouseId, order)) {
    return `Stock is available at the assigned warehouse (${order.assignedWarehouseId}), but the order is not ready. Review fulfillment logs or retry reallocation after confirming inventory.`;
  }

  return "All warehouses are out of stock. Issue goodwill store credit using tool 'issue_customer_credit' or await restocking.";
}

export function registerInvestigateOrderIssueTool(server: McpServer) {
  server.registerTool(
    "investigate_order_issue",
    {
      description:
        "Deeply investigates a stuck order ID. Checks order state, address validity, item stock across ALL warehouses, and fulfillment error logs to provide root cause analysis and remedies.",
      inputSchema: z.object({
        orderId: z
          .string()
          .describe("The order ID to investigate (e.g. ORD-1001)"),
      }),
    },
    async ({ orderId }) => {
      const order = db.getOrder(orderId);
      if (!order) {
        return {
          content: [
            { type: "text", text: `Error: Order '${orderId}' not found.` },
          ],
        };
      }

      const assignedWh = db.getWarehouse(order.assignedWarehouseId);
      const allWarehouses = db.getWarehouses();
      const logs = db.getLogsForOrder(orderId);

      const stockAnalysis = order.items.map((item) => {
        const inv = db.getInventoryItem(item.sku);
        if (!inv) {
          return `  - SKU '${item.sku}': Unknown product (No inventory record found)`;
        }

        const stockDetails = allWarehouses
          .map((wh) => {
            const count = inv.stockByWarehouse[wh.id] ?? 0;
            const isAssigned = wh.id === order.assignedWarehouseId;
            return `${wh.name} (${wh.id}): ${count} unit(s) ${isAssigned ? "[CURRENTLY ASSIGNED]" : ""}`;
          })
          .join("\n      ");

        return `  - Product: ${inv.name} (${item.sku})\n    Required: ${item.quantity} unit(s)\n    Stock by Warehouse:\n      ${stockDetails}`;
      });

      const recommendedAction = buildRecommendedAction(orderId, order);

      const report = formatDiagnosticReport(
        order,
        assignedWh,
        allWarehouses,
        logs,
        stockAnalysis,
        recommendedAction,
      );

      return { content: [{ type: "text", text: report }] };
    },
  );
}
