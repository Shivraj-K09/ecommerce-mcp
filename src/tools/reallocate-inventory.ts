import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";

export function registerReallocateInventoryTool(server: McpServer) {
  server.registerTool(
    "reallocate_inventory",
    {
      description:
        "Submits a human-review escalation ticket to reassign a stuck order to an alternate warehouse with stock (does NOT auto-reallocate).",
      inputSchema: z.object({
        orderId: z.string().describe("Order ID requiring reallocation"),
        targetWarehouseId: z
          .string()
          .describe("Target warehouse ID with available stock (e.g. WH-WEST)"),
      }),
    },
    async ({ orderId, targetWarehouseId }) => {
      const order = db.getOrder(orderId);
      if (!order) {
        return {
          content: [
            { type: "text", text: `Error: Order '${orderId}' not found.` },
          ],
        };
      }

      if (order.status === "SHIPPED" || order.status === "CANCELLED") {
        return {
          content: [
            {
              type: "text",
              text: `Cannot escalate: Order '${orderId}' has status '${order.status}' and is already finalized/in-transit.`,
            },
          ],
        };
      }

      const targetWh = db.getWarehouse(targetWarehouseId);
      if (!targetWh) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Warehouse '${targetWarehouseId}' not found. Available: WH-EAST, WH-WEST, WH-CENTRAL`,
            },
          ],
        };
      }

      for (const item of order.items) {
        const inv = db.getInventoryItem(item.sku);
        const available = inv?.stockByWarehouse[targetWarehouseId] ?? 0;
        if (available < item.quantity) {
          return {
            content: [
              {
                type: "text",
                text: `Cannot request reallocation to ${targetWh.name} (${targetWarehouseId}): Insufficient stock for ${item.sku} (Required: ${item.quantity}, Available: ${available}).`,
              },
            ],
          };
        }
      }

      const evidence = {
        currentWarehouseId: order.assignedWarehouseId,
        proposedWarehouseId: targetWarehouseId,
        proposedWarehouseName: targetWh.name,
        items: order.items,
      };

      const ticket = db.createEscalationTicket(
        orderId,
        "WAREHOUSE_REROUTE",
        `Request to reassign Order ${orderId} from ${order.assignedWarehouseId} to ${targetWh.name} (${targetWarehouseId})`,
        evidence,
      );

      return {
        content: [
          {
            type: "text",
            text:
              `SUCCESS: Created Human-Review Escalation Ticket '${ticket.id}' for Order ${orderId}.\n` +
              `Type: WAREHOUSE_REROUTE\n` +
              `Proposed Warehouse: ${targetWh.name} (${targetWarehouseId})\n` +
              `Status: PENDING_HUMAN_REVIEW\n` +
              `Operational change submitted for manager review (per safety guidelines).`,
          },
        ],
      };
    },
  );
}
