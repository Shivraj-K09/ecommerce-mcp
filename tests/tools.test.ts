import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db";
import { McpServer } from "@modelcontextprotocol/server";
import { registerCommerceTools } from "../src/tools";
import { buildRecommendedAction } from "../src/tools/investigate-order-issue";
import {
  formatStuckOrdersList,
  formatDiagnosticReport,
} from "../src/formatters";

describe("ecommerce-mcp Tools (src/tools.ts)", () => {
  let server: McpServer;

  beforeEach(() => {
    db.reset();
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
    registerCommerceTools(server);
  });

  it("should list stuck orders and format list output correctly", () => {
    const orders = db.getOrders("FULFILLMENT_FAILED");
    expect(orders.length).toBeGreaterThanOrEqual(3);
    expect(orders.map((o) => o.id)).toContain("ORD-1001");
    expect(orders.map((o) => o.id)).toContain("ORD-1002");

    const formattedText = formatStuckOrdersList(orders);
    expect(formattedText).toContain("ORD-1001");
    expect(formattedText).toContain("ORD-1002");
    expect(formattedText).toContain("FULFILLMENT_FAILED");
  });

  it("should investigate ORD-1001 and format diagnostic report", () => {
    const order = db.getOrder("ORD-1001");
    expect(order).toBeDefined();

    const assignedWh = db.getWarehouse(order!.assignedWarehouseId);
    const allWarehouses = db.getWarehouses();
    const logs = db.getLogsForOrder("ORD-1001");

    const report = formatDiagnosticReport(
      order!,
      assignedWh,
      allWarehouses,
      logs,
      ["SKU-HEADPHONES: WH-EAST (0 units), WH-WEST (25 units)"],
      "Reallocate order ORD-1001 to WH-WEST",
    );

    expect(report).toContain("DIAGNOSTIC REPORT FOR ORDER: ORD-1001");
    expect(report).toContain("RECOMMENDED OPERATIONAL ACTION");
    expect(report).toContain("Reallocate order ORD-1001 to WH-WEST");
  });

  it("should investigate ORD-1002 and detect invalid shipping address zip", () => {
    const order = db.getOrder("ORD-1002");
    expect(order).toBeDefined();
    expect(order?.shippingAddress.isValid).toBe(false);
    expect(order?.shippingAddress.zip).toBe("INVALID_ZIP");
  });

  it("should create a Human-Review Escalation Ticket for warehouse rerouting", () => {
    const ticket = db.createEscalationTicket(
      "ORD-1001",
      "WAREHOUSE_REROUTE",
      "Request to reassign to WH-WEST",
      { proposedWarehouseId: "WH-WEST" },
    );
    expect(ticket.id).toContain("TICKET-");
    expect(ticket.status).toBe("PENDING_HUMAN_REVIEW");
    expect(ticket.type).toBe("WAREHOUSE_REROUTE");
  });

  it("should create a Human-Review Escalation Ticket for address correction", () => {
    const ticket = db.createEscalationTicket(
      "ORD-1002",
      "ADDRESS_CORRECTION",
      "Request to update zip to 95112",
      { zip: "95112" },
    );
    expect(ticket.id).toContain("TICKET-");
    expect(ticket.status).toBe("PENDING_HUMAN_REVIEW");
    expect(ticket.type).toBe("ADDRESS_CORRECTION");
  });

  it("should issue goodwill store credit up to $25.00 max", () => {
    const credit = db.issueCustomerCredit(
      "CUST-501",
      25.0,
      "Apology for delayed shipment",
      "ORD-1001",
    );
    expect(credit.balance).toBe(25.0);
    expect(credit.history[0].amount).toBe(25.0);
  });

  it("should detect prior store credit granted for an order ID", () => {
    db.issueCustomerCredit(
      "CUST-501",
      15.0,
      "Apology for delay",
      "ORD-1001",
    );
    const hasCredit = db.hasPriorCreditForOrder("ORD-1001");
    expect(hasCredit).toBe(true);
  });

  it("should reject deducting store credit when customer balance is $0.00", () => {
    expect(() =>
      db.issueCustomerCredit("CUST-501", -50.0, "Test 0 balance"),
    ).toThrow("Customer currently has $0.00 store credit balance");
  });

  it("should reject deducting store credit when deduction exceeds available balance", () => {
    db.issueCustomerCredit("CUST-501", 20.0, "Initial credit");
    expect(() =>
      db.issueCustomerCredit("CUST-501", -50.0, "Exceeding deduction"),
    ).toThrow("exceeds current customer balance ($20.00)");
  });

  it("should prevent reallocating an already SHIPPED order", () => {
    db.updateOrderStatus("ORD-1005", "SHIPPED");
    const order = db.getOrder("ORD-1005");
    expect(order?.status).toBe("SHIPPED");
  });

  it("should successfully deduct store credit when customer has sufficient balance", () => {
    db.issueCustomerCredit("CUST-501", 25.0, "Initial credit");
    const updated = db.issueCustomerCredit(
      "CUST-501",
      -10.0,
      "Valid deduction",
    );
    expect(updated.balance).toBe(15.0);
  });

  it("should recommend no action for orders already ready to ship", () => {
    db.updateOrderWarehouse("ORD-1001", "WH-WEST");
    db.updateOrderStatus("ORD-1001", "READY_FOR_SHIPMENT");
    const order = db.getOrder("ORD-1001")!;

    const action = buildRecommendedAction("ORD-1001", order);
    expect(action).toContain("No action required");
  });

  it("should recommend reallocation when assigned warehouse is out of stock", () => {
    const order = db.getOrder("ORD-1001")!;
    const action = buildRecommendedAction("ORD-1001", order);

    expect(action).toContain("Reallocate order ORD-1001");
    expect(action).toContain("WH-WEST");
  });

  it("should not recommend out-of-stock when another warehouse has inventory", () => {
    db.updateOrderWarehouse("ORD-1004", "WH-CENTRAL");
    db.updateOrderStatus("ORD-1004", "READY_FOR_SHIPMENT");
    const order = db.getOrder("ORD-1004")!;

    const action = buildRecommendedAction("ORD-1004", order);
    expect(action).toContain("No action required");
    expect(action).not.toContain("All warehouses are out of stock");
  });
});
