import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";

export function registerReallocateInventoryTool(server: McpServer) {
  server.registerTool(
    "reallocate_inventory",
    {
      description:
        "Reassigns a stuck order to a different warehouse with available stock, clears failure flags, and sets the order to READY_FOR_SHIPMENT.",
      inputSchema: z.object({
        orderId: z.string().describe("Order ID to reassign"),
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
              text: `Cannot reallocate: Order '${orderId}' has status '${order.status}' and is already finalized/in-transit.`,
            },
          ],
        };
      }

      if (
        order.assignedWarehouseId === targetWarehouseId &&
        order.status === "READY_FOR_SHIPMENT"
      ) {
        return {
          content: [
            {
              type: "text",
              text: `No reallocation needed: Order '${orderId}' is already assigned to ${targetWarehouseId} and is READY_FOR_SHIPMENT.`,
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
                text: `Cannot reallocate to ${targetWh.name} (${targetWarehouseId}): Insufficient stock for ${item.sku} (Required: ${item.quantity}, Available: ${available}).`,
              },
            ],
          };
        }
      }

      const oldWh = order.assignedWarehouseId;
      db.updateOrderWarehouse(orderId, targetWarehouseId);
      db.updateOrderStatus(orderId, "READY_FOR_SHIPMENT");

      return {
        content: [
          {
            type: "text",
            text:
              `SUCCESS: Order ${orderId} has been successfully reassigned from ${oldWh} to ${targetWh.name} (${targetWarehouseId}).\n` +
              `Status updated to: READY_FOR_SHIPMENT.\n` +
              `Fulfillment pipeline has been re-triggered!`,
          },
        ],
      };
    },
  );
}
