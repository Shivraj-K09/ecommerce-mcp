/**
 * PostgreSQL Schema & Entity Definitions for E-Commerce Operations MCP Server.
 *
 * Entities & Relationships:
 * - Warehouses (1) <---> (N) Orders (assignedWarehouseId)
 * - Orders (1) <---> (N) FulfillmentLogs (orderId)
 * - Orders (1) <---> (N) EscalationTickets (orderId)
 * - Customers (1) <---> (1) CustomerCredit (customerId)
 *
 * Invariants & Statuses:
 * - Order Statuses: FULFILLMENT_FAILED, READY_FOR_SHIPMENT, SHIPPED, CANCELLED
 * - Locked Statuses: SHIPPED, CANCELLED (strictly immutable)
 * - Escalation Statuses: PENDING_HUMAN_REVIEW, RESOLVED, REJECTED
 */

export const CREATE_TABLES_SQL = `
-- Warehouses Table
CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  sku VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stock_by_warehouse JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) PRIMARY KEY,
  customer_id VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  assigned_warehouse_id VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  failure_reason TEXT,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  created_at VARCHAR(100) NOT NULL
);

-- Fulfillment Audit Logs Table
CREATE TABLE IF NOT EXISTS fulfillment_logs (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL,
  timestamp VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL
);

-- Customer Credits Table
CREATE TABLE IF NOT EXISTS customer_credits (
  customer_id VARCHAR(100) PRIMARY KEY,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  history JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Human-Review Escalation Tickets Table
CREATE TABLE IF NOT EXISTS escalation_tickets (
  id VARCHAR(100) PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_HUMAN_REVIEW',
  evidence JSONB NOT NULL,
  created_at VARCHAR(100) NOT NULL
);
`;

export interface EscalationTicket {
  id: string;
  orderId: string;
  type: "WAREHOUSE_REROUTE" | "ADDRESS_CORRECTION" | "STORE_CREDIT_APPROVAL";
  reason: string;
  status: "PENDING_HUMAN_REVIEW" | "RESOLVED" | "REJECTED";
  evidence: Record<string, unknown>;
  createdAt: string;
}
