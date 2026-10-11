export type Role = "Administrator" | "Shop user";

export const shops = [
  "All locations",
  "Central inventory",
  "Shop One",
  "Shop Two",
  "Shop Three",
];

export const products = [
  {
    id: "p1",
    name: "Banana Robusta",
    plu: "101",
    category: "Fruit",
    stock: 18.4,
    price: 60,
    recovery: 30,
    status: "Healthy",
  },
  {
    id: "p2",
    name: "Tomato Hybrid",
    plu: "114",
    category: "Vegetable",
    stock: 4.2,
    price: 48,
    recovery: 25,
    status: "Low",
  },
  {
    id: "p3",
    name: "Green Chilli",
    plu: "128",
    category: "Vegetable",
    stock: 7.8,
    price: 90,
    recovery: 25,
    status: "Healthy",
  },
  {
    id: "p4",
    name: "Coriander",
    plu: "141",
    category: "Leafy",
    stock: 3.6,
    price: 120,
    recovery: 20,
    status: "Low",
  },
  {
    id: "p5",
    name: "Cabbage",
    plu: "152",
    category: "Vegetable",
    stock: 14.6,
    price: 36,
    recovery: 30,
    status: "Healthy",
  },
  {
    id: "p6",
    name: "Apple Royal Gala",
    plu: "201",
    category: "Fruit",
    stock: 9.2,
    price: 220,
    recovery: 15,
    status: "Healthy",
  },
] as const;

export const activities = [
  {
    icon: "↓",
    title: "Purchase received",
    body: "18.0 kg Banana Robusta · Central inventory",
    amount: "₹ 1,080",
    time: "10:18 AM",
    tone: "green",
  },
  {
    icon: "↗",
    title: "Transfer confirmed",
    body: "8.0 kg Tomato Hybrid · Central → Shop One",
    amount: "8.0 kg",
    time: "09:42 AM",
    tone: "blue",
  },
  {
    icon: "⊘",
    title: "Wastage recorded",
    body: "0.5 kg Coriander · Shop Two",
    amount: "0.5 kg",
    time: "09:10 AM",
    tone: "warning",
  },
  {
    icon: "⌁",
    title: "Machine sale synced",
    body: "Receipt #TM-004821 · Shop One",
    amount: "₹ 263",
    time: "08:56 AM",
    tone: "green",
  },
] as const;

export const sales = [
  {
    id: "TM-004821",
    shop: "Shop One",
    time: "08:56 AM",
    items: "Banana Robusta, Tomato Hybrid",
    amount: "₹ 263.20",
    status: "Synced",
  },
  {
    id: "TM-004820",
    shop: "Shop Two",
    time: "08:51 AM",
    items: "Apple Royal Gala",
    amount: "₹ 440.00",
    status: "Synced",
  },
  {
    id: "TM-004819",
    shop: "Shop One",
    time: "08:43 AM",
    items: "Coriander, Green Chilli",
    amount: "₹ 112.50",
    status: "Review",
  },
] as const;

export const reports = [
  ["Current stock", "Quantity by product and location", "inventory"],
  [
    "Daily opening stock",
    "Physical counts for a business date",
    "opening-stock",
  ],
  ["Sales summary", "Normal and recovery sales by shop", "sales"],
  ["Wastage", "Product, reason and location", "wastage"],
  ["Purchases", "Supplier and date-wise purchase history", "purchases"],
  ["Transfers", "Movement between locations", "transfers"],
  ["Expenses", "Category, location and date", "expenses"],
  ["Price history", "Selling-price changes", "price-history"],
] as const;

export const adminMenu = [
  ["Products & pricing", "PLU, prices and recovery rules", "products", "▦"],
  ["Suppliers & purchases", "Records and central receiving", "suppliers", "↓"],
  ["Shops & locations", "Three shops and central inventory", "shops", "⌂"],
  ["Users & access", "Roles and shop assignment", "users", "◉"],
  ["Weighing machines", "Devices, PLU mapping and sync", "devices", "⌁"],
  ["Stock adjustments", "Authorised, reasoned corrections", "adjustments", "±"],
  ["Audit history", "Price, stock and access events", "audit-log", "◷"],
] as const;

export const shopMenu = [
  [
    "Today’s opening stock",
    "Submit the fresh physical count",
    "opening-stock",
    "☼",
  ],
  ["Incoming transfers", "Stock arriving at your shop", "transfers", "↗"],
  ["Machine sales", "Your shop’s accepted sales", "sales", "⌁"],
  ["Low-stock alerts", "Products needing attention", "notifications", "!"],
] as const;
