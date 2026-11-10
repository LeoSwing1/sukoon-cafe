"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Search, Plus, Minus, ShoppingBag, ReceiptText, Utensils,
  Coffee, Truck, Store, Smartphone, Tag, Percent, Trash2, ChevronRight,
  X, CheckCircle2, Clock3, Filter,
} from "lucide-react";

const API = process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100");

type Item = { id: number; name: string; description?: string | null; pricePaise: number; available: boolean; categoryName?: string | null };
type Table = { id: number; tableNumber: string };
type Source = "WALK_IN" | "DINE_IN" | "TAKEAWAY" | "SWIGGY" | "ZOMATO" | "WEBSITE";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
const channels: { value: Source; label: string; note: string; icon: typeof Store }[] = [
  { value: "WALK_IN", label: "Walk-in", note: "Counter order", icon: Store },
  { value: "DINE_IN", label: "Dine-in", note: "Table service", icon: Utensils },
  { value: "TAKEAWAY", label: "Takeaway", note: "Customer pickup", icon: Coffee },
  { value: "WEBSITE", label: "Website / QR", note: "Online order entry", icon: Smartphone },
  { value: "SWIGGY", label: "Swiggy", note: "Manual entry", icon: Truck },
  { value: "ZOMATO", label: "Zomato", note: "Manual entry", icon: Truck },
];
const categoryEmoji: Record<string, string> = {
  "Cold Coffee": "🧋", "Chai & Adrak": "🫖", Maggi: "🍜", Momos: "🥟", Burgers: "🍔",
  Sandwiches: "🥪", Mojitos: "🍹", "Special Tea": "🍵", "Funny Mocktail Combos": "✨",
  "Fresh Juices": "🍊", "Soft Drinks & Water": "🥤", "Hot Coffee": "☕", "Fries & Quick Bites": "🍟",
  "Pizza & Pasta": "🍕", "Starters & Small Plates": "🍢", "Main Course": "🍛", "Desserts & Cakes": "🍰",
  "Breakfast & All Day": "🥞",
};

