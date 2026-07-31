import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db";

describe("Synthetic Commerce Database (src/db.ts)", () => {
  beforeEach(() => {
    db.reset();
  });

  it("should list initial warehouses", () => {
    const warehouses = db.getWarehouses();
    expect(warehouses.length).toBeGreaterThanOrEqual(3);
    expect(warehouses.map((w) => w.id)).toContain("WH-EAST");
    expect(warehouses.map((w) => w.id)).toContain("WH-WEST");
    expect(warehouses.map((w) => w.id)).toContain("WH-CENTRAL");
  });

  it("should retrieve initial synthetic orders with distinct failure causes", () => {
    const failedOrders = db.getOrders("FULFILLMENT_FAILED");
    expect(failedOrders.length).toBeGreaterThanOrEqual(3);

    const ord1001 = db.getOrder("ORD-1001");
    expect(ord1001).toBeDefined();
    expect(ord1001?.failureReason).toContain(
      "OUT_OF_STOCK_AT_ASSIGNED_WAREHOUSE",
    );

    const ord1002 = db.getOrder("ORD-1002");
    expect(ord1002).toBeDefined();
    expect(ord1002?.shippingAddress.isValid).toBe(false);
  });

  it("should update order warehouse assignment, deduct stock, and add log entry", () => {
    const invBefore = db.getInventoryItem("SKU-HEADPHONES");
    expect(invBefore?.stockByWarehouse["WH-WEST"]).toBe(25);

    const updated = db.updateOrderWarehouse("ORD-1001", "WH-WEST");
    expect(updated.assignedWarehouseId).toBe("WH-WEST");

    const invAfter = db.getInventoryItem("SKU-HEADPHONES");
    expect(invAfter?.stockByWarehouse["WH-WEST"]).toBe(24); // 25 - 1 quantity

    const logs = db.getLogsForOrder("ORD-1001");
    const lastLog = logs[logs.length - 1];
    expect(lastLog.message).toContain("Order reassigned to warehouse");
  });

  it("should update shipping address and log action", () => {
    const newAddress = {
      street: "456 Correct St",
      city: "San Jose",
      state: "CA",
      zip: "95112",
      country: "US",
      isValid: true,
    };
    const updated = db.updateShippingAddress("ORD-1002", newAddress);
    expect(updated.shippingAddress.zip).toBe("95112");
    expect(updated.shippingAddress.isValid).toBe(true);
  });

  it("should issue store credit to customer and track history", () => {
    const credit = db.issueCustomerCredit(
      "CUST-501",
      25.0,
      "Appology for delayed shipment",
      "ORD-1001",
    );
    expect(credit.balance).toBe(25.0);
    expect(credit.history).toHaveLength(1);
    expect(credit.history[0].amount).toBe(25.0);
  });
});
