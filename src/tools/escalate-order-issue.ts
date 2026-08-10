import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";

export function registerEscalateOrderIssueTool(server: McpServer) {
  server.registerTool(
    "escalate_order_issue",
    {
      description:
        "Submits or views human-review escalation tickets for stuck orders requiring manual manager approval.",
      inputSchema: z.object({
        orderId: z
          .string()
          .optional()
          .describe("Optional Order ID to filter escalation tickets"),
      }),
    },
    async ({ orderId }) => {
      const tickets = db.getEscalationTickets(orderId);
      if (tickets.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: orderId
                ? `No escalation tickets found for order '${orderId}'.`
                : "No active human-review escalation tickets found.",
            },
          ],
        };
      }

      const formatted = tickets
        .map(
          (t) =>
            `Ticket ID: ${t.id}\n` +
            `  Order ID: ${t.orderId}\n` +
            `  Type: ${t.type}\n` +
            `  Status: ${t.status}\n` +
            `  Reason: ${t.reason}\n` +
            `  Created At: ${t.createdAt}`,
        )
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${tickets.length} escalation ticket(s):\n\n${formatted}`,
          },
        ],
      };
    },
  );
}
