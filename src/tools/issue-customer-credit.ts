import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";

export function registerIssueCustomerCreditTool(server: McpServer) {
  server.registerTool(
    "issue_customer_credit",
    {
      description:
        "Applies a store credit adjustment for the customer linked to an order. Automatic credits are capped at $25.00 max and require no prior credit for the order; otherwise requires manager approval.",
      inputSchema: z.object({
        orderId: z
          .string()
          .describe(
            "Order ID linked to the customer (e.g. ORD-1001). Do not pass a customer ID such as CUST-501.",
          ),
        amount: z
          .number()
          .describe(
            "Store credit adjustment amount in USD (positive to add credit, negative to deduct credit). Automatic cap is $25.00.",
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

      if (order.status === "SHIPPED" || order.status === "CANCELLED") {
        return {
          content: [
            {
              type: "text",
              text: `Cannot issue credit: Order '${orderId}' has status '${order.status}' and is already finalized/in-transit.`,
            },
          ],
        };
      }

      if (amount > 25.0) {
        const evidence = {
          orderId,
          customerId: order.customerId,
          requestedAmount: amount,
          automaticCap: 25.0,
          reason,
        };

        const ticket = db.createEscalationTicket(
          orderId,
          "STORE_CREDIT_APPROVAL",
          `Requested goodwill credit ($${amount.toFixed(2)}) exceeds automatic limit of $25.00 for customer ${order.customerName}`,
          evidence,
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Requires Manager Approval: Requested store credit ($${amount.toFixed(2)}) exceeds the automatic limit of $25.00.\n` +
                `Created Human-Review Escalation Ticket '${ticket.id}' for manager approval.\n` +
                `Status: PENDING_HUMAN_REVIEW`,
            },
          ],
        };
      }

      if (amount > 0 && db.hasPriorCreditForOrder(orderId)) {
        const evidence = {
          orderId,
          customerId: order.customerId,
          requestedAmount: amount,
          reason,
          duplicateCheckFailed: true,
        };

        const ticket = db.createEscalationTicket(
          orderId,
          "STORE_CREDIT_APPROVAL",
          `Store credit was already issued for Order ${orderId}. Duplicate credit request requires manager review.`,
          evidence,
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Requires Manager Approval: Store credit has already been issued for Order ${orderId}.\n` +
                `Duplicate credit requests require manager review. Created Escalation Ticket '${ticket.id}'.\n` +
                `Status: PENDING_HUMAN_REVIEW`,
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
                `Durable audit record logged for order ${orderId}.`,
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
