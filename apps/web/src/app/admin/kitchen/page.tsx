
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChefHat,
  Clock3,
  Printer,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

const API =
  process.env.NODE_ENV === "production"
    ? ""
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

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
  externalPlatformOrderId?: string | null;
  lines?: Line[];
  table?: { tableNumber: string } | null;
  orderNotes?: string | null;
};

type OrderDetailResponse = {
  order?: Order;
  lines?: Line[];
  table?: { tableNumber: string } | null;
};

const columns = [
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
  {
    status: "SERVED",
    title: "Served",
    helper: "Completed handover",
    tone: "border-stone-200 bg-white text-stone-700",
  },
] as const;

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      // Get all orders first.
      const response = await fetch(`${API}/api/v1/orders`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Kitchen orders could not be loaded (${response.status})`
        );
      }

      const body = await response.json();

      const summaries: Order[] = Array.isArray(body.orders)
        ? body.orders
        : [];

      // Only KOT-sent orders appear on the kitchen board.
      const active = summaries.filter((order) =>
        ["PREPARING", "READY", "SERVED"].includes(order.status)
      );

      // Fetch full order details.
      const detailed = await Promise.all(
        active.map(async (summary): Promise<Order> => {
          try {
            const detailResponse = await fetch(
              `${API}/api/v1/orders/${summary.id}`,
              {
                credentials: "include",
                cache: "no-store",
              }
            );

            if (!detailResponse.ok) {
              return summary;
            }

            const detail =
              (await detailResponse.json()) as OrderDetailResponse;

            // IMPORTANT:
            // The API returns { order, lines, table, ... }
            // The actual order status is inside detail.order.
            const fullOrder = detail.order ?? (detail as unknown as Order);

            return {
              ...summary,
              ...fullOrder,
              lines:
                detail.lines ??
                fullOrder.lines ??
                summary.lines ??
                [],
              table:
                detail.table ??
                fullOrder.table ??
                summary.table ??
                null,
              orderNotes:
                fullOrder.orderNotes ??
                summary.orderNotes ??
                null,
            };
          } catch {
            // One failed detail request should not hide other orders.
            return summary;
          }
        })
      );

      // Newest KOT orders first.
      detailed.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setOrders(detailed);
      setLastSync(new Date());
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Kitchen service is unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and automatic five-second refresh.
  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <main className="min-h-screen bg-[#171512] p-4 text-white md:p-7">
      <div className="mx-auto max-w-[1700px]">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.28em] text-amber-300">
              Sukoon Diaries · Kitchen display
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Kitchen board
            </h1>

            <p className="mt-1 text-xs text-stone-400">
              Only KOT-sent orders appear here · auto refresh every 5 seconds
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-stone-400">
              {lastSync
                ? `Updated ${lastSync.toLocaleTimeString("en-IN")}`
                : "Connecting…"}
            </span>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-3 py-2 text-xs disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <a
              href="/admin"
              className="rounded-xl border border-stone-700 px-3 py-2 text-xs"
            >
              Dashboard
            </a>
          </div>
        </header>

        {/* Error message */}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-950 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        {/* Kitchen columns */}
        <section className="mt-7 grid items-start gap-4 xl:grid-cols-3">
          {columns.map((column) => {
            const list = orders.filter(
              (order) => order.status === column.status
            );

            return (
              <section
                key={column.status}
                aria-label={column.title}
                className="rounded-2xl border border-stone-800 bg-[#201d19] p-3 md:p-4"
              >
                {/* Column heading */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {column.title}
                    </h2>

                    <p className="mt-0.5 text-[10px] text-stone-500">
                      {column.helper}
                    </p>
                  </div>

                  <span
                    className="rounded-full bg-white/10 px-3 py-1 text-xs tabular-nums"
                    aria-label={`${list.length} orders`}
                  >
                    {list.length}
                  </span>
                </div>

                {/* Orders */}
                <div className="space-y-3">
                  {list.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-xl border border-stone-700 bg-[#29251f] p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-bold">
                            {order.orderNumber}
                          </p>

                          <p className="mt-1 text-[10px] text-stone-400">
                            {order.source} ·{" "}
                            {new Date(order.createdAt).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${column.tone}`}
                        >
                          {column.status === "PREPARING"
                            ? "MAKING"
                            : column.status}
                        </span>
                      </div>

                      {/* Customer and table */}
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-stone-300">
                        {order.customerName && (
                          <span>{order.customerName}</span>
                        )}

                        {order.table && (
                          <span>
                            Table {order.table.tableNumber}
                          </span>
                        )}

                        {order.externalPlatformOrderId && (
                          <span>
                            {order.externalPlatformOrderId}
                          </span>
                        )}
                      </div>

                      {/* Food items */}
                      <div className="mt-3 space-y-2 border-t border-stone-700 pt-3">
                        {(order.lines ?? []).length > 0 ? (
                          order.lines!.map((line) => (
                            <div
                              key={line.id}
                              className="flex justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <span>
                                  {line.itemNameSnapshot}
                                </span>

                                {line.notes && (
                                  <p className="mt-0.5 text-[10px] text-amber-200">
                                    Note: {line.notes}
                                  </p>
                                )}
                              </div>

                              <b className="shrink-0">
                                × {line.quantity}
                              </b>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-stone-500">
                            Item details could not be loaded.
                          </p>
                        )}
                      </div>

                      {/* Kitchen notes */}
                      {order.orderNotes && (
                        <p className="mt-3 rounded-lg border border-dashed border-stone-600 p-2 text-[10px] text-amber-100">
                          Order note: {order.orderNotes}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="mt-4 flex gap-2">
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={`/receipt/${order.id}?type=kot`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-[10px] font-bold text-black"
                        >
                          <Printer size={12} />
                          Reprint KOT
                        </a>

                        <a
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-600 px-3 py-2 text-[10px]"
                        >
                          Details
                          <ArrowRight size={11} />
                        </a>
                      </div>
                    </article>
                  ))}

                  {/* Empty column */}
                  {list.length === 0 && (
                    <div className="rounded-xl border border-dashed border-stone-700 p-7 text-center">
                      <ChefHat className="mx-auto text-stone-600" />

                      <p className="mt-2 text-xs text-stone-500">
                        Nothing in this stage.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </section>

        <p className="mt-6 flex items-center justify-center gap-2 text-[10px] text-stone-600">
          <Clock3 size={12} />
          New walk-in and QR orders enter Making when their KOT is printed.
        </p>
      </div>
    </main>
  );
}
