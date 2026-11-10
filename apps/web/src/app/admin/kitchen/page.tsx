"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChefHat,
  CheckCircle2,
  Clock3,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
  Archive,
  History,
} from "lucide-react";

// In production, Next.js rewrites /api/* to the API deployment.
const API =
  process.env.NODE_ENV === "production"
    ? ""
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

type PaymentMethod = "CASH" | "UPI" | "CARD" | "ONLINE" | "OTHER";
type PaymentStatus = "PENDING" | "PAID" | "PARTIAL";

type Line = {
  id: number;
  itemNameSnapshot: string;
  quantity: number;
  notes?: string | null;
  kitchenStatus?: string;
};

type Order = {
  id: number;
  orderNumber: string;
  source: string;
  status: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
  externalPlatformOrderId?: string | null;
  lines?: Line[];
  table?: { tableNumber: string } | null;
  orderNotes?: string | null;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string | null;
  totalPaise?: number;
};

type OrderDetailResponse = {
  order?: Order;
  lines?: Line[];
  table?: { tableNumber: string } | null;
};

const activeColumns = [
  {
    status: "PREPARING",
    title: "Making now",
    helper: "KOT printed · preparing",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
  },
  {
    status: "READY",
    title: "Ready for pickup",
    helper: "Waiting for service / handover",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
] as const;

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);

