export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "FULFILLMENT_FAILED"
  | "READY_FOR_SHIPMENT"
  | "SHIPPED"
  | "CANCELLED";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  isActive: boolean;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  price: number;
  stockByWarehouse: Record<string, number>;
}

export interface OrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isValid: boolean;
  validationError?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  assignedWarehouseId: string;
  shippingAddress: ShippingAddress;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FulfillmentLog {
  id: string;
  orderId: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

export interface CreditRecord {
  id: string;
  date: string;
  amount: number;
  reason: string;
  orderId?: string;
}

export interface CustomerCredit {
  customerId: string;
  customerName: string;
  balance: number;
  history: CreditRecord[];
}
