import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";

export function registerFixShippingAddressTool(server: McpServer) {
  server.registerTool(
    "fix_shipping_address",
    {
      description:
        "Submits a human-review escalation ticket to correct invalid shipping address details for a stuck order (does NOT auto-update address).",
      inputSchema: z.object({
        orderId: z.string().describe("Order ID requiring address correction"),
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
              text: `Cannot escalate: Order '${orderId}' has status '${order.status}' and is already finalized/in-transit.`,
            },
          ],
        };
      }

      const proposedAddress = {
        street: street || order.shippingAddress.street,
        city: city || order.shippingAddress.city,
        state: state || order.shippingAddress.state,
        zip: zip,
        country: country || order.shippingAddress.country,
        isValid: true,
      };

      const evidence = {
        previousAddress: order.shippingAddress,
        proposedAddress: proposedAddress,
      };

      const ticket = db.createEscalationTicket(
        orderId,
        "ADDRESS_CORRECTION",
        `Request to update shipping address for Order ${orderId} to ZIP ${zip}`,
        evidence,
      );

      return {
        content: [
          {
            type: "text",
            text:
              `SUCCESS: Created Human-Review Escalation Ticket '${ticket.id}' for Order ${orderId}.\n` +
              `Type: ADDRESS_CORRECTION\n` +
              `Proposed Address: ${proposedAddress.street}, ${proposedAddress.city}, ${proposedAddress.state} ${proposedAddress.zip}, ${proposedAddress.country}\n` +
              `Status: PENDING_HUMAN_REVIEW\n` +
              `Address correction submitted for human review (per safety guidelines).`,
          },
        ],
      };
    },
  );
}
