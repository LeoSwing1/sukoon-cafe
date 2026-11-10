"use client";

import { useCallback, useEffect, useState } from "react";
import { ChefHat, Clock3, Printer, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";

const API = process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100");
type Line = { id: number; itemNameSnapshot: string; quantity: number; notes?: string | null; kitchenStatus?: string };
type Order = { id: number; orderNumber: string; source: string; status: string; createdAt: string; customerName?: string | null; externalPlatformOrderId?: string | null; lines?: Line[]; table?: { tableNumber: string } | null; orderNotes?: string | null };

const columns = [
  { status: "PREPARING", title: "Making now", helper: "KOT printed · preparing", tone: "border-amber-200 bg-amber-50 text-amber-900" },
  { status: "READY", title: "Ready for pickup", helper: "Waiting for service / handover", tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  { status: "SERVED", title: "Served", helper: "Completed handover", tone: "border-stone-200 bg-white text-stone-700" },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/v1/orders`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Kitchen orders could not be loaded");
      const body = await response.json();
      // Orders enter the kitchen board only after the cashier prints/sends a KOT.
      const active = (body.orders || []).filter((o: Order) => ["PREPARING", "READY", "SERVED"].includes(o.status));
      const detailed = await Promise.all(active.map(async (o: Order) => {
        const result = await fetch(`${API}/api/v1/orders/${o.id}`, { credentials: "include", cache: "no-store" });
        return result.ok ? result.json() : o;
      }));
      setOrders(detailed);
      setLastSync(new Date());
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "API unavailable"); }
  }, []);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 5000); return () => clearInterval(timer); }, [load]);

  return (
    <main className="min-h-screen bg-[#171512] p-4 text-white md:p-7">
      <div className="mx-auto max-w-[1700px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-amber-300">Sukoon Diaries · Kitchen display</p><h1 className="mt-2 text-3xl font-semibold">Kitchen board</h1><p className="mt-1 text-xs text-stone-400">Only KOT-sent orders appear here · auto refresh every 5 seconds</p></div>
          <div className="flex items-center gap-3"><span className="text-[10px] text-stone-400">{lastSync ? `Updated ${lastSync.toLocaleTimeString("en-IN")}` : "Connecting…"}</span><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-3 py-2 text-xs"><RefreshCw size={13}/> Refresh</button><a href="/admin" className="rounded-xl border border-stone-700 px-3 py-2 text-xs">Dashboard</a></div>
        </header>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-950 p-3 text-sm text-red-200">{error}</p>}
        <section className="mt-7 grid items-start gap-4 xl:grid-cols-3">
          {columns.map((column) => {
            const list = orders.filter((o) => o.status === column.status);
            return <div key={column.status} className="rounded-2xl border border-stone-800 bg-[#201d19] p-3 md:p-4">
              <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="font-semibold">{column.title}</h2><p className="mt-0.5 text-[10px] text-stone-500">{column.helper}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{list.length}</span></div>
              <div className="space-y-3">{list.map((order) => <article key={order.id} className="rounded-xl border border-stone-700 bg-[#29251f] p-4">
                <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold">{order.orderNumber}</p><p className="mt-1 text-[10px] text-stone-400">{order.source} · {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p></div><span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${column.tone}`}>{column.status === "PREPARING" ? "MAKING" : column.status}</span></div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-stone-300">{order.customerName && <span>{order.customerName}</span>}{order.table && <span>Table {order.table.tableNumber}</span>}{order.externalPlatformOrderId && <span>{order.externalPlatformOrderId}</span>}</div>
                <div className="mt-3 space-y-2 border-t border-stone-700 pt-3">{(order.lines || []).map((line) => <div key={line.id} className="flex justify-between gap-3 text-xs"><div><span>{line.itemNameSnapshot}</span>{line.notes && <p className="mt-0.5 text-[10px] text-amber-200">Note: {line.notes}</p>}</div><b>× {line.quantity}</b></div>)}</div>
                {order.orderNotes && <p className="mt-3 rounded-lg border border-dashed border-stone-600 p-2 text-[10px] text-amber-100">Order note: {order.orderNotes}</p>}
                <div className="mt-4 flex gap-2"><a target="_blank" href={`/receipt/${order.id}?type=kot`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-[10px] font-bold text-black"><Printer size={12}/> Reprint KOT</a><a href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-600 px-3 py-2 text-[10px]">Details <ArrowRight size={11}/></a></div>
              </article>)}{list.length === 0 && <div className="rounded-xl border border-dashed border-stone-700 p-7 text-center"><ChefHat className="mx-auto text-stone-600"/><p className="mt-2 text-xs text-stone-500">Nothing in this stage.</p></div>}</div>
            </div>;
          })}
        </section>
        <p className="mt-6 flex items-center justify-center gap-2 text-[10px] text-stone-600"><Clock3 size={12}/> New walk-in and QR orders enter Making when their KOT is printed.</p>
      </div>
    </main>
  );
}
