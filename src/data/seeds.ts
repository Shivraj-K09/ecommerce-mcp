import {
  Warehouse,
  InventoryItem,
  Order,
  FulfillmentLog,
  CustomerCredit,
} from "../types/index";

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: "WH-EAST",
    name: "East Coast Hub",
    code: "NY-01",
    location: "New York, NY",
    isActive: true,
  },
  {
    id: "WH-WEST",
    name: "West Coast Distribution Center",
    code: "LA-02",
    location: "Los Angeles, CA",
    isActive: true,
  },
  {
    id: "WH-CENTRAL",
    name: "Midwest Logistics Center",
    code: "CHI-03",
    location: "Chicago, IL",
    isActive: true,
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    sku: "SKU-HEADPHONES",
    name: "Pro Noise-Canceling Wireless Headphones",
    category: "Electronics",
    price: 199.99,
    stockByWarehouse: {
      "WH-EAST": 0, // Stockout at East Hub
      "WH-WEST": 25,
      "WH-CENTRAL": 10,
    },
  },
  {
    sku: "SKU-SMARTWATCH",
    name: "Apex Fitness Smartwatch V2",
    category: "Wearables",
    price: 149.5,
    stockByWarehouse: {
      "WH-EAST": 5,
      "WH-WEST": 0,
      "WH-CENTRAL": 12,
    },
  },
  {
    sku: "SKU-KEYBOARD",
    name: "RGB Mechanical Gaming Keyboard",
    category: "Accessories",
    price: 89.99,
    stockByWarehouse: {
      "WH-EAST": 2,
      "WH-WEST": 50,
      "WH-CENTRAL": 0,
    },
  },
  {
    sku: "SKU-CHAIR",
    name: "ErgoFlex Mesh Executive Office Chair",
    category: "Furniture",
    price: 299.0,
    stockByWarehouse: {
      "WH-EAST": 0,
      "WH-WEST": 0,
      "WH-CENTRAL": 8,
    },
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "ORD-1001",
    customerId: "CUST-501",
    customerName: "Alice Johnson",
    customerEmail: "alice.j@example.com",
    status: "FULFILLMENT_FAILED",
    items: [{ sku: "SKU-HEADPHONES", quantity: 1, unitPrice: 199.99 }],
    totalAmount: 199.99,
    assignedWarehouseId: "WH-EAST",
    shippingAddress: {
      street: "123 Broadway St, Apt 4B",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      isValid: true,
    },
    failureReason:
      "OUT_OF_STOCK_AT_ASSIGNED_WAREHOUSE: WH-EAST has 0 stock for SKU-HEADPHONES",
    createdAt: "2026-07-28T09:30:00Z",
    updatedAt: "2026-07-28T10:00:00Z",
  },
  {
    id: "ORD-1002",
    customerId: "CUST-502",
    customerName: "Bob Smith",
    customerEmail: "bob.smith@example.com",
    status: "FULFILLMENT_FAILED",
    items: [{ sku: "SKU-SMARTWATCH", quantity: 1, unitPrice: 149.5 }],
    totalAmount: 149.5,
    assignedWarehouseId: "WH-WEST",
    shippingAddress: {
      street: "456 Unknown Trail",
      city: "San Jose",
      state: "CA",
      zip: "INVALID_ZIP",
      country: "US",
      isValid: false,
      validationError:
        "Zip code INVALID_ZIP does not match carrier database for San Jose, CA",
    },
    failureReason: "INVALID_SHIPPING_ADDRESS: Zip code rejected by carrier API",
    createdAt: "2026-07-28T11:15:00Z",
    updatedAt: "2026-07-28T11:20:00Z",
  },
  {
    id: "ORD-1003",
    customerId: "CUST-503",
    customerName: "Charlie Davis",
    customerEmail: "charlie.d@example.com",
    status: "PAID",
    items: [{ sku: "SKU-KEYBOARD", quantity: 2, unitPrice: 89.99 }],
    totalAmount: 179.98,
    assignedWarehouseId: "WH-CENTRAL",
    shippingAddress: {
      street: "789 Michigan Ave",
      city: "Chicago",
      state: "IL",
      zip: "60611",
      country: "US",
      isValid: true,
    },
    createdAt: "2026-07-29T08:00:00Z",
    updatedAt: "2026-07-29T08:00:00Z",
  },
  {
    id: "ORD-1004",
    customerId: "CUST-504",
    customerName: "Diana Prince",
    customerEmail: "diana.p@example.com",
    status: "FULFILLMENT_FAILED",
    items: [{ sku: "SKU-CHAIR", quantity: 1, unitPrice: 299.0 }],
    totalAmount: 299.0,
    assignedWarehouseId: "WH-EAST",
    shippingAddress: {
      street: "100 Constitution Ave",
      city: "Washington",
      state: "DC",
      zip: "20001",
      country: "US",
      isValid: true,
    },
    failureReason:
      "OUT_OF_STOCK_AT_ASSIGNED_WAREHOUSE: WH-EAST has 0 stock for SKU-CHAIR",
    createdAt: "2026-07-27T14:20:00Z",
    updatedAt: "2026-07-27T15:00:00Z",
  },
  {
    id: "ORD-1005",
    customerId: "CUST-505",
    customerName: "Edward Elric",
    customerEmail: "edward.e@example.com",
    status: "SHIPPED",
    items: [{ sku: "SKU-SMARTWATCH", quantity: 1, unitPrice: 149.5 }],
    totalAmount: 149.5,
    assignedWarehouseId: "WH-CENTRAL",
    shippingAddress: {
      street: "500 Main Street",
      city: "Dallas",
      state: "TX",
      zip: "75001",
      country: "US",
      isValid: true,
    },
    createdAt: "2026-07-25T10:00:00Z",
    updatedAt: "2026-07-26T12:00:00Z",
  },
];

export const INITIAL_LOGS: FulfillmentLog[] = [
  {
    id: "LOG-001",
    orderId: "ORD-1001",
    timestamp: "2026-07-28T09:31:00Z",
    level: "INFO",
    message: "Order received and assigned to WH-EAST",
  },
  {
    id: "LOG-002",
    orderId: "ORD-1001",
    timestamp: "2026-07-28T10:00:00Z",
    level: "ERROR",
    message:
      "Fulfillment failed: Insufficient stock for SKU-HEADPHONES at WH-EAST (Requested: 1, Available: 0)",
  },
  {
    id: "LOG-003",
    orderId: "ORD-1002",
    timestamp: "2026-07-28T11:16:00Z",
    level: "INFO",
    message: "Order received and assigned to WH-WEST",
  },
  {
    id: "LOG-004",
    orderId: "ORD-1002",
    timestamp: "2026-07-28T11:20:00Z",
    level: "ERROR",
    message:
      "Carrier verification failed: Invalid zip code INVALID_ZIP for San Jose, CA",
  },
];

export const INITIAL_CUSTOMER_CREDITS: CustomerCredit[] = [
  {
    customerId: "CUST-501",
    customerName: "Alice Johnson",
    balance: 0.0,
    history: [],
  },
  {
    customerId: "CUST-502",
    customerName: "Bob Smith",
    balance: 10.0,
    history: [
      {
        id: "CRED-101",
        date: "2026-06-15T12:00:00Z",
        amount: 10.0,
        reason: "Promotional goodwill credit",
      },
    ],
  },
  {
    customerId: "CUST-504",
    customerName: "Diana Prince",
    balance: 0.0,
    history: [],
  },
];
