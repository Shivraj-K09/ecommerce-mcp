import { Pool } from "pg";
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

import { CREATE_TABLES_SQL, EscalationTicket } from "./db/schema";

export type {
  OrderStatus,
  Warehouse,
  InventoryItem,
  Order,
  FulfillmentLog,
  CustomerCredit,
  CreditRecord,
  ShippingAddress,
  EscalationTicket,
};

class CommerceDatabase {
  private pgPool: Pool | null = null;
  private isInitialized = false;

  private warehouses: Map<string, Warehouse> = new Map();
  private inventory: Map<string, InventoryItem> = new Map();
  private orders: Map<string, Order> = new Map();
  private fulfillmentLogs: FulfillmentLog[] = [];
  private customerCredits: Map<string, CustomerCredit> = new Map();
  private escalationTickets: Map<string, EscalationTicket> = new Map();

  constructor() {
    this.resetInMemory();
  }

  public async initDb(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !this.pgPool) {
      try {
        this.pgPool = new Pool({
          connectionString: dbUrl,
          ssl: dbUrl.includes("render.com") || dbUrl.includes("supabase")
            ? { rejectUnauthorized: false }
            : false,
        });

        await this.pgPool.query(CREATE_TABLES_SQL);
        await this.seedPostgresIfEmpty();
        await this.loadFromPostgres();

        this.isInitialized = true;
        console.error("PostgreSQL database successfully initialized & synced");
      } catch (err) {
        console.error("PostgreSQL connection error, falling back to in-memory store:", err);
        this.pgPool = null;
      }
    }
  }

  private async loadFromPostgres(): Promise<void> {
    if (!this.pgPool) return;

    try {
      const whRes = await this.pgPool.query("SELECT * FROM warehouses");
      if (whRes.rows.length > 0) {
        this.warehouses.clear();
        for (const row of whRes.rows) {
          this.warehouses.set(row.id, {
            id: row.id,
            name: row.name,
            code: row.code || row.id,
            location: row.location,
            isActive: true,
          });
        }
      }

      const invRes = await this.pgPool.query("SELECT * FROM inventory");
      if (invRes.rows.length > 0) {
        this.inventory.clear();
        for (const row of invRes.rows) {
          this.inventory.set(row.sku, {
            sku: row.sku,
            name: row.name,
            category: row.category || "General",
            price: parseFloat(row.price || "0"),
            stockByWarehouse:
              typeof row.stock_by_warehouse === "string"
                ? JSON.parse(row.stock_by_warehouse)
                : row.stock_by_warehouse,
          });
        }
      }

      const ordRes = await this.pgPool.query("SELECT * FROM orders");
      if (ordRes.rows.length > 0) {
        this.orders.clear();
        for (const row of ordRes.rows) {
          this.orders.set(row.id, {
            id: row.id,
            customerId: row.customer_id,
            customerName: row.customer_name,
            customerEmail: row.customer_email,
            assignedWarehouseId: row.assigned_warehouse_id,
            status: row.status,
            failureReason: row.failure_reason || undefined,
            shippingAddress:
              typeof row.shipping_address === "string"
                ? JSON.parse(row.shipping_address)
                : row.shipping_address,
            items:
              typeof row.items === "string"
                ? JSON.parse(row.items)
                : row.items,
            totalAmount: parseFloat(row.total_amount || "0"),
            createdAt: row.created_at,
            updatedAt: row.updated_at || row.created_at,
          });
        }
      }

      const logRes = await this.pgPool.query(
        "SELECT * FROM fulfillment_logs ORDER BY id ASC",
      );
      if (logRes.rows.length > 0) {
        this.fulfillmentLogs = logRes.rows.map((row) => ({
          id: String(row.id),
          orderId: row.order_id,
          timestamp: row.timestamp,
          level: row.level,
          message: row.message,
        }));
      }

      const credRes = await this.pgPool.query(
        "SELECT * FROM customer_credits",
      );
      if (credRes.rows.length > 0) {
        this.customerCredits.clear();
        for (const row of credRes.rows) {
          this.customerCredits.set(row.customer_id, {
            customerId: row.customer_id,
            customerName: "Valued Customer",
            balance: parseFloat(row.balance),
            history:
              typeof row.history === "string"
                ? JSON.parse(row.history)
                : row.history,
          });
        }
      }

      const ticketRes = await this.pgPool.query(
        "SELECT * FROM escalation_tickets",
      );
      if (ticketRes.rows.length > 0) {
        this.escalationTickets.clear();
        for (const row of ticketRes.rows) {
          this.escalationTickets.set(row.id, {
            id: row.id,
            orderId: row.order_id,
            type: row.type,
            reason: row.reason,
            status: row.status,
            evidence:
              typeof row.evidence === "string"
                ? JSON.parse(row.evidence)
                : row.evidence,
            createdAt: row.created_at,
          });
        }
      }
    } catch (err) {
      console.error("Error loading tables from PostgreSQL:", err);
    }
  }

  private async seedPostgresIfEmpty(): Promise<void> {
    if (!this.pgPool) return;

    const whRes = await this.pgPool.query("SELECT COUNT(*) FROM warehouses");
    if (parseInt(whRes.rows[0].count, 10) === 0) {
      for (const wh of INITIAL_WAREHOUSES) {
        await this.pgPool.query(
          "INSERT INTO warehouses (id, name, location) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
          [wh.id, wh.name, wh.location],
        );
      }
      for (const inv of INITIAL_INVENTORY) {
        await this.pgPool.query(
          "INSERT INTO inventory (sku, name, stock_by_warehouse) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
          [inv.sku, inv.name, JSON.stringify(inv.stockByWarehouse)],
        );
      }
      for (const ord of INITIAL_ORDERS) {
        await this.pgPool.query(
          "INSERT INTO orders (id, customer_id, customer_name, customer_email, assigned_warehouse_id, status, failure_reason, shipping_address, items, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING",
          [
            ord.id,
            ord.customerId,
            ord.customerName,
            ord.customerEmail,
            ord.assignedWarehouseId,
            ord.status,
            ord.failureReason || null,
            JSON.stringify(ord.shippingAddress),
            JSON.stringify(ord.items),
            ord.createdAt,
          ],
        );
      }
      for (const log of INITIAL_LOGS) {
        await this.pgPool.query(
          "INSERT INTO fulfillment_logs (order_id, timestamp, level, message) VALUES ($1, $2, $3, $4)",
          [log.orderId, log.timestamp, log.level, log.message],
        );
      }
      for (const cred of INITIAL_CUSTOMER_CREDITS) {
        await this.pgPool.query(
          "INSERT INTO customer_credits (customer_id, balance, history) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
          [cred.customerId, cred.balance, JSON.stringify(cred.history)],
        );
      }
    }
  }

  public async resetPostgres(): Promise<void> {
    this.resetInMemory();
    if (this.pgPool) {
      await this.pgPool.query(
        "TRUNCATE warehouses, inventory, orders, fulfillment_logs, customer_credits, escalation_tickets RESTART IDENTITY CASCADE",
      );
      await this.seedPostgresIfEmpty();
    }
  }

  public reset() {
    this.resetInMemory();
  }

  public resetInMemory() {
    this.warehouses.clear();
    this.inventory.clear();
    this.orders.clear();
    this.fulfillmentLogs = [];
    this.customerCredits.clear();
    this.escalationTickets.clear();

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

  public getAllCustomerCredits(): CustomerCredit[] {
    return Array.from(this.customerCredits.values());
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
        if (this.pgPool) {
          this.pgPool
            .query(
              "UPDATE inventory SET stock_by_warehouse = $1 WHERE sku = $2",
              [JSON.stringify(inv.stockByWarehouse), item.sku],
            )
            .catch((err) =>
              console.error(
                "Error updating inventory stock in Postgres:",
                err,
              ),
            );
        }
      }
    }

    order.assignedWarehouseId = targetWarehouseId;
    order.updatedAt = new Date().toISOString();

    if (this.pgPool) {
      this.pgPool
        .query(
          "UPDATE orders SET assigned_warehouse_id = $1, status = $2, failure_reason = $3 WHERE id = $4",
          [
            order.assignedWarehouseId,
            order.status,
            order.failureReason || null,
            order.id,
          ],
        )
        .catch((err) =>
          console.error("Error updating order warehouse in Postgres:", err),
        );
    }

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

    if (this.pgPool) {
      this.pgPool
        .query(
          "UPDATE orders SET status = $1, failure_reason = $2 WHERE id = $3",
          [order.status, order.failureReason || null, order.id],
        )
        .catch((err) =>
          console.error("Error updating order status in Postgres:", err),
        );
    }

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

    if (this.pgPool) {
      this.pgPool
        .query(
          "UPDATE orders SET shipping_address = $1, status = $2, failure_reason = $3 WHERE id = $4",
          [
            JSON.stringify(order.shippingAddress),
            order.status,
            order.failureReason || null,
            order.id,
          ],
        )
        .catch((err) =>
          console.error("Error updating shipping address in Postgres:", err),
        );
    }

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
    if (this.pgPool) {
      this.pgPool
        .query(
          "INSERT INTO fulfillment_logs (order_id, timestamp, level, message) VALUES ($1, $2, $3, $4)",
          [log.orderId, log.timestamp, log.level, log.message],
        )
        .catch((err) => console.error("Error saving log to Postgres:", err));
    }
    return log;
  }

  public getCustomerCredit(customerId: string): CustomerCredit | undefined {
    return this.customerCredits.get(customerId);
  }

  public hasPriorCreditForOrder(orderId: string): boolean {
    for (const cred of this.customerCredits.values()) {
      if (cred.history.some((rec) => rec.orderId === orderId && rec.amount > 0)) {
        return true;
      }
    }
    return false;
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
    if (this.pgPool) {
      this.pgPool
        .query(
          "INSERT INTO customer_credits (customer_id, balance, history) VALUES ($1, $2, $3) ON CONFLICT (customer_id) DO UPDATE SET balance = $2, history = $3",
          [credit.customerId, credit.balance, JSON.stringify(credit.history)],
        )
        .catch((err) =>
          console.error("Error saving customer credit to Postgres:", err),
        );
    }
    return credit;
  }

  public createEscalationTicket(
    orderId: string,
    type: "WAREHOUSE_REROUTE" | "ADDRESS_CORRECTION" | "STORE_CREDIT_APPROVAL",
    reason: string,
    evidence: Record<string, unknown>,
  ): EscalationTicket {
    const ticket: EscalationTicket = {
      id: `TICKET-${Date.now()}`,
      orderId,
      type,
      reason,
      status: "PENDING_HUMAN_REVIEW",
      evidence,
      createdAt: new Date().toISOString(),
    };
    this.escalationTickets.set(ticket.id, ticket);
    if (this.pgPool) {
      this.pgPool
        .query(
          "INSERT INTO escalation_tickets (id, order_id, type, reason, status, evidence, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            ticket.id,
            ticket.orderId,
            ticket.type,
            ticket.reason,
            ticket.status,
            JSON.stringify(ticket.evidence),
            ticket.createdAt,
          ],
        )
        .catch((err) =>
          console.error("Error saving escalation ticket to Postgres:", err),
        );
    }

    this.addLog(
      orderId,
      "WARN",
      `Created human-review escalation ticket ${ticket.id} (${type}): ${reason}`,
    );
    return ticket;
  }

  public getEscalationTickets(orderId?: string): EscalationTicket[] {
    const list = Array.from(this.escalationTickets.values());
    if (orderId) {
      return list.filter((t) => t.orderId === orderId);
    }
    return list;
  }
}

export const db = new CommerceDatabase();
