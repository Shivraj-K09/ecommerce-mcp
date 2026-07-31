import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";

export function registerIssueCustomerCreditTool(server: McpServer) {
  server.registerTool(
    "issue_customer_credit",
    {
      description:
        "Applies a store credit adjustment for the customer linked to an order. Requires an order ID (e.g. ORD-1001), not a customer ID. Accepts positive values to grant credit or negative values to deduct credit.",
      inputSchema: z.object({
        orderId: z
          .string()
          .describe(
            "Order ID linked to the customer (e.g. ORD-1001). Do not pass a customer ID such as CUST-501.",
          ),
        amount: z
          .number()
          .describe(
            "Store credit adjustment amount in USD (positive to add credit, negative to deduct credit).",
          ),
        reason: z.string().describe("Reason for store credit adjustment"),
      }),
    },
    async ({ orderId, amount, reason }) => {
      const order = db.getOrder(orderId);
      if (!order) {
        const customerIdHint = orderId.startsWith("CUST-")
          ? " This looks like a customer ID — use an order ID such as ORD-1001 instead."
          : "";
        return {
          content: [
            {
              type: "text",
              text: `Error: Order '${orderId}' not found.${customerIdHint}`,
            },
          ],
        };
      }

      try {
        const credit = db.issueCustomerCredit(
          order.customerId,
          amount,
          reason,
          orderId,
        );
        db.addLog(
          orderId,
          "INFO",
          `Adjusted store credit by $${amount.toFixed(2)} for customer ${order.customerName} (${order.customerId}). Reason: ${reason}`,
        );

        const actionText = amount >= 0 ? "Issued" : "Deducted";
        return {
          content: [
            {
              type: "text",
              text:
                `SUCCESS: ${actionText} $${Math.abs(amount).toFixed(2)} store credit for customer ${order.customerName} (${order.customerEmail}).\n` +
                `New Balance: $${credit.balance.toFixed(2)}\n` +
                `Action logged in order ${orderId} audit history.`,
            },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text: `Error adjusting store credit for ${order.customerName}: ${msg}`,
            },
          ],
        };
      }
    },
  );
}
