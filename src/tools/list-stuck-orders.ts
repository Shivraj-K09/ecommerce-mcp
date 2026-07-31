import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { db } from "../db";
import { formatStuckOrdersList } from "../formatters";

export function registerListStuckOrdersTool(server: McpServer) {
  server.registerTool(
    "list_stuck_orders",
    {
      description:
        "Lists all e-commerce orders currently blocked or in FULFILLMENT_FAILED status along with their failure reasons.",
      inputSchema: z.object({
        limit: z
          .number()
          .optional()
          .describe("Maximum number of stuck orders to return"),
      }),
    },
    async ({ limit }) => {
      const failedOrders = db.getOrders("FULFILLMENT_FAILED");
      const list = limit ? failedOrders.slice(0, limit) : failedOrders;
      return {
        content: [{ type: "text", text: formatStuckOrdersList(list) }],
      };
    },
  );
}
