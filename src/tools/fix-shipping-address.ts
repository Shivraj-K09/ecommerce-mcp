import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";

export function registerFixShippingAddressTool(server: McpServer) {
  server.registerTool(
    "fix_shipping_address",
    {
      description:
        "Fixes invalid shipping address details (e.g. incorrect ZIP code) for a stuck order and resets it to READY_FOR_SHIPMENT.",
      inputSchema: z.object({
        orderId: z.string().describe("Order ID to update"),
        street: z.string().optional().describe("Correct street address"),
        city: z.string().optional().describe("Correct city"),
        state: z.string().optional().describe("Correct two-letter state code"),
        zip: z.string().describe("Valid ZIP code"),
        country: z.string().optional().describe("Country code (default: US)"),
      }),
    },
    async ({ orderId, street, city, state, zip, country }) => {
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
              text: `Cannot update shipping address: Order '${orderId}' has status '${order.status}' and is already in-transit/finalized.`,
            },
          ],
        };
      }
      const updatedAddress = {
        street: street || order.shippingAddress.street,
        city: city || order.shippingAddress.city,
        state: state || order.shippingAddress.state,
        zip: zip,
        country: country || order.shippingAddress.country,
        isValid: true,
      };

      db.updateShippingAddress(orderId, updatedAddress);
      db.updateOrderStatus(orderId, "READY_FOR_SHIPMENT");

      return {
        content: [
          {
            type: "text",
            text:
              `SUCCESS: Shipping address for Order ${orderId} has been updated and validated.\n` +
              `New Address: ${updatedAddress.street}, ${updatedAddress.city}, ${updatedAddress.state} ${updatedAddress.zip}, ${updatedAddress.country}\n` +
              `Status updated to: READY_FOR_SHIPMENT. Fulfillment pipeline re-triggered!`,
          },
        ],
      };
    },
  );
}