async function readApiError(response: Response, fallback: string) {
  const raw = await response.text().catch(() => "");
  if (!raw) return `${fallback} (${response.status})`;

  try {
    const data = JSON.parse(raw) as { error?: string };
    return data.error || fallback;
  } catch {
    return `${fallback} (${response.status})`;
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KitchenPage() {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [view, setView] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [historySearch, setHistorySearch] = useState("");
  const [historyDate, setHistoryDate] = useState<"TODAY" | "7_DAYS" | "ALL">("TODAY");
  const [historyStatus, setHistoryStatus] = useState<
    "ALL" | "SERVED" | "COMPLETED" | "CANCELLED"
  >("ALL");
  const [historyLimit, setHistoryLimit] = useState(20);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pickupOrder, setPickupOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [pickupPaymentStatus, setPickupPaymentStatus] = useState<"PAID" | "PENDING">("PAID");

  const canCollectPayment = useMemo(
    () => ["OWNER", "MANAGER", "CASHIER", "SERVICE"].includes(userRole || ""),
    [userRole],
  );

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/v1/orders`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Kitchen orders could not be loaded"));
      }

      const body = await response.json();
      const summaries: Order[] = Array.isArray(body.orders) ? body.orders : [];
      const sorted = [...summaries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // The live kitchen queue contains only orders still being prepared or waiting for pickup.
      const activeSummaries = sorted.filter((order) =>
        ["PREPARING", "READY"].includes(order.status),
      );

      // Previous orders are kept separately, so the live kitchen board stays compact.
      const previous = sorted.filter((order) =>
        ["SERVED", "COMPLETED", "CANCELLED"].includes(order.status),
      );

      // Fetch full details only for active kitchen orders. History uses the summary data
      // and loads a full receipt/details page only when staff opens an order.
      const detailedActive = await Promise.all(
        activeSummaries.map(async (summary): Promise<Order> => {
          try {
            const detailResponse = await fetch(`${API}/api/v1/orders/${summary.id}`, {
              credentials: "include",
              cache: "no-store",
            });

            if (!detailResponse.ok) return summary;

            const detail = (await detailResponse.json()) as OrderDetailResponse;
            const fullOrder = detail.order ?? (detail as unknown as Order);

            return {
              ...summary,
              ...fullOrder,
              lines: detail.lines ?? fullOrder.lines ?? summary.lines ?? [],
              table: detail.table ?? fullOrder.table ?? summary.table ?? null,
              orderNotes: fullOrder.orderNotes ?? summary.orderNotes ?? null,
            };
          } catch {
            return summary;
          }
        }),
      );

      setActiveOrders(detailedActive);
      setHistoryOrders(previous);
      setLastSync(new Date());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kitchen service is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    fetch(`${API}/api/v1/auth/me`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("Session unavailable")),
      )
      .then((data) => {
        if (mounted) setUserRole(data.user?.role ?? null);
      })
      .catch(() => {
        if (mounted) setUserRole(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }, [lastSync]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    const now = lastSync?.getTime() ?? Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return historyOrders.filter((order) => {
      if (historyStatus !== "ALL" && order.status !== historyStatus) return false;

      const created = new Date(order.createdAt).getTime();
      if (historyDate === "TODAY" && created < todayStart) return false;
      if (historyDate === "7_DAYS" && created < sevenDaysAgo) return false;

      if (query) {
        const searchable = [
          order.orderNumber,
          order.customerName,
          order.customerPhone,
          order.source,
          order.externalPlatformOrderId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [historyOrders, historySearch, historyDate, historyStatus, lastSync, todayStart]);

  const visibleHistory = filteredHistory.slice(0, historyLimit);

  async function markReady(order: Order) {
    setActionOrderId(order.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "READY",
          note: "Kitchen marked order ready for pickup",
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Could not mark order ready"));
      }

      setNotice(`${order.orderNumber} is now ready for pickup.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update order status.");
    } finally {
      setActionOrderId(null);
    }
  }

  function openPickup(order: Order, paymentStatus: "PAID" | "PENDING" = "PAID") {
    setPickupOrder(order);
    setPaymentMethod(
      ["CASH", "UPI", "CARD", "ONLINE", "OTHER"].includes(order.paymentMethod || "")
        ? (order.paymentMethod as PaymentMethod)
        : "CASH",
    );
    setPickupPaymentStatus(paymentStatus);
    setError("");
    setNotice("");
  }

  async function confirmPickup() {
    if (!pickupOrder) return;

    setActionOrderId(pickupOrder.id);
    setError("");
    setNotice("");

    try {
      let response: Response;

      // A COMPLETED order is already closed operationally. Use the existing payment
      // endpoint to collect an outstanding balance without reopening its lifecycle.
      if (pickupOrder.status === "COMPLETED") {
        response = await fetch(`${API}/api/v1/orders/${pickupOrder.id}/payment`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: "PAID" }),
        });
      } else {
        response = await fetch(`${API}/api/v1/orders/${pickupOrder.id}/pickup`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentStatus: pickupPaymentStatus,
            ...(pickupPaymentStatus === "PAID" ? { paymentMethod } : {}),
          }),
        });
      }

      if (!response.ok) {
        throw new Error(await readApiError(response, "Could not record payment / pickup"));
      }

      setPickupOrder(null);
      setNotice(
        pickupOrder.status === "COMPLETED"
          ? `${pickupOrder.orderNumber}: outstanding payment marked as paid.`
          : pickupPaymentStatus === "PAID"
            ? `${pickupOrder.orderNumber}: picked up, served and payment recorded as paid via ${paymentMethod}.`
            : `${pickupOrder.orderNumber}: picked up and served. Payment remains pending.`,
      );

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete pickup.");
    } finally {
      setActionOrderId(null);
    }
  }

  function renderActiveOrder(order: Order, status: "PREPARING" | "READY") {
    const column = activeColumns.find((item) => item.status === status)!;

    return (
      <article key={order.id} className="rounded-xl border border-stone-700 bg-[#29251f] p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-all text-sm font-bold">{order.orderNumber}</p>
            <p className="mt-1 text-[10px] text-stone-400">
              {order.source} · {formatDateTime(order.createdAt)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${column.tone}`}>
            {status === "PREPARING" ? "MAKING" : "READY"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-stone-300">
          {order.customerName && <span>{order.customerName}</span>}
          {order.table && <span>Table {order.table.tableNumber}</span>}
          {order.externalPlatformOrderId && <span>{order.externalPlatformOrderId}</span>}
        </div>

        <div className="mt-3 space-y-2 border-t border-stone-700 pt-3">
          {(order.lines ?? []).length > 0 ? (
            order.lines!.map((line) => (
              <div key={line.id} className="flex justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span>{line.itemNameSnapshot}</span>
                  {line.notes && (
                    <p className="mt-0.5 text-[10px] text-amber-200">Note: {line.notes}</p>
                  )}
                </div>
                <b className="shrink-0">× {line.quantity}</b>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-stone-500">Item details could not be loaded. Open order details to review.</p>
          )}
        </div>

        {order.orderNotes && (
          <p className="mt-3 rounded-lg border border-dashed border-stone-600 p-2 text-[10px] text-amber-100">
            Order note: {order.orderNotes}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2">
          {status === "PREPARING" && (
            <button
              type="button"
              disabled={actionOrderId === order.id}
              onClick={() => void markReady(order)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-3 text-xs font-bold text-[#102016] disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              {actionOrderId === order.id ? "Updating…" : "Mark Ready"}
            </button>
          )}

          {status === "READY" && canCollectPayment && (
            <button
              type="button"
              disabled={actionOrderId === order.id}
              onClick={() => openPickup(order, "PAID")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-3 text-xs font-bold text-[#102016] disabled:opacity-50"
            >
              <ShoppingBag size={15} />
              Picked Up & Collect Payment
            </button>
          )}

          {status === "READY" && !canCollectPayment && (
            <p className="rounded-lg border border-stone-700 px-3 py-2 text-center text-[10px] text-stone-400">
              Waiting for cashier / service to record pickup and payment.
            </p>
          )}

          <div className="flex gap-2">
            <a
              target="_blank"
              rel="noreferrer"
              href={`/receipt/${order.id}?type=kot`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-stone-600 px-3 py-2 text-[10px] font-bold text-stone-200"
            >
              <Printer size={12} /> Reprint KOT
            </a>
            <a
              href={`/admin/orders/${order.id}`}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-600 px-3 py-2 text-[10px]"
            >
              Details <ArrowRight size={11} />
            </a>
          </div>
        </div>
      </article>
    );
  }

  function renderHistoryOrder(order: Order) {
    const isCancelled = order.status === "CANCELLED";
    const isCompleted = order.status === "COMPLETED";
    const canPay = canCollectPayment && order.paymentStatus !== "PAID" && !isCancelled;

    return (
      <article key={order.id} className="rounded-xl border border-stone-700 bg-[#29251f] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-all text-sm font-bold">{order.orderNumber}</p>
            <p className="mt-1 text-[10px] text-stone-400">
              {order.source} · {formatDateTime(order.createdAt)}
              {order.customerName ? ` · ${order.customerName}` : ""}
              {order.customerPhone ? ` · ${order.customerPhone}` : ""}
            </p>
          </div>

          <span className={`rounded-full px-3 py-1 text-[9px] font-bold ${
            isCancelled
              ? "bg-red-950 text-red-300"
              : isCompleted
                ? "bg-stone-700 text-stone-200"
                : "bg-emerald-950 text-emerald-300"
          }`}>
            {order.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-black/20 p-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] text-stone-500">Order total</p>
            <p className="mt-1 text-sm font-semibold">{money(order.totalPaise || 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-stone-500">Payment</p>
            <p className={`mt-1 text-sm font-semibold ${
              order.paymentStatus === "PAID" ? "text-emerald-300" : "text-amber-300"
            }`}>
              {order.paymentStatus || "PENDING"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-stone-500">Method</p>
            <p className="mt-1 text-sm">{order.paymentMethod || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-stone-500">Customer</p>
            <p className="mt-1 truncate text-sm">{order.customerName || "Walk-in"}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!isCancelled && (
            <a
              href={`/receipt/${order.id}?type=invoice`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#ead3b5] px-3 py-3 text-xs font-bold text-[#211d19] hover:bg-[#f1dfc8]"
            >
              <Printer size={14} /> View / Print Customer Bill
            </a>
          )}

          {canPay && (
            <button
              type="button"
              disabled={actionOrderId === order.id}
              onClick={() => openPickup(order, "PAID")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-300 px-3 py-3 text-xs font-bold text-black disabled:opacity-50"
            >
              ₹ Collect Payment
            </button>
          )}

          <a
            href={`/receipt/${order.id}?type=kot`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-600 px-3 py-3 text-xs"
          >
            <Printer size={13} /> Reprint KOT
          </a>

          <a
            href={`/admin/orders/${order.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-600 px-3 py-3 text-xs"
          >
            Details <ArrowRight size={12} />
          </a>
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-[#171512] p-4 text-white md:p-7">
      <div className="mx-auto max-w-[1700px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.28em] text-amber-300">
              Sukoon Diaries · Kitchen display
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Kitchen board</h1>
            <p className="mt-1 text-xs text-stone-400">
              Active kitchen queue and previous served orders · auto refresh every 5 seconds
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-stone-400">
              {lastSync ? `Updated ${lastSync.toLocaleTimeString("en-IN")}` : "Connecting…"}
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-3 py-2 text-xs disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <a href="/admin" className="rounded-xl border border-stone-700 px-3 py-2 text-xs">
              Dashboard
            </a>
          </div>
        </header>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-950 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/70 p-3 text-sm text-emerald-200">
            {notice}
          </p>
        )}

        {/* Workspace switcher */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-stone-800 pb-4">
          <button
            type="button"
            onClick={() => setView("ACTIVE")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              view === "ACTIVE"
                ? "bg-amber-300 text-[#211d19]"
                : "border border-stone-700 bg-[#201d19] text-stone-300"
            }`}
          >
            <ChefHat size={16} />
            Active Kitchen
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              view === "ACTIVE" ? "bg-black/10" : "bg-white/10"
            }`}>
              {activeOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView("HISTORY");
              setHistoryLimit(20);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              view === "HISTORY"
                ? "bg-amber-300 text-[#211d19]"
                : "border border-stone-700 bg-[#201d19] text-stone-300"
            }`}
          >
            <History size={16} />
            Served / Previous
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              view === "HISTORY" ? "bg-black/10" : "bg-white/10"
            }`}>
              {historyOrders.length}
            </span>
          </button>
        </div>

        {view === "ACTIVE" ? (
          <>
            <section className="mt-6 grid items-start gap-4 xl:grid-cols-2">
              {activeColumns.map((column) => {
                const list = activeOrders.filter((order) => order.status === column.status);

                return (
                  <section
                    key={column.status}
                    aria-label={column.title}
                    className="rounded-2xl border border-stone-800 bg-[#201d19] p-3 md:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h2 className="font-semibold">{column.title}</h2>
                        <p className="mt-0.5 text-[10px] text-stone-500">{column.helper}</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs tabular-nums">
                        {list.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {list.map((order) =>
                        renderActiveOrder(order, column.status),
                      )}

                      {list.length === 0 && (
                        <div className="rounded-xl border border-dashed border-stone-700 p-8 text-center">
                          <ChefHat className="mx-auto text-stone-600" />
                          <p className="mt-2 text-xs text-stone-500">Nothing in this stage.</p>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </section>

            <p className="mt-6 flex items-center justify-center gap-2 text-[10px] text-stone-600">
              <Clock3 size={12} /> Served and completed orders are moved to Served / Previous.
            </p>
          </>
        ) : (
          <section className="mt-6 rounded-2xl border border-stone-800 bg-[#201d19] p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Archive size={18} className="text-amber-300" />
                  <h2 className="text-xl font-semibold">Served / Previous orders</h2>
                </div>
                <p className="mt-1 text-xs text-stone-400">
                  Completed handovers and older orders stay here instead of filling the live kitchen queue.
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                {filteredHistory.length} matching orders
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_190px]">
              <label className="flex items-center gap-2 rounded-xl border border-stone-700 bg-[#171512] px-3 py-3">
                <Search size={15} className="text-stone-500" />
                <input
                  value={historySearch}
                  onChange={(event) => {
                    setHistorySearch(event.target.value);
                    setHistoryLimit(20);
                  }}
                  placeholder="Search order, customer, phone or source"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-stone-600"
                />
              </label>

              <select
                value={historyDate}
                onChange={(event) => {
                  setHistoryDate(event.target.value as typeof historyDate);
                  setHistoryLimit(20);
                }}
                className="rounded-xl border border-stone-700 bg-[#171512] px-3 py-3 text-sm text-white"
              >
                <option value="TODAY">Today</option>
                <option value="7_DAYS">Last 7 days</option>
                <option value="ALL">All loaded history</option>
              </select>

              <select
                value={historyStatus}
                onChange={(event) => {
                  setHistoryStatus(event.target.value as typeof historyStatus);
                  setHistoryLimit(20);
                }}
                className="rounded-xl border border-stone-700 bg-[#171512] px-3 py-3 text-sm text-white"
              >
                <option value="ALL">All previous statuses</option>
                <option value="SERVED">Served</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {visibleHistory.map(renderHistoryOrder)}

              {visibleHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-stone-700 p-10 text-center">
                  <History className="mx-auto text-stone-600" size={26} />
                  <p className="mt-3 text-sm text-stone-400">No previous orders match these filters.</p>
                  <p className="mt-1 text-xs text-stone-600">
                    Try another date range or search term.
                  </p>
                </div>
              )}
            </div>

            {visibleHistory.length < filteredHistory.length && (
              <button
                type="button"
                onClick={() => setHistoryLimit((current) => current + 20)}
                className="mt-5 w-full rounded-xl border border-stone-700 px-4 py-3 text-sm font-semibold text-stone-200 hover:bg-white/5"
              >
                Load 20 more previous orders
              </button>
            )}

            <p className="mt-4 text-center text-[10px] text-stone-600">
              Showing orders returned by the existing orders API (up to its latest 100 records).
            </p>
          </section>
        )}
      </div>

      {/* Pickup and payment dialog */}
      {pickupOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pickup-dialog-title"
            className="w-full max-w-md rounded-2xl border border-stone-700 bg-[#24211d] p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300">
                  {pickupOrder.status === "COMPLETED" ? "Outstanding payment" : "Order handover"}
                </p>
                <h2 id="pickup-dialog-title" className="mt-1 text-xl font-semibold">
                  {pickupOrder.status === "COMPLETED" ? "Record payment" : "Confirm pickup"}
                </h2>
                <p className="mt-1 text-xs text-stone-400">{pickupOrder.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setPickupOrder(null)}
                className="rounded-lg border border-stone-600 p-2 text-stone-300"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-black/25 p-4">
              <p className="text-xs text-stone-400">Bill total</p>
              <p className="mt-1 text-2xl font-bold">{money(pickupOrder.totalPaise || 0)}</p>
              <p className="mt-1 text-[10px] text-stone-500">
                {pickupOrder.status === "COMPLETED"
                  ? "This order is already completed. This action only updates its payment status."
                  : "Confirm only after the order has physically been handed over."}
              </p>
            </div>

            {pickupOrder.status !== "COMPLETED" && (
              <>
                <label className="mt-4 block text-sm">
                  Payment method
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                    className="mt-2 w-full rounded-xl border border-stone-600 bg-[#171512] p-3 text-sm text-white"
                    disabled={pickupPaymentStatus === "PENDING"}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="ONLINE">Online / prepaid</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPickupPaymentStatus("PAID")}
                    className={`rounded-xl border p-3 text-xs font-semibold ${
                      pickupPaymentStatus === "PAID"
                        ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
                        : "border-stone-600 text-stone-300"
                    }`}
                  >
                    Payment received
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupPaymentStatus("PENDING")}
                    className={`rounded-xl border p-3 text-xs font-semibold ${
                      pickupPaymentStatus === "PENDING"
                        ? "border-amber-400 bg-amber-400/15 text-amber-200"
                        : "border-stone-600 text-stone-300"
                    }`}
                  >
                    Payment pending
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              disabled={actionOrderId === pickupOrder.id}
              onClick={() => void confirmPickup()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3.5 text-sm font-bold text-[#102016] disabled:opacity-50"
            >
              <CheckCircle2 size={17} />
              {actionOrderId === pickupOrder.id
                ? "Saving…"
                : pickupOrder.status === "COMPLETED"
                  ? "Confirm payment received"
                  : pickupPaymentStatus === "PAID"
                    ? "Confirm pickup · mark paid"
                    : "Confirm pickup · payment pending"}
            </button>

            <p className="mt-3 text-center text-[10px] leading-relaxed text-stone-500">
              This records the payment status and handover. It does not charge a card or UPI account automatically.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
