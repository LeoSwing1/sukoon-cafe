"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  MapPin,
  Minus,
  PartyPopper,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";

const API = process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100");

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  pricePaise: number;
  categoryName: string | null;
  available?: boolean;
};

type Table = { id: number; tableNumber: string };
type CafeSettings = {
  cafeName?: string;
  tagline?: string;
  address?: string;
  openingHours?: string;
  phone?: string;
};
type SortMode = "featured" | "price-low" | "price-high" | "name";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

const categoryArt: Record<string, { emoji: string; hint: string }> = {
  "Cold Coffee": { emoji: "🧋", hint: "Chilled favourites" },
  "Chai & Adrak": { emoji: "🫖", hint: "Comfort in a cup" },
  Maggi: { emoji: "🍜", hint: "Quick comfort food" },
  Momos: { emoji: "🥟", hint: "Steamed & crispy" },
  Burgers: { emoji: "🍔", hint: "Big bites, big mood" },
  Sandwiches: { emoji: "🥪", hint: "Toasted goodness" },
  Mojitos: { emoji: "🍹", hint: "Fresh & fizzy" },
  "Special Tea": { emoji: "🍵", hint: "Slow sips" },
  "Funny Mocktail Combos": { emoji: "✨", hint: "Made for sharing" },
  "Fresh Juices": { emoji: "🍊", hint: "Freshly squeezed" },
  "Soft Drinks & Water": { emoji: "🥤", hint: "Chilled refreshment" },
  "Hot Coffee": { emoji: "☕", hint: "Freshly brewed" },
  "Fries & Quick Bites": { emoji: "🍟", hint: "Snack o'clock" },
  "Pizza & Pasta": { emoji: "🍕", hint: "Comfort classics" },
  "Starters & Small Plates": { emoji: "🍢", hint: "A little first bite" },
  "Main Course": { emoji: "🍛", hint: "Proper comfort meals" },
  "Desserts & Cakes": { emoji: "🍰", hint: "A sweet ending" },
  "Breakfast & All Day": { emoji: "🥞", hint: "Good mornings, all day" },
  "Cafe favourites": { emoji: "🍽️", hint: "Something lovely" },
};

