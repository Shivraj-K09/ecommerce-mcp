import { McpServer } from "@modelcontextprotocol/server";
import { registerListStuckOrdersTool } from "./list-stuck-orders";
import { registerInvestigateOrderIssueTool } from "./investigate-order-issue";
import { registerReallocateInventoryTool } from "./reallocate-inventory";
import { registerFixShippingAddressTool } from "./fix-shipping-address";
import { registerIssueCustomerCreditTool } from "./issue-customer-credit";

export * from "./list-stuck-orders";
export * from "./investigate-order-issue";
export * from "./reallocate-inventory";
export * from "./fix-shipping-address";
export * from "./issue-customer-credit";


export function registerCommerceTools(server: McpServer) {
  registerListStuckOrdersTool(server);
  registerInvestigateOrderIssueTool(server);
  registerReallocateInventoryTool(server);
  registerFixShippingAddressTool(server);
  registerIssueCustomerCreditTool(server);
}
