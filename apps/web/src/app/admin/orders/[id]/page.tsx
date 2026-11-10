"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Plus, Minus, Save, Pencil, Printer, ReceiptText, ChefHat, Clock3, CheckCircle2, X, RotateCcw, Tag, Percent, ShoppingBag } from "lucide-react";

const API = process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100");
const money = (p: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(p / 100);
type Line = { id: number; menuItemId: number | null; itemNameSnapshot: string; quantity: number; unitPricePaise: number; notes?: string | null };
type Item = { id: number; name: string; description?: string | null; pricePaise: number; available: boolean; categoryName?: string | null };
type OrderData = { order: any; lines: Line[]; invoice: any; table: any; statusEvents: any[] };

const stages = ["RECEIVED", "PREPARING", "READY", "SERVED", "COMPLETED"];

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [data, setData] = useState<OrderData | null>(null);
  const [catalogue, setCatalogue] = useState<Item[]>([]);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [lineNotes, setLineNotes] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [discountInput, setDiscountInput] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState<"kot" | "invoice" | null>(null);
  const [addRound, setAddRound] = useState(false);
  const [addQty, setAddQty] = useState<Record<number, number>>({});

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [orderResponse, menuResponse, settingsResponse] = await Promise.all([
        fetch(`${API}/api/v1/orders/${id}`, { credentials: "include", cache: "no-store" }),
        fetch(`${API}/api/v1/menu-items`, { credentials: "include", cache: "no-store" }),
        fetch(`${API}/api/v1/cafe-settings`, { credentials: "include", cache: "no-store" }),
      ]);
      const orderBody = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderBody.error || "Order could not be loaded");
      const [menuBody, settingsBody] = await Promise.all([
        menuResponse.ok ? menuResponse.json() : Promise.resolve({ items: [] }),
        settingsResponse.ok ? settingsResponse.json() : Promise.resolve({ settings: {} }),
      ]);
      setData(orderBody);
      setCatalogue(menuBody.items || []);
      const o = orderBody.order;
      const subtotalAfterDiscount = Math.max(0, o.subtotalPaise - o.discountPaise);
      const inferredTax = subtotalAfterDiscount > 0 ? (o.taxPaise / subtotalAfterDiscount) * 100 : (settingsBody.settings?.taxRateBps || 0) / 100;
      setTaxRate(String(Number(inferredTax.toFixed(2))));
      setCustomer(o.customerName || "");
      setPhone(o.customerPhone || "");
      setAddress(o.deliveryAddress || "");
      setOrderNotes(o.orderNotes || "");
      setPaymentMethod(o.paymentMethod || "CASH");
      setPaymentStatus(o.paymentStatus || "PENDING");
      setDiscountType(o.discountType === "PERCENT" ? "PERCENT" : "FIXED");
      setDiscountInput(o.discountType === "PERCENT" ? String((Number(o.discountValue || 0) / 100).toFixed(2)) : String((Number(o.discountPaise || 0) / 100).toFixed(2)));
      const quantities: Record<number, number> = {};
      const notes: Record<number, string> = {};
      for (const line of orderBody.lines || []) {
        if (line.menuItemId) quantities[line.menuItemId] = (quantities[line.menuItemId] || 0) + line.quantity;
        if (line.menuItemId && line.notes) notes[line.menuItemId] = line.notes;
      }
      setSelected(quantities);
      setLineNotes(notes);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load order"); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(() => Array.from(new Set(catalogue.filter((i) => i.available).map((i) => i.categoryName || "Other"))), [catalogue]);
  const editProducts = useMemo(() => catalogue.filter((i) => i.available && (activeCategory === "All" || (i.categoryName || "Other") === activeCategory) && `${i.name} ${i.description || ""}`.toLowerCase().includes(search.toLowerCase())), [catalogue, activeCategory, search]);
  const subtotal = useMemo(() => catalogue.reduce((sum, i) => sum + (selected[i.id] || 0) * i.pricePaise, 0), [catalogue, selected]);
  const itemCount = Object.values(selected).reduce((sum, n) => sum + n, 0);
  const rawDiscount = Math.max(0, Number(discountInput) || 0);
  const discountBps = discountType === "PERCENT" ? Math.min(10000, Math.round(rawDiscount * 100)) : 0;
  const discountPaise = discountType === "PERCENT" ? Math.min(subtotal, Math.round(subtotal * discountBps / 10000)) : Math.min(subtotal, Math.round(rawDiscount * 100));
  const taxBps = Math.min(10000, Math.max(0, Math.round((Number(taxRate) || 0) * 100)));
  const taxPaise = Math.round(Math.max(0, subtotal - discountPaise) * taxBps / 10000);
  const total = subtotal - discountPaise + taxPaise;
  const o = data?.order;
  const canEdit = !!o && ["RECEIVED", "ACCEPTED"].includes(o.status);

  function changeQty(itemId: number, delta: number) {
    setSelected((v) => ({ ...v, [itemId]: Math.max(0, Math.min(100, (v[itemId] || 0) + delta)) }));
  }

  async function saveEdits() {
    if (!o) return;
    const lines = catalogue.filter((i) => (selected[i.id] || 0) > 0).map((i) => ({ menuItemId: i.id, quantity: selected[i.id], notes: lineNotes[i.id] || undefined }));
    if (!lines.length) return setError("An order must contain at least one item.");
    if (discountType === "FIXED" && discountPaise > subtotal) return setError("Discount cannot exceed subtotal.");
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/api/v1/orders/${id}/edit`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, discountType, discountPaise, discountValue: discountType === "PERCENT" ? discountBps : Math.round(rawDiscount * 100), taxRateBps: taxBps, customerName: customer.trim(), customerPhone: phone.trim(), deliveryAddress: address.trim(), orderNotes: orderNotes.trim(), paymentMethod, paymentStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Order could not be updated");
      setEditing(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save order"); }
    finally { setBusy(false); }
  }

  async function triggerPrint(type: "kot" | "invoice", batch?: number) {
    if (!o) return;
    const popup = window.open("about:blank", "_blank");
    setPrinting(type); setError("");
    try {
      const response = await fetch(`${API}/api/v1/orders/${id}/print-event`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update order status");
      if (popup) popup.location.href = `/receipt/${id}?type=${type}${batch ? `&batch=${batch}` : ""}`;
      else window.location.href = `/receipt/${id}?type=${type}${batch ? `&batch=${batch}` : ""}`;
      await load();
    } catch (e) { popup?.close(); setError(e instanceof Error ? e.message : "Print action failed"); }
    finally { setPrinting(null); }
  }

  async function addDineInRound() {
    if (!o) return;
    const lines = catalogue.filter((i) => (addQty[i.id] || 0) > 0).map((i) => ({ menuItemId: i.id, quantity: addQty[i.id] }));
    if (!lines.length) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/api/v1/orders/${id}/items`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not add items");
      setAddQty({}); setAddRound(false); await load(); await triggerPrint("kot", body.batch);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add items"); }
    finally { setBusy(false); }
  }

  async function updatePayment(value: string) {
    setPaymentStatus(value);
    const response = await fetch(`${API}/api/v1/orders/${id}/payment`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentStatus: value }) });
    if (!response.ok) { const body = await response.json(); setError(body.error || "Payment update failed"); }
    else await load();
  }

  if (!data) return <main className="min-h-screen bg-[#f5f1eb] p-8"><a href="/admin">← Dashboard</a><p className="mt-6 text-sm text-stone-500">{error || "Loading order…"}</p></main>;

  return (
    <main className="min-h-screen bg-[#f5f1eb] p-3 text-[#211d19] md:p-6">
      <div className="mx-auto max-w-[1450px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><a href="/admin/orders" className="inline-flex items-center gap-2 text-xs text-stone-500"><ArrowLeft size={14}/> All orders</a><p className="mt-3 text-[10px] font-bold uppercase tracking-[.22em] text-[#956b4c]">Order workspace · {o.source}</p><h1 className="mt-1 text-2xl font-semibold">{o.orderNumber}</h1><p className="mt-1 text-xs text-stone-500">{new Date(o.createdAt).toLocaleString("en-IN")} {data.table ? `· Table ${data.table.tableNumber}` : ""}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-4 py-2 text-xs font-semibold">{o.status}</span><span className={`rounded-full px-4 py-2 text-xs font-semibold ${o.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{o.paymentStatus}</span></div></header>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-[#e8dfd5] bg-white p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Bill items</h2><p className="text-xs text-stone-500">{data.lines.length} lines · {data.lines.reduce((n, x) => n + x.quantity, 0)} units</p></div>{canEdit && <button onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-[#dfd1c4] px-3 py-2 text-xs font-semibold text-[#805538]">{editing ? <X size={14}/> : <Pencil size={14}/>} {editing ? "Cancel edit" : "Edit order"}</button>}</div>
              {!editing ? <div className="mt-4 divide-y divide-stone-100">{data.lines.map((line) => <div key={line.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold">{line.itemNameSnapshot} <span className="font-normal text-stone-500">× {line.quantity}</span></p>{line.notes && <p className="mt-0.5 text-xs text-stone-400">{line.notes}</p>}</div><b className="shrink-0 text-sm">{money(line.unitPricePaise * line.quantity)}</b></div>)}</div> : <div className="mt-4">
                <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs">Customer name<input value={customer} onChange={(e) => setCustomer(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2.5" placeholder="Walk-in customer"/></label><label className="text-xs">Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2.5" placeholder="Phone number"/></label><label className="text-xs sm:col-span-2">Customer address<input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2.5" placeholder="Optional address"/></label></div>
                <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border px-3"><Search size={15} className="text-stone-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-xs outline-none" placeholder="Search products to add or remove…"/></label>
                <div className="mt-2 flex gap-1 overflow-x-auto pb-2"><button onClick={() => setActiveCategory("All")} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] ${activeCategory === "All" ? "bg-[#2a211b] text-white" : "bg-stone-100 text-stone-600"}`}>All</button>{categories.map((c) => <button key={c} onClick={() => setActiveCategory(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] ${activeCategory === c ? "bg-[#2a211b] text-white" : "bg-stone-100 text-stone-600"}`}>{c}</button>)}</div>
                <div className="max-h-[390px] overflow-y-auto rounded-xl border border-stone-100"><div className="divide-y divide-stone-100">{editProducts.map((item) => <div key={item.id} className="flex items-center gap-2 px-3 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.name}</p><p className="truncate text-[10px] text-stone-400">{item.description || item.categoryName} · {money(item.pricePaise)}</p></div><div className="flex items-center gap-2"><button onClick={() => changeQty(item.id, -1)} className="grid h-7 w-7 place-items-center rounded-full border"><Minus size={12}/></button><b className="w-4 text-center text-xs">{selected[item.id] || 0}</b><button onClick={() => changeQty(item.id, 1)} className="grid h-7 w-7 place-items-center rounded-full bg-[#2a211b] text-white"><Plus size={12}/></button></div></div>)}</div></div>
                <label className="mt-3 block text-xs">Kitchen / order notes<textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-stone-200 p-2.5" placeholder="Less sugar, no onion…"/></label>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div className="grid grid-cols-2 gap-2"><label className="text-xs">Discount type<select value={discountType} onChange={(e) => setDiscountType(e.target.value as "FIXED" | "PERCENT")} className="mt-1 w-full rounded-lg border p-2"><option value="FIXED">Fixed ₹</option><option value="PERCENT">Percent %</option></select></label><label className="text-xs">Discount<input type="number" min="0" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs">Tax rate %<input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs">Payment method<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="ONLINE">Online</option><option value="OTHER">Other</option></select></label></div><button disabled={busy || !itemCount} onClick={saveEdits} className="inline-flex items-center gap-2 rounded-xl bg-[#8b5737] px-5 py-3 text-xs font-semibold text-white disabled:opacity-40"><Save size={14}/>{busy ? "Saving…" : "Save bill changes"}</button></div>
              </div>}
              {!editing && <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void triggerPrint("kot")} disabled={!!printing} className="inline-flex items-center gap-2 rounded-xl bg-[#2a211b] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50"><ChefHat size={15}/>{printing === "kot" ? "Sending…" : "Print KOT · Send to kitchen"}</button><button onClick={() => void triggerPrint("invoice")} disabled={!!printing} className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-3 text-xs font-semibold disabled:opacity-50"><Printer size={15}/>{printing === "invoice" ? "Preparing…" : "Print customer invoice · Close order"}</button></div>}
              {!canEdit && <p className="mt-3 text-[10px] text-stone-400">Editing is locked after the KOT is sent to the kitchen. For an open dine-in tab, use Add items to create another KOT round.</p>}
            </div>

            {o.source === "DINE_IN" && o.paymentStatus !== "PAID" && !["COMPLETED", "CANCELLED"].includes(o.status) && <section className="rounded-2xl border border-[#e8dfd5] bg-white p-4 md:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Add another round</h2><p className="text-xs text-stone-500">Add more items to the same table bill and send a separate KOT.</p></div><button onClick={() => setAddRound((v) => !v)} className="rounded-lg border px-3 py-2 text-xs">{addRound ? "Close" : "Add items"}</button></div>{addRound && <><label className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2"><Search size={14}/><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full text-xs outline-none" placeholder="Search the menu"/></label><div className="mt-3 grid max-h-64 gap-2 overflow-auto sm:grid-cols-2">{catalogue.filter((i) => i.available && `${i.name} ${i.description || ""}`.toLowerCase().includes(search.toLowerCase())).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5"><div className="min-w-0"><p className="truncate text-xs font-medium">{item.name}</p><p className="text-[10px] text-stone-400">{money(item.pricePaise)}</p></div><div className="flex items-center gap-2"><button onClick={() => setAddQty((v) => ({ ...v, [item.id]: Math.max(0, (v[item.id] || 0) - 1) }))} className="rounded-full border px-2 py-1">−</button><b className="text-xs">{addQty[item.id] || 0}</b><button onClick={() => setAddQty((v) => ({ ...v, [item.id]: Math.min(100, (v[item.id] || 0) + 1) }))} className="rounded-full bg-[#2a211b] px-2 py-1 text-white">+</button></div></div>)}</div><button onClick={addDineInRound} disabled={busy || !Object.values(addQty).some((n) => n > 0)} className="mt-3 rounded-lg bg-[#8b5737] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Adding…" : "Save additions & print new KOT"}</button></>}</section>}

            <section className="rounded-2xl border border-[#e8dfd5] bg-white p-4 md:p-5"><h2 className="font-semibold">Order progress</h2><p className="mt-1 text-xs text-stone-500">The cashier's print actions update this automatically. No manual status buttons are needed.</p><div className="mt-5 grid grid-cols-5 gap-1">{stages.map((stage, index) => { const current = stages.indexOf(o.status); const done = o.status === "CANCELLED" ? false : current >= index; return <div key={stage} className="min-w-0"><div className={`h-1.5 rounded-full ${done ? "bg-[#8b5737]" : "bg-stone-100"}`}/><p className={`mt-2 truncate text-[9px] font-semibold ${done ? "text-[#8b5737]" : "text-stone-400"}`}>{stage === "PREPARING" ? "MAKING" : stage}</p></div>; })}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed pt-4"><div><p className="text-xs text-stone-500">Payment status</p><p className="mt-1 text-sm font-semibold">{o.paymentStatus}</p></div><select value={o.paymentStatus} onChange={(e) => void updatePayment(e.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-xs"><option value="PENDING">Pending</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option></select></div><div className="mt-4 space-y-2">{data.statusEvents.map((event) => <p key={event.id} className="text-[10px] text-stone-400">{new Date(event.createdAt).toLocaleString("en-IN")} · {event.fromStatus || "NEW"} → {event.toStatus}{event.note ? ` · ${event.note}` : ""}</p>)}</div></section>
          </section>

          <aside className="h-fit rounded-2xl border border-[#e8dfd5] bg-white p-5 xl:sticky xl:top-4"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#956b4c]">Live bill</p><h2 className="mt-1 text-lg font-semibold">{o.customerName || "Walk-in customer"}</h2><p className="mt-1 text-xs text-stone-500">{o.source}{data.table ? ` · Table ${data.table.tableNumber}` : ""} {o.customerPhone ? `· ${o.customerPhone}` : ""}</p><div className="mt-5 space-y-2 border-y border-dashed py-4 text-xs"><p className="flex justify-between"><span>Subtotal</span><b>{money(editing ? subtotal : o.subtotalPaise)}</b></p><p className="flex justify-between text-stone-500"><span>Discount</span><span>−{money(editing ? discountPaise : o.discountPaise)}</span></p><p className="flex justify-between text-stone-500"><span>Tax</span><span>{money(editing ? taxPaise : o.taxPaise)}</span></p><p className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span>{money(editing ? total : o.totalPaise)}</span></p></div><div className="mt-4 space-y-2"><p className="text-[10px] text-stone-400">Invoice number</p><p className="text-sm font-semibold">{data.invoice?.invoiceNumber || "Generated with order"}</p><p className="text-[10px] leading-relaxed text-stone-400">KOT print → Preparing / Making. Customer invoice print → Completed. Payment is tracked separately.</p></div><a href="/admin/orders" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 py-3 text-xs font-semibold"><ShoppingBag size={14}/> Back to orders</a></aside>
        </div>
      </div>
    </main>
  );
}