const productAccents = ["bg-[#f5e5d7]", "bg-[#e8eee1]", "bg-[#f6e8e8]", "bg-[#eee8f4]"];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [cafe, setCafe] = useState<CafeSettings>({ cafeName: "Sukoon Cafe", tagline: "A little pause. A little sukoon." });
  const [error, setError] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [tableId, setTableId] = useState<number | null>(null);
  const [tableToken, setTableToken] = useState("");
  const [mode, setMode] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // An empty category means the category discovery screen, not all 99 products.
  const [active, setActive] = useState("");
  const [search, setSearch] = useState("");
  const [under100, setUnder100] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("featured");
  const [visibleCount, setVisibleCount] = useState(12);
  const [showMobileCart, setShowMobileCart] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = Number(params.get("table"));
    if (Number.isInteger(table) && table > 0) {
      setTableId(table);
      setTableToken(params.get("token") || "");
      setMode("DINE_IN");
    } else if (params.get("mode") === "walk-in") {
      setMode("TAKEAWAY");
    }

    let alive = true;
    const sync = async () => {
      try {
        const [menuResponse, settingsResponse, tablesResponse] = await Promise.all([
          fetch(`${API}/api/v1/menu-items`, { credentials: "include", cache: "no-store" }),
          fetch(`${API}/api/v1/cafe-settings`, { credentials: "include", cache: "no-store" }),
          fetch(`${API}/api/v1/tables`, { credentials: "include", cache: "no-store" }),
        ]);
        if (!menuResponse.ok) throw new Error("Menu request failed");
        const [menuData, settingsData, tableData] = await Promise.all([
          menuResponse.json(),
          settingsResponse.ok ? settingsResponse.json() : Promise.resolve({ settings: {} }),
          tablesResponse.ok ? tablesResponse.json() : Promise.resolve({ tables: [] }),
        ]);
        if (alive) {
          setItems(menuData.items || []);
          setCafe((current) => ({ ...current, ...(settingsData.settings || {}) }));
          setTables(tableData.tables || []);
          setError("");
        }
      } catch {
        if (alive) setError("The menu is temporarily unavailable. Please ask our team for today’s menu.");
      }
    };

    void sync();
    const timer = window.setInterval(() => void sync(), 30000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const groups = useMemo(
    () => Array.from(new Set(items.map((item) => item.categoryName || "Cafe favourites"))),
    [items],
  );
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const category = item.categoryName || "Cafe favourites";
      counts[category] = (counts[category] || 0) + 1;
    }
    return counts;
  }, [items]);
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (cart[item.id] || 0) * item.pricePaise, 0),
    [items, cart],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = items.filter((item) => {
      const category = item.categoryName || "Cafe favourites";
      const matchesCategory = query.length > 0 || active === "All" || category === active;
      const matchesSearch = !query || `${item.name} ${item.description || ""} ${category}`.toLowerCase().includes(query);
      const matchesPrice = !under100 || item.pricePaise < 10000;
      return matchesCategory && matchesSearch && matchesPrice && item.available !== false;
    });

    if (sortMode === "price-low") result = [...result].sort((a, b) => a.pricePaise - b.pricePaise);
    if (sortMode === "price-high") result = [...result].sort((a, b) => b.pricePaise - a.pricePaise);
    if (sortMode === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [items, active, search, under100, sortMode]);

  const isDiscovery = !active && !search.trim();
  const visibleItems = filteredItems.slice(0, visibleCount);
  const activeTitle = search.trim() ? "Search results" : active === "All" ? "Everything on the menu" : active;

  function chooseCategory(category: string) {
    setActive(category);
    setSearch("");
    setVisibleCount(12);
    setUnder100(false);
  }

  function updateQuantity(itemId: number, change: number) {
    setCart((current) => ({ ...current, [itemId]: Math.max(0, (current[itemId] || 0) + change) }));
  }

  async function placeOrder() {
    setNotice("");
    if (!cartCount) {
      setNotice("Please add an item to your order.");
      return;
    }
    if (mode === "DINE_IN" && (!tableId || !tableToken)) {
      setNotice("Please scan the QR code on your table to place a dine-in order.");
      return;
    }
    if (mode === "TAKEAWAY" && !customer.trim()) {
      setNotice("Please enter your name.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/orders`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: mode,
          tableId: tableId || undefined,
          tableToken: tableToken || undefined,
          customerName: customer.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          deliveryAddress: address.trim() || undefined,
          lines: items
            .filter((item) => (cart[item.id] || 0) > 0)
            .map((item) => ({ menuItemId: item.id, quantity: cart[item.id] })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Order could not be placed");
      setNotice(`Order request received: ${data.order.orderNumber}. It is NOT confirmed until the cafe team accepts it.`);
      setCart({});
      setShowMobileCart(false);
      window.sessionStorage.setItem("sukoon.lastOrderNumber", data.order.orderNumber);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Unable to place order");
    } finally {
      setBusy(false);
    }
  }

  const orderPanel = (
    <div className="rounded-[1.6rem] border border-[#e8ded3] bg-white p-5 shadow-[0_8px_30px_rgba(52,39,27,.06)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[.2em] text-[#9b6b49]">YOUR ORDER</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#f5eee7] px-3 py-1 text-xs">{cartCount} items</span>
          <button onClick={() => setShowMobileCart(false)} className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-600 lg:hidden" aria-label="Close basket"><X size={16} /></button>
        </div>
      </div>

      {cartCount ? (
        <div className="mt-4 max-h-48 space-y-3 overflow-y-auto">
          {items.filter((item) => cart[item.id] > 0).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0"><p className="truncate font-medium">{item.name}</p><p className="text-xs text-stone-500">{money(item.pricePaise)} × {cart[item.id]}</p></div>
              <div className="flex shrink-0 items-center gap-2"><button onClick={() => updateQuantity(item.id, -1)} className="grid h-7 w-7 place-items-center rounded-full border border-stone-300" aria-label={`Remove one ${item.name}`}><Minus size={13} /></button><span className="w-4 text-center text-xs">{cart[item.id]}</span><button onClick={() => updateQuantity(item.id, 1)} className="grid h-7 w-7 place-items-center rounded-full bg-[#28221e] text-white" aria-label={`Add one ${item.name}`}><Plus size={13} /></button></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-[#faf7f3] p-5 text-center"><span className="text-3xl">🛍️</span><p className="mt-2 text-sm font-medium">Your basket is taking a little pause.</p><p className="mt-1 text-xs text-stone-500">Add something lovely from the menu.</p></div>
      )}

      <label className="mt-5 block text-sm font-medium">How would you like to enjoy it?
        <select value={mode} onChange={(event) => { setMode(event.target.value as "DINE_IN" | "TAKEAWAY"); if (event.target.value !== "DINE_IN") setTableId(null); }} className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm">
          <option value="DINE_IN">Dine in{tableToken ? " · Table service" : " · Scan table QR"}</option>
          <option value="TAKEAWAY">Takeaway</option>
        </select>
      </label>
      {mode === "DINE_IN" && <div className="mt-3 rounded-xl bg-[#e8eee1] p-3 text-sm text-[#3d6042]">{tableToken ? `Dine-in order · Table ${tables.find((table) => table.id === tableId)?.tableNumber || tableId}` : "Scan the QR code placed on your table to enable dine-in ordering."}</div>}
      <div className="mt-3 space-y-3">
        <label className="block text-sm">Your name<input value={customer} onChange={(event) => setCustomer(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 p-3 text-sm" placeholder="Name" /></label>
        <label className="block text-sm">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 p-3 text-sm" placeholder="Mobile number" inputMode="tel" /></label>
        {mode === "TAKEAWAY" && <p className="text-xs text-stone-500">Your order will be prepared for collection at the cafe.</p>}
      </div>
      <div className="mt-5 border-t border-dashed border-stone-300 pt-4"><div className="flex justify-between text-sm text-stone-500"><span>Subtotal</span><span>{money(total)}</span></div><div className="mt-2 flex justify-between text-xl font-bold"><span>Total</span><span>{money(total)}</span></div></div>
      <button disabled={!cartCount || busy} onClick={placeOrder} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#28221e] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#8c5736] disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Sending order…" : <><CheckCircle2 size={17} /> Place order</>}</button>
      {notice && <p role="status" className="mt-3 rounded-xl bg-[#f5eee7] p-3 text-sm">{notice}</p>}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-stone-400">Dine-in orders are linked to your table. Takeaway requests are confirmed by the cafe team before preparation.</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f7f3ed] pb-24 text-[#28221e] lg:pb-0">
      <header className="border-b border-[#e8ded3] bg-[#fbf8f4]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 md:px-8 md:py-4">
          <a href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#28221e] text-lg text-[#f7e7d7]">S</span><span><b className="block text-xs tracking-[.22em] md:text-sm">SUKOON DIARIES</b><small className="text-[10px] text-stone-500 md:text-xs">CAFE · LUCKNOW</small></span></a>
          <div className="flex items-center gap-2 md:gap-3"><a href="/track-order" className="hidden rounded-full border border-stone-300 px-4 py-2 text-sm sm:inline-flex">Track order</a><a href="/book-event" className="hidden items-center rounded-full border border-stone-300 px-4 py-2 text-sm md:inline-flex"><PartyPopper size={15} className="mr-2" /> Plan a celebration</a><a href="/" className="text-xs text-stone-500 md:text-sm"><ArrowLeft className="mr-1 inline" size={14} /> Home</a></div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#28221e] text-white">
        <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -right-5 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-7 md:flex-row md:items-end md:justify-between md:px-8 md:py-10">
          <div><p className="text-[10px] tracking-[.3em] text-[#d7b99d] md:text-xs">SIP · EAT · GOSSIP · REPEAT</p><h1 className="mt-2 text-3xl font-medium leading-tight md:text-5xl">A little pause. <span className="font-serif italic text-[#d7b99d]">A little sukoon.</span></h1><p className="mt-2 max-w-xl text-sm text-white/65">{cafe.tagline || "Good food, good mood. Find your favourite and make the moment yours."}</p></div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/65 md:max-w-sm md:justify-end"><span className="flex items-center gap-1.5"><MapPin size={14} />{cafe.address || "Lucknow"}</span><span className="flex items-center gap-1.5"><Clock size={14} />{cafe.openingHours || "Ask us for today’s hours"}</span>{cafe.phone && <span className="flex items-center gap-1.5"><Phone size={14} />{cafe.phone}</span>}</div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-8 md:py-8">
        {tableId && <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e8eee1] px-4 py-2 text-sm text-[#3d6042]"><CheckCircle2 size={16} /> You’re ordering for Table {tables.find((table) => table.id === tableId)?.tableNumber || tableId}</div>}

        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-[10px] font-semibold tracking-[.25em] text-[#9b6b49]">MADE WITH LOVE</p><h2 className="mt-1 text-2xl font-semibold md:text-3xl">Find your kind of sukoon.</h2><p className="mt-1 text-sm text-stone-500">Search a craving or pick a category to get started.</p><p className="mt-2 text-xs font-medium text-[#9b6b49]">{items.length} menu favourites <span className="px-1 text-stone-300">·</span> {groups.length} categories</p></div>
          <label className="flex w-full items-center gap-3 rounded-2xl border border-[#e8ded3] bg-white px-4 py-3.5 shadow-sm focus-within:border-[#b58b69] focus-within:ring-2 focus-within:ring-[#b58b69]/10 xl:max-w-md"><Search size={18} className="shrink-0 text-[#9b6b49]" /><input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(12); }} placeholder="Search coffee, momos, Maggi…" className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400" /><kbd className="hidden rounded-md bg-stone-100 px-2 py-1 text-[10px] text-stone-400 sm:inline">MENU</kbd>{search && <button onClick={() => setSearch("")} className="text-stone-400" aria-label="Clear search"><X size={16} /></button>}</label>
        </div>

        {tableToken && <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e8eee1] px-3 py-1.5 text-xs text-[#3d6042]"><CheckCircle2 size={14} /> Table QR verified</div>}
        {error && <p role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-[205px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_330px]">
          <aside className="hidden lg:block">
            <div className="sticky top-5 rounded-[1.5rem] border border-[#e8ded3] bg-white p-3 shadow-sm">
              <p className="px-3 pb-3 pt-2 text-[10px] font-bold tracking-[.2em] text-[#9b6b49]">BROWSE MENU</p>
              <button onClick={() => chooseCategory("All")} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${active === "All" ? "bg-[#28221e] text-white" : "text-stone-600 hover:bg-[#f7f3ed]"}`}><span>All items</span><span className="text-[10px] opacity-70">{items.length}</span></button>
              {groups.map((group) => <button key={group} onClick={() => chooseCategory(group)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${active === group ? "bg-[#eee2d5] font-semibold text-[#70482f]" : "text-stone-600 hover:bg-[#faf7f3]"}`}><span className="text-base">{categoryArt[group]?.emoji || "🍽️"}</span><span className="min-w-0 flex-1 truncate">{group}</span><span className="text-[10px] text-stone-400">{categoryCounts[group]}</span></button>)}
              <div className="mt-3 border-t border-stone-100 pt-3"><button onClick={() => { setActive(""); setSearch(""); setUnder100(false); }} className="w-full rounded-xl bg-[#f7f3ed] px-3 py-2.5 text-xs font-semibold text-[#70482f]">Browse categories</button></div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="sticky top-0 z-30 -mx-4 mb-5 border-y border-[#e8ded3] bg-[#f7f3ed]/95 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="flex gap-2 overflow-x-auto pb-0.5 lg:hidden">
                <button onClick={() => chooseCategory("")} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-medium ${!active && !search ? "bg-[#28221e] text-white" : "border border-stone-300 bg-white text-stone-600"}`}>Categories</button>
                <button onClick={() => chooseCategory("All")} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-medium ${active === "All" ? "bg-[#28221e] text-white" : "border border-stone-300 bg-white text-stone-600"}`}>All items</button>
                {groups.map((group) => <button key={group} onClick={() => chooseCategory(group)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-medium ${active === group ? "bg-[#28221e] text-white" : "border border-stone-300 bg-white text-stone-600"}`}><span>{categoryArt[group]?.emoji || "🍽️"}</span>{group}</button>)}
              </div>
              {!isDiscovery && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 lg:mt-0 lg:mb-4"><div><p className="text-lg font-semibold md:text-xl">{activeTitle}</p><p className="text-xs text-stone-500">{filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}{search.trim() ? " found across the menu" : " in this selection"}</p></div><div className="flex items-center gap-2"><button onClick={() => setUnder100((value) => !value)} className={`rounded-full border px-3 py-2 text-[11px] font-medium ${under100 ? "border-[#8c5736] bg-[#eee2d5] text-[#70482f]" : "border-stone-300 bg-white text-stone-600"}`}>Under ₹100</button><label className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-2 text-[11px] text-stone-600"><ArrowUpDown size={13} /><select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="max-w-[112px] bg-transparent outline-none"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name A–Z</option></select></label></div></div>}
            </div>

            {isDiscovery ? (
              <div>
                <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold tracking-[.22em] text-[#9b6b49]">PICK A MOOD</p><h3 className="mt-1 text-lg font-semibold">Explore by category</h3></div><span className="text-xs text-stone-400">{groups.length} collections</span></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
                  {groups.map((group, index) => <button key={group} onClick={() => chooseCategory(group)} className="group flex min-h-[92px] items-center gap-3 rounded-2xl border border-[#e9e0d7] bg-white p-3 text-left shadow-[0_3px_14px_rgba(52,39,27,.035)] transition hover:-translate-y-0.5 hover:border-[#c7a17e] hover:shadow-md"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${productAccents[index % productAccents.length]} text-2xl`}>{categoryArt[group]?.emoji || "🍽️"}</span><span className="min-w-0 flex-1"><b className="block text-xs leading-snug md:text-sm">{group}</b><small className="mt-1 block text-[10px] text-stone-500">{categoryCounts[group]} choices</small></span><span className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#8c5736]">›</span></button>)}
                </div>
                <button onClick={() => chooseCategory("All")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d7c5b4] bg-[#eee2d5] px-5 py-3.5 text-sm font-semibold text-[#70482f] transition hover:bg-[#e7d5c4]"><SlidersHorizontal size={16} /> Browse all {items.length} items</button>
              </div>
            ) : (
              <>
                {search.trim() && <div className="mb-4 flex items-center justify-between rounded-xl bg-[#eee8df] px-4 py-3 text-xs text-stone-600"><span>Showing matches from every category</span><button onClick={() => { setSearch(""); setVisibleCount(12); }} className="font-semibold text-[#8c5736]">Clear search</button></div>}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                  {visibleItems.map((item, index) => {
                    const quantity = cart[item.id] || 0;
                    const category = item.categoryName || "Cafe favourites";
                    return <article key={item.id} className="group flex min-w-0 flex-col rounded-[1.35rem] border border-[#e9e0d7] bg-white p-3 shadow-[0_4px_18px_rgba(52,39,27,.045)] transition hover:-translate-y-0.5 hover:border-[#c7a17e] hover:shadow-lg sm:p-4">
                      <div className="relative mb-3 flex aspect-[1.55/1] items-center justify-center overflow-hidden rounded-xl bg-[#faf6f0]"><div className={`absolute inset-0 opacity-60 ${productAccents[index % productAccents.length]}`} /><span className="relative text-5xl drop-shadow-sm transition duration-300 group-hover:scale-110">{categoryArt[category]?.emoji || "🍽️"}</span><span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#8c5736]">{category}</span></div>
                      <div className="flex flex-1 flex-col"><h3 className="min-h-[2.5rem] text-xs font-semibold leading-snug sm:text-sm">{item.name}</h3><p className="mt-1 line-clamp-2 min-h-[2rem] text-[10px] leading-relaxed text-stone-500 sm:text-xs">{item.description || "Made fresh at Sukoon Cafe."}</p><div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-stone-200 pt-3"><b className="text-sm text-[#8c5736] sm:text-base">{money(item.pricePaise)}</b>{quantity > 0 ? <div className="flex items-center gap-1 rounded-full bg-[#28221e] p-1 text-white"><button onClick={() => updateQuantity(item.id, -1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15" aria-label={`Remove ${item.name}`}><Minus size={13} /></button><span className="w-4 text-center text-xs font-semibold">{quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15" aria-label={`Add ${item.name}`}><Plus size={13} /></button></div> : <button onClick={() => updateQuantity(item.id, 1)} className="flex items-center gap-1 rounded-full border border-[#b78e6c] px-3 py-1.5 text-[11px] font-bold text-[#70482f] transition hover:bg-[#28221e] hover:text-white"><Plus size={13} /> Add</button>}</div></div>
                    </article>;
                  })}
                </div>
                {!filteredItems.length && <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center"><span className="text-4xl">🍽️</span><h3 className="mt-3 text-lg font-semibold">No matches just yet</h3><p className="mt-1 text-sm text-stone-500">Try another search or change your filters.</p><button onClick={() => { setActive(""); setSearch(""); setUnder100(false); setSortMode("featured"); }} className="mt-4 rounded-full bg-[#28221e] px-5 py-2.5 text-sm text-white">Back to categories</button></div>}
                {filteredItems.length > visibleCount && <button onClick={() => setVisibleCount((count) => count + 12)} className="mt-5 w-full rounded-2xl border border-[#d7c5b4] bg-white px-5 py-3.5 text-sm font-semibold text-[#70482f] transition hover:bg-[#eee2d5]">Show {Math.min(12, filteredItems.length - visibleCount)} more items <span className="ml-1 text-xs font-normal text-stone-400">({filteredItems.length - visibleCount} remaining)</span></button>}
              </>
            )}

            <div className="mt-8 rounded-3xl bg-gradient-to-r from-[#eee5da] to-[#e5d8ca] p-5 sm:p-6"><p className="flex items-center gap-2 text-sm font-semibold"><span>✨</span> Made for your mood</p><p className="mt-2 text-xs leading-relaxed text-stone-600 sm:text-sm">Ask our team about ingredients, spice levels and customisation. Availability may change during the day.</p></div>
          </section>

          <aside className="hidden h-fit xl:sticky xl:top-5 xl:block">{orderPanel}</aside>
        </div>

        <section className="mt-10 grid gap-4 rounded-3xl bg-[#28221e] p-6 text-white md:grid-cols-2 md:p-7"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#d5b99d]">COME FIND YOUR SUKOON</p><h2 className="mt-2 text-2xl">{cafe.cafeName || "Sukoon Cafe"}</h2><p className="mt-3 flex gap-2 text-sm text-white/75"><MapPin size={16} />{cafe.address || "Address to be updated"}</p><p className="mt-2 flex gap-2 text-sm text-white/75"><Clock size={16} />{cafe.openingHours || "Opening hours to be updated"}</p>{cafe.phone && <p className="mt-2 text-sm text-white/75">Call: {cafe.phone}</p>}</div><div className="flex flex-col justify-center gap-3"><a href="/track-order" className="rounded-full border border-white/30 px-5 py-3 text-center text-sm">Track order</a><a href="/book-event" className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-[#28221e]">Plan a birthday or party</a><a href="/" className="rounded-full border border-white/30 px-5 py-3 text-center text-sm">Cafe story & gallery</a></div></section>
        <footer className="py-8 text-center text-[10px] tracking-[.2em] text-stone-400">SUKOON DIARIES · GOOD FOOD, GOOD MOOD</footer>
      </div>

      {cartCount > 0 && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8ded3] bg-[#fbf8f4]/95 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_-8px_30px_rgba(52,39,27,.12)] backdrop-blur xl:hidden"><button onClick={() => setShowMobileCart(true)} className="flex w-full items-center justify-between rounded-2xl bg-[#28221e] px-4 py-3.5 text-left text-white"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><ShoppingBag size={17} /></span><span><b className="block text-sm">{cartCount} {cartCount === 1 ? "item" : "items"} in your basket</b><small className="text-[10px] text-white/60">View basket & checkout</small></span></span><span className="text-sm font-bold">{money(total)} <span className="ml-1">→</span></span></button></div>}

      {showMobileCart && <div className="fixed inset-0 z-50 bg-black/45 xl:hidden"><button className="absolute inset-0 h-full w-full" onClick={() => setShowMobileCart(false)} aria-label="Close basket overlay" /><div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-[2rem] bg-[#f7f3ed] p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl"><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-stone-300" />{orderPanel}</div></div>}
    </main>
  );
}
