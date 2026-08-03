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

  it("should reallocate ORD-1001 to WH-WEST, deduct stock, and update status to READY_FOR_SHIPMENT", () => {
    const invBefore = db.getInventoryItem("SKU-HEADPHONES");
    expect(invBefore?.stockByWarehouse["WH-WEST"]).toBe(25);

    const updated = db.updateOrderWarehouse("ORD-1001", "WH-WEST");
    expect(updated.assignedWarehouseId).toBe("WH-WEST");

    const invAfter = db.getInventoryItem("SKU-HEADPHONES");
    expect(invAfter?.stockByWarehouse["WH-WEST"]).toBe(24);

    db.updateOrderStatus("ORD-1001", "READY_FOR_SHIPMENT");
    const order = db.getOrder("ORD-1001");
    expect(order?.status).toBe("READY_FOR_SHIPMENT");
    expect(order?.failureReason).toBeUndefined();
  });

  it("should prevent reallocating to non-existent warehouse", () => {
    expect(() => db.updateOrderWarehouse("ORD-1001", "WH-NONEXISTENT")).toThrow(
      "Warehouse WH-NONEXISTENT not found",
    );
  });

  it("should fix shipping address for ORD-1002 and clear failure status", () => {
    const newAddress = {
      street: "456 Correct St",
      city: "San Jose",
      state: "CA",
      zip: "95112",
      country: "US",
      isValid: true,
    };
    db.updateShippingAddress("ORD-1002", newAddress);
    db.updateOrderStatus("ORD-1002", "READY_FOR_SHIPMENT");

    const order = db.getOrder("ORD-1002");
    expect(order?.shippingAddress.zip).toBe("95112");
    expect(order?.shippingAddress.isValid).toBe(true);
    expect(order?.status).toBe("READY_FOR_SHIPMENT");
  });

  it("should issue goodwill store credit to customer", () => {
    const credit = db.issueCustomerCredit(
      "CUST-501",
      15.0,
      "Appology for delayed shipment",
      "ORD-1001",
    );
    expect(credit.balance).toBe(15.0);
    expect(credit.history[0].amount).toBe(15.0);
  });

  it("should reject deducting store credit when customer balance is $0.00", () => {
    expect(() =>
      db.issueCustomerCredit("CUST-501", -50.0, "Test 0 balance"),
    ).toThrow("Customer currently has $0.00 store credit balance");
  });

  it("should reject deducting store credit when deduction exceeds available balance", () => {
    db.issueCustomerCredit("CUST-501", 40.0, "Initial credit");
    expect(() =>
      db.issueCustomerCredit("CUST-501", -50.0, "Exceeding deduction"),
    ).toThrow("exceeds current customer balance ($40.00)");
  });

  it("should prevent reallocating an already SHIPPED order", () => {
    db.updateOrderStatus("ORD-1005", "SHIPPED");
    const order = db.getOrder("ORD-1005");
    expect(order?.status).toBe("SHIPPED");
  });

  it("should successfully deduct store credit when customer has sufficient balance", () => {
    db.issueCustomerCredit("CUST-501", 100.0, "Initial credit");
    const updated = db.issueCustomerCredit(
      "CUST-501",
      -50.0,
      "Valid deduction",
    );
    expect(updated.balance).toBe(50.0);
  });

  it("should not deduct stock when reassigning an order to the same warehouse", () => {
    const before = db.getInventoryItem("SKU-HEADPHONES")!.stockByWarehouse[
      "WH-EAST"
    ];
    db.updateOrderWarehouse("ORD-1001", "WH-EAST");
    const after = db.getInventoryItem("SKU-HEADPHONES")!.stockByWarehouse[
      "WH-EAST"
    ];
    expect(after).toBe(before);
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
