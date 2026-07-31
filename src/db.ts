import {
  OrderStatus,
  Warehouse,
  InventoryItem,
  Order,
  FulfillmentLog,
  CustomerCredit,
  CreditRecord,
  ShippingAddress,
} from "./types/index";

import {
  INITIAL_WAREHOUSES,
  INITIAL_INVENTORY,
  INITIAL_ORDERS,
  INITIAL_LOGS,
  INITIAL_CUSTOMER_CREDITS,
} from "./data/seeds";

export type {
  OrderStatus,
  Warehouse,
  InventoryItem,
  Order,
  FulfillmentLog,
  CustomerCredit,
  CreditRecord,
  ShippingAddress,
};

class CommerceDatabase {
  private warehouses: Map<string, Warehouse> = new Map();
  private inventory: Map<string, InventoryItem> = new Map();
  private orders: Map<string, Order> = new Map();
  private fulfillmentLogs: FulfillmentLog[] = [];
  private customerCredits: Map<string, CustomerCredit> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.warehouses.clear();
    this.inventory.clear();
    this.orders.clear();
    this.fulfillmentLogs = [];
    this.customerCredits.clear();

    INITIAL_WAREHOUSES.forEach((wh) => this.warehouses.set(wh.id, { ...wh }));
    INITIAL_INVENTORY.forEach((inv) =>
      this.inventory.set(inv.sku, JSON.parse(JSON.stringify(inv))),
    );
    INITIAL_ORDERS.forEach((ord) =>
      this.orders.set(ord.id, JSON.parse(JSON.stringify(ord))),
    );
    this.fulfillmentLogs = JSON.parse(JSON.stringify(INITIAL_LOGS));
    INITIAL_CUSTOMER_CREDITS.forEach((cred) =>
      this.customerCredits.set(
        cred.customerId,
        JSON.parse(JSON.stringify(cred)),
      ),
    );
  }

  private requireOrder(orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    return order;
  }

  public getWarehouses(): Warehouse[] {
    return Array.from(this.warehouses.values());
  }

  public getWarehouse(id: string): Warehouse | undefined {
    return this.warehouses.get(id);
  }

  public getInventoryItem(sku: string): InventoryItem | undefined {
    return this.inventory.get(sku);
  }

  public getAllInventory(): InventoryItem[] {
    return Array.from(this.inventory.values());
  }

  public getOrders(status?: OrderStatus): Order[] {
    const list = Array.from(this.orders.values());
    if (status) {
      return list.filter((ord) => ord.status === status);
    }
    return list;
  }

  public getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  public updateOrderWarehouse(
    orderId: string,
    targetWarehouseId: string,
  ): Order {
    const order = this.requireOrder(orderId);
    const warehouse = this.warehouses.get(targetWarehouseId);
    if (!warehouse) {
      throw new Error(`Warehouse ${targetWarehouseId} not found`);
    }

    if (order.assignedWarehouseId === targetWarehouseId) {
      return order;
    }

    for (const item of order.items) {
      const inv = this.inventory.get(item.sku);
      if (inv && inv.stockByWarehouse[targetWarehouseId] !== undefined) {
        inv.stockByWarehouse[targetWarehouseId] = Math.max(
          0,
          inv.stockByWarehouse[targetWarehouseId] - item.quantity,
        );
      }
    }

    order.assignedWarehouseId = targetWarehouseId;
    order.updatedAt = new Date().toISOString();
    this.addLog(
      orderId,
      "INFO",
      `Order reassigned to warehouse: ${warehouse.name} (${targetWarehouseId}) and stock reserved`,
    );
    return order;
  }

  public updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    failureReason?: string,
  ): Order {
    const order = this.requireOrder(orderId);
    order.status = status;
    if (failureReason !== undefined) {
      order.failureReason = failureReason;
    } else if (status === "READY_FOR_SHIPMENT" || status === "SHIPPED") {
      delete order.failureReason;
    }
    order.updatedAt = new Date().toISOString();
    this.addLog(orderId, "INFO", `Order status updated to ${status}`);
    return order;
  }

  public updateShippingAddress(
    orderId: string,
    address: ShippingAddress,
  ): Order {
    const order = this.requireOrder(orderId);
    order.shippingAddress = { ...address };
    order.updatedAt = new Date().toISOString();
    this.addLog(
      orderId,
      "INFO",
      `Shipping address updated to: ${address.street}, ${address.city}, ${address.state} ${address.zip}`,
    );
    return order;
  }

  public getLogsForOrder(orderId: string): FulfillmentLog[] {
    return this.fulfillmentLogs.filter((log) => log.orderId === orderId);
  }

  public addLog(
    orderId: string,
    level: "INFO" | "WARN" | "ERROR",
    message: string,
  ): FulfillmentLog {
    const log: FulfillmentLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId,
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    this.fulfillmentLogs.push(log);
    return log;
  }

  public getCustomerCredit(customerId: string): CustomerCredit | undefined {
    return this.customerCredits.get(customerId);
  }

  public issueCustomerCredit(
    customerId: string,
    amount: number,
    reason: string,
    orderId?: string,
  ): CustomerCredit {
    let credit = this.customerCredits.get(customerId);
    if (!credit) {
      credit = {
        customerId,
        customerName: "Valued Customer",
        balance: 0,
        history: [],
      };
      this.customerCredits.set(customerId, credit);
    }

    if (amount < 0) {
      const deduction = Math.abs(amount);
      if (credit.balance === 0) {
        throw new Error(
          "Customer currently has $0.00 store credit balance. Cannot apply deduction.",
        );
      }
      if (credit.balance < deduction) {
        throw new Error(
          `Requested deduction ($${deduction.toFixed(2)}) exceeds current customer balance ($${credit.balance.toFixed(2)}). Balance cannot go below $0.00.`,
        );
      }
    }

    credit.balance += amount;
    const record: CreditRecord = {
      id: `CRED-${Date.now()}`,
      date: new Date().toISOString(),
      amount,
      reason,
      orderId,
    };
    credit.history.push(record);
    return credit;
  }
}

export const db = new CommerceDatabase();