export default function OrdersPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [source, setSource] = useState<Source>("WALK_IN");
  const [category, setCategory] = useState("All items");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [table, setTable] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [discountInput, setDiscountInput] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [commission, setCommission] = useState("0");
  const [platformSubtotal, setPlatformSubtotal] = useState("");
  const [notes, setNotes] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(30);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${API}/api/v1/menu-items`, { credentials: "include", cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Menu could not be loaded"); return r.json(); }),
      fetch(`${API}/api/v1/tables`, { credentials: "include", cache: "no-store" }).then((r) => r.ok ? r.json() : { tables: [] }),
      fetch(`${API}/api/v1/cafe-settings`, { credentials: "include", cache: "no-store" }).then((r) => r.ok ? r.json() : { settings: {} }),
    ]).then(([menu, tableData, settings]) => {
      if (!alive) return;
      setItems(menu.items || []);
      setTables(tableData.tables || []);
      setTaxRate(String((settings.settings?.taxRateBps || 0) / 100));
      setLoadError("");
    }).catch((e) => { if (alive) setLoadError(e instanceof Error ? e.message : "Could not load POS data"); });
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => Array.from(new Set(items.filter((i) => i.available).map((i) => i.categoryName || "Cafe favourites"))), [items]);
  const categoryCounts = useMemo(() => items.filter((i) => i.available).reduce<Record<string, number>>((acc, item) => { const key = item.categoryName || "Cafe favourites"; acc[key] = (acc[key] || 0) + 1; return acc; }, {}), [items]);
  const filtered = useMemo(() => items.filter((item) => item.available && (category === "All items" || (item.categoryName || "Cafe favourites") === category) && `${item.name} ${item.description || ""} ${item.categoryName || ""}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [items, category, search]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (selected[item.id] || 0) * item.pricePaise, 0), [items, selected]);
  const quantityCount = Object.values(selected).reduce((sum, qty) => sum + qty, 0);
  const rawDiscount = Math.max(0, Number(discountInput) || 0);
  const discountBps = discountType === "PERCENT" ? Math.min(10000, Math.round(rawDiscount * 100)) : 0;
  const discountPaise = discountType === "PERCENT" ? Math.min(subtotal, Math.round(subtotal * discountBps / 10000)) : Math.min(subtotal, Math.round(rawDiscount * 100));
  const taxBps = Math.max(0, Math.min(10000, Math.round((Number(taxRate) || 0) * 100)));
  const taxPaise = Math.round(Math.max(0, subtotal - discountPaise) * taxBps / 10000);
  const total = subtotal - discountPaise + taxPaise;
  const platformOrder = source === "SWIGGY" || source === "ZOMATO";

  function changeQty(id: number, delta: number) {
    setSelected((current) => ({ ...current, [id]: Math.max(0, Math.min(100, (current[id] || 0) + delta)) }));
  }
  function selectChannel(value: Source) { setSource(value); setTable(""); setNotice(""); }

  async function createOrder() {
    setNotice("");
    const lines = items.filter((item) => (selected[item.id] || 0) > 0).map((item) => ({ menuItemId: item.id, quantity: selected[item.id] }));
    if (!lines.length) return setNotice("Add at least one item to the bill.");
    if (source === "DINE_IN" && !table) return setNotice("Select a table for dine-in.");
    if (platformOrder && !platformId.trim()) return setNotice(`Enter the ${source} order ID.`);
    if (platformOrder && !customer.trim()) return setNotice("Enter the customer name for this platform order.");
    if (discountType === "FIXED" && discountPaise > subtotal) return setNotice("Discount cannot exceed the subtotal.");
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/orders`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source, tableId: (source === "DINE_IN" || source === "WALK_IN") && table ? Number(table) : undefined,
          externalPlatformOrderId: platformId.trim() || undefined, customerName: customer.trim() || undefined,
          customerPhone: phone.trim() || undefined, deliveryAddress: address.trim() || undefined,
          paymentMethod, paymentStatus, taxRateBps: taxBps, discountPaise,
          discountType, discountValue: discountType === "PERCENT" ? discountBps : Math.round(rawDiscount * 100),
          platformSubtotalPaise: platformOrder && platformSubtotal !== "" ? Math.round(Number(platformSubtotal) * 100) : undefined,
          platformCommissionPaise: platformOrder ? Math.round((Number(commission) || 0) * 100) : 0,
          orderNotes: notes.trim() || undefined, lines,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Order could not be created");
      const orderId = Number(data.order?.id ?? data.orderId ?? data.id);
      if (!Number.isInteger(orderId) || orderId < 1) throw new Error("Order was saved, but no order ID was returned. Open Recent orders.");
      window.location.href = `/admin/orders/${orderId}`;
    } catch (e) { setNotice(e instanceof Error ? e.message : "Order creation failed"); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#f5f1eb] px-3 py-4 text-[#211d19] md:px-6 md:py-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><a href="/admin" className="inline-flex items-center gap-2 text-xs font-medium text-stone-500"><ArrowLeft size={14}/> Dashboard</a><p className="mt-3 text-[10px] font-bold uppercase tracking-[.25em] text-[#956b4c]">Sukoon Diaries · Billing terminal</p><h1 className="mt-1 text-2xl font-semibold md:text-3xl">New order</h1></div>
          <div className="flex items-center gap-2 rounded-full border border-[#e7ddd2] bg-white px-3 py-2 text-xs text-stone-500"><Clock3 size={14}/> Quick billing · Live menu</div>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {channels.map(({ value, label, note, icon: Icon }) => <button key={value} type="button" onClick={() => selectChannel(value)} className={`flex min-h-[76px] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${source === value ? "border-[#8b5e3c] bg-[#2a211b] text-white shadow-md" : "border-[#e8dfd5] bg-white hover:border-[#bd9b7e]"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${source === value ? "bg-white/10 text-[#e3c4a7]" : "bg-[#f5eee7] text-[#8b5e3c]"}`}><Icon size={17}/></span><span className="min-w-0"><b className="block text-sm">{label}</b><small className={`mt-1 block text-[10px] ${source === value ? "text-white/55" : "text-stone-400"}`}>{note}</small></span></button>)}
        </section>

        {loadError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
        <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-[#e8dfd5] bg-white shadow-sm">
            <div className="border-b border-[#eee7df] p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Choose products</h2><p className="text-xs text-stone-500">Search by name or jump straight to a category.</p></div><span className="rounded-full bg-[#f6f0e9] px-3 py-1.5 text-xs text-stone-600">{items.filter((i) => i.available).length} products</span></div>
              <label className="mt-4 flex h-12 items-center gap-3 rounded-xl border border-[#e5ddd4] bg-[#fcfaf7] px-4 focus-within:border-[#9b6b49] focus-within:ring-2 focus-within:ring-[#9b6b49]/10"><Search size={18} className="shrink-0 text-[#9b6b49]"/><input value={search} onChange={(e) => { setSearch(e.target.value); setLimit(30); if (e.target.value) setCategory("All items"); }} placeholder="Search coffee, momos, burger…" className="w-full bg-transparent text-sm outline-none"/><kbd className="hidden rounded border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-400 sm:block">⌘ K</kbd>{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={16}/></button>}</label>
            </div>
            <div className="grid min-h-[620px] lg:grid-cols-[190px_minmax(0,1fr)]">
              <nav className="border-b border-[#eee7df] bg-[#fcfaf7] p-3 lg:border-b-0 lg:border-r">
                <button onClick={() => { setCategory("All items"); setLimit(30); }} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${category === "All items" ? "bg-[#2a211b] font-semibold text-white" : "text-stone-600 hover:bg-white"}`}><span>All items</span><span className="text-[10px] opacity-70">{items.filter((i) => i.available).length}</span></button>
                <div className="flex gap-1 overflow-x-auto pb-1 lg:block lg:overflow-visible">{groups.map((group) => <button key={group} onClick={() => { setCategory(group); setLimit(30); }} className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition lg:mb-1 lg:w-full ${category === group ? "bg-[#efe3d7] font-semibold text-[#6d432a]" : "text-stone-600 hover:bg-white"}`}><span className="flex items-center gap-2"><span>{categoryEmoji[group] || "🍽️"}</span><span>{group}</span></span><span className="text-[10px] text-stone-400">{categoryCounts[group] || 0}</span></button>)}</div>
              </nav>
              <div className="min-w-0 p-3 md:p-4">
                <div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a07858]">Menu catalogue</p><h3 className="mt-1 text-lg font-semibold">{category === "All items" ? "All favourites" : category}</h3></div><span className="text-xs text-stone-400">{filtered.length} results</span></div>
                <div className="divide-y divide-[#f0ebe5]">
                  {filtered.slice(0, limit).map((item) => <article key={item.id} className="flex min-h-[76px] items-center gap-3 py-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f5eee7] text-xl">{categoryEmoji[item.categoryName || ""] || "🍽️"}</span>
                    <div className="min-w-0 flex-1"><h4 className="truncate text-sm font-semibold">{item.name}</h4><p className="mt-0.5 truncate text-[11px] text-stone-500">{item.description || item.categoryName || "Made fresh at Sukoon"}</p><p className="mt-1 text-xs font-semibold text-[#8b5e3c]">{money(item.pricePaise)}</p></div>
                    <div className="flex shrink-0 items-center gap-2">{(selected[item.id] || 0) > 0 && <><button onClick={() => changeQty(item.id, -1)} className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 text-stone-600" aria-label={`Remove ${item.name}`}><Minus size={14}/></button><span className="w-4 text-center text-xs font-bold">{selected[item.id]}</span></>}<button onClick={() => changeQty(item.id, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-[#2a211b] text-white shadow-sm hover:bg-[#8b5e3c]" aria-label={`Add ${item.name}`}><Plus size={15}/></button></div>
                  </article>)}
                </div>
                {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-stone-200 p-10 text-center"><Filter className="mx-auto text-stone-300"/><p className="mt-2 text-sm font-medium">No matching products</p><p className="mt-1 text-xs text-stone-400">Try another search or category.</p><button onClick={() => { setSearch(""); setCategory("All items"); }} className="mt-3 text-xs font-semibold text-[#8b5e3c]">Clear filters</button></div>}
                {filtered.length > limit && <button onClick={() => setLimit((v) => v + 30)} className="mt-4 w-full rounded-xl border border-[#e8dfd5] py-3 text-xs font-semibold text-[#8b5e3c] hover:bg-[#fcfaf7]">Show {Math.min(30, filtered.length - limit)} more products</button>}
              </div>
            </div>
          </section>

          <aside className="overflow-hidden rounded-3xl border border-[#e8dfd5] bg-white shadow-sm 2xl:sticky 2xl:top-4">
            <div className="flex items-center justify-between bg-[#2a211b] px-5 py-4 text-white"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d8b99a]">Current bill</p><h2 className="mt-1 text-lg font-semibold">Order summary</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{quantityCount} items</span></div>
            <div className="max-h-[300px] space-y-3 overflow-y-auto p-4">
              {items.filter((item) => selected[item.id] > 0).map((item) => <div key={item.id} className="flex items-center gap-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.name}</p><p className="text-[10px] text-stone-400">{money(item.pricePaise)} each</p></div><div className="flex items-center gap-1 rounded-full border border-stone-200 p-1"><button onClick={() => changeQty(item.id, -1)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-stone-100"><Minus size={12}/></button><span className="w-4 text-center text-xs font-bold">{selected[item.id]}</span><button onClick={() => changeQty(item.id, 1)} className="grid h-6 w-6 place-items-center rounded-full bg-[#2a211b] text-white"><Plus size={12}/></button></div><b className="w-16 text-right text-xs">{money(item.pricePaise * selected[item.id])}</b></div>)}
              {!quantityCount && <div className="rounded-2xl bg-[#faf7f3] p-6 text-center"><ShoppingBag className="mx-auto text-[#b99a7d]"/><p className="mt-2 text-sm font-medium">Bill is empty</p><p className="mt-1 text-xs text-stone-400">Tap + on a product to add it.</p></div>}
            </div>
            <div className="space-y-3 border-t border-[#eee7df] p-4">
              <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs font-semibold"><Tag size={14} className="text-[#9b6b49]"/> Discount</label><div className="flex gap-1"><select value={discountType} onChange={(e) => setDiscountType(e.target.value as "FIXED" | "PERCENT")} className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"><option value="FIXED">₹</option><option value="PERCENT">%</option></select><input type="number" min="0" max={discountType === "PERCENT" ? 100 : undefined} step="0.01" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-right text-xs"/></div></div>
              <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs font-semibold"><Percent size={14} className="text-[#9b6b49]"/> Tax rate</label><div className="flex items-center gap-1"><input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-right text-xs"/><span className="text-xs text-stone-400">%</span></div></div>
              <div className="border-t border-dashed border-stone-200 pt-3 text-xs"><p className="flex justify-between text-stone-500"><span>Subtotal</span><span>{money(subtotal)}</span></p><p className="mt-2 flex justify-between text-stone-500"><span>Discount</span><span>−{money(discountPaise)}</span></p><p className="mt-2 flex justify-between text-stone-500"><span>Tax</span><span>{money(taxPaise)}</span></p><p className="mt-3 flex justify-between text-lg font-bold"><span>Total due</span><span>{money(total)}</span></p></div>
              <button onClick={() => setShowCustomer((v) => !v)} className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-xs font-semibold"><span>Customer & order details</span><ChevronRight size={14} className={`transition ${showCustomer ? "rotate-90" : ""}`}/></button>
              {showCustomer && <div className="space-y-2 rounded-xl bg-[#fcfaf7] p-3">
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer / pickup name" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"/>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"/>
                {(source === "DINE_IN" || source === "WALK_IN") && <select value={table} onChange={(e) => setTable(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"><option value="">{source === "DINE_IN" ? "Select table *" : "Optional table"}</option>{tables.map((t) => <option key={t.id} value={t.id}>Table {t.tableNumber}</option>)}</select>}
                {platformOrder && <><input value={platformId} onChange={(e) => setPlatformId(e.target.value)} placeholder={`${source} order ID *`} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"/><input type="number" min="0" step="0.01" value={platformSubtotal} onChange={(e) => setPlatformSubtotal(e.target.value)} placeholder="Platform order value ₹" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"/><input type="number" min="0" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="Platform fee ₹" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"/></>}
                {source === "TAKEAWAY" && <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Pickup / delivery note" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"/>}
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Order notes for kitchen" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"/>
                <div className="grid grid-cols-2 gap-2"><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs"><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="ONLINE">Online</option><option value="SWIGGY">Swiggy</option><option value="ZOMATO">Zomato</option><option value="OTHER">Other</option></select><select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs"><option value="PENDING">Payment pending</option><option value="PAID">Paid</option><option value="PARTIAL">Partial</option></select></div>
              </div>}
              {notice && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{notice}</p>}
              <button disabled={busy || !quantityCount || (source === "DINE_IN" && !table)} onClick={createOrder} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5737] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#704329] disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Creating bill…" : <><ReceiptText size={16}/> Create bill & open order <ChevronRight size={15}/></>}</button>
              <p className="text-center text-[10px] leading-relaxed text-stone-400">Order stays editable until KOT is sent. Printing the KOT moves it to Preparing.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
