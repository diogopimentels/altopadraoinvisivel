export type SaleItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type SaleOrder = {
  id: string;
  created_at: string;
  customer_name: string;
  payment_status: string;
  total_amount: number;
  shipping_cost: number;
  items: SaleItem[];
};

export type ProductMetric = {
  id: string;
  name: string;
  quantity: number;
  orderCount: number;
  revenue: number;
  averagePrice: number;
  share: number;
};

export type SalesLine = {
  created_at: string;
  orderId: string;
  customerName: string;
  paymentStatus: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SalesReport = {
  periodLabel: string;
  statusLabel: string;
  generatedAt: string;
  summary: {
    orderCount: number;
    revenue: number;
    shipping: number;
    productsRevenue: number;
    averageTicket: number;
    units: number;
    productCount: number;
  };
  pendingAside: { count: number; total: number };
  products: ProductMetric[];
  lines: SalesLine[];
};

export type PeriodPreset = "all" | "7" | "30" | "90" | "custom";
export type StatusFilter = "paid" | "all";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

export function localDateKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeOrder(raw: Record<string, unknown>): SaleOrder {
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: String(raw.id || ""),
    created_at: String(raw.created_at || ""),
    customer_name: String(raw.customer_name || "—"),
    payment_status: String(raw.payment_status || "pending"),
    total_amount: num(raw.total_amount),
    shipping_cost: num(raw.shipping_cost),
    items: items.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id || "sem-id"),
        name: String(row.name || "Produto"),
        price: num(row.price),
        quantity: Math.max(0, Math.floor(num(row.quantity))),
      };
    }),
  };
}

function shiftDays(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return localDateKey(date.toISOString());
}

export function periodBounds(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string
): { from: string; to: string; label: string } {
  const today = localDateKey(new Date().toISOString());
  if (preset === "7") return { from: shiftDays(7), to: today, label: "Últimos 7 dias" };
  if (preset === "30") return { from: shiftDays(30), to: today, label: "Últimos 30 dias" };
  if (preset === "90") return { from: shiftDays(90), to: today, label: "Últimos 90 dias" };
  if (preset === "custom") {
    const from = customFrom || "";
    const to = customTo || today;
    const label =
      from && to ? `${from.split("-").reverse().join("/")} - ${to.split("-").reverse().join("/")}` : "Período personalizado";
    return { from, to, label };
  }
  return { from: "", to: "", label: "Todo o período" };
}

function inRange(iso: string, from: string, to: string) {
  const key = localDateKey(iso);
  if (!key) return false;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

export function buildSalesReport(
  rawOrders: Record<string, unknown>[],
  options: {
    preset: PeriodPreset;
    customFrom: string;
    customTo: string;
    status: StatusFilter;
    generatedAt?: Date;
  }
): SalesReport {
  const { from, to, label } = periodBounds(options.preset, options.customFrom, options.customTo);
  const orders = rawOrders.map(normalizeOrder).filter((order) => inRange(order.created_at, from, to));
  const included = orders.filter((order) =>
    options.status === "all" ? true : order.payment_status === "paid"
  );
  const pending = orders.filter((order) => order.payment_status !== "paid");

  const byProduct = new Map<string, ProductMetric & { orders: Set<string> }>();
  const lines: SalesLine[] = [];

  for (const order of included) {
    for (const item of order.items) {
      const lineTotal = item.price * item.quantity;
      lines.push({
        created_at: order.created_at,
        orderId: order.id,
        customerName: order.customer_name,
        paymentStatus: order.payment_status,
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal,
      });

      const current = byProduct.get(item.id) || {
        id: item.id,
        name: item.name,
        quantity: 0,
        orderCount: 0,
        revenue: 0,
        averagePrice: 0,
        share: 0,
        orders: new Set<string>(),
      };
      current.name = item.name || current.name;
      current.quantity += item.quantity;
      current.revenue += lineTotal;
      current.orders.add(order.id);
      byProduct.set(item.id, current);
    }
  }

  const productsRevenue = [...byProduct.values()].reduce((sum, product) => sum + product.revenue, 0);
  const products: ProductMetric[] = [...byProduct.values()]
    .map(({ orders: orderIds, ...product }) => ({
      ...product,
      orderCount: orderIds.size,
      averagePrice: product.quantity > 0 ? product.revenue / product.quantity : 0,
      share: productsRevenue > 0 ? (product.revenue / productsRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity || a.name.localeCompare(b.name, "pt-BR"));

  lines.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const revenue = included.reduce((sum, order) => sum + order.total_amount, 0);
  const shipping = included.reduce((sum, order) => sum + order.shipping_cost, 0);
  const units = products.reduce((sum, product) => sum + product.quantity, 0);

  return {
    periodLabel: label,
    statusLabel: options.status === "paid" ? "Somente pagos" : "Pagos e pendentes",
    generatedAt: (options.generatedAt || new Date()).toLocaleString("pt-BR"),
    summary: {
      orderCount: included.length,
      revenue,
      shipping,
      productsRevenue,
      averageTicket: included.length > 0 ? revenue / included.length : 0,
      units,
      productCount: products.length,
    },
    pendingAside: {
      count: options.status === "paid" ? pending.length : 0,
      total: options.status === "paid" ? pending.reduce((sum, order) => sum + order.total_amount, 0) : 0,
    },
    products,
    lines,
  };
}
