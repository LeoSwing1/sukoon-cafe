"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check,
  ChefHat, Clock3, Coffee, Leaf, MapPin, Menu as MenuIcon,
  PartyPopper, Phone, Search, Sparkles, Utensils, X,
} from "lucide-react";

const API = process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100");
type Cafe = { cafeName?: string; tagline?: string; address?: string; openingHours?: string; phone?: string; email?: string };
type MenuItem = { id: number; name: string; description?: string | null; pricePaise: number; categoryName?: string | null };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

const experiences = [
  { number: "01", title: "Slow coffee, good conversations", copy: "A familiar cup, a new favourite, and a little more time to enjoy it.", icon: Coffee, tone: "bg-[#e8ded1]" },
  { number: "02", title: "Comfort food, made for sharing", copy: "From quick cravings to long meals, find something that feels just right.", icon: Utensils, tone: "bg-[#e5e9dd]" },
  { number: "03", title: "Small moments, big memories", copy: "Bring your people together for birthdays, celebrations and everything between.", icon: PartyPopper, tone: "bg-[#efe1df]" },
];

export default function Home() {
  const [cafe, setCafe] = useState<Cafe>({ cafeName: "Sukoon Cafe", tagline: "A little pause. A little sukoon.", address: "Ashiyana Road, LDA Colony, Lucknow" });
  const [items, setItems] = useState<MenuItem[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${API}/api/v1/cafe-settings`, { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/api/v1/menu-items`, { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([settings, menu]) => {
      if (!active) return;
      if (settings?.settings) setCafe(v => ({ ...v, ...settings.settings }));
      if (menu?.items) setItems(menu.items);
    });
    return () => { active = false; };
  }, []);

  const whatsappNumber = (cafe.phone || "").replace(/\D/g, "");
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.address || "Sukoon Cafe, Lucknow")}`;
  const featuredItems = items.length ? ["Sukoon Special Cold Coffee", "Mummy Wali Adrak Chai", "Single Veg Momos", "Sizzling Brownie"].map(name => items.find(item => item.name === name)).filter((item): item is MenuItem => Boolean(item)).slice(0, 4) : [];
  const links = [
    ["Our story", "#story"], ["The menu", "/menu"], ["Find a table", "/reserve"],
    ["Celebrations", "/book-event"], ["Catering", "/catering"],
  ];
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f0e8] text-[#211d19]">
      <div className="bg-[#211d19] px-4 py-2 text-center text-[10px] font-medium tracking-[.22em] text-[#e7cbb0] sm:text-xs">A LITTLE PAUSE IN THE MIDDLE OF IT ALL · LUCKNOW</div>
      <header className="sticky top-0 z-40 border-b border-[#e8ded3] bg-[#f8f4ee]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="group flex items-center gap-3" aria-label="Sukoon Diaries home">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#211d19] font-serif text-xl italic text-[#e6c9ad]">S</span>
            <span><b className="block text-[13px] tracking-[.25em]">SUKOON DIARIES</b><small className="mt-0.5 block text-[9px] tracking-[.25em] text-stone-500">CAFE · LUCKNOW</small></span>
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {links.map(([label, href]) => <a key={label} href={href} className="text-[13px] text-stone-600 transition hover:text-[#9b6948]">{label}</a>)}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <a href="/login" className="px-3 py-2 text-xs text-stone-500 hover:text-stone-900">Staff login</a>
            <a href="/menu" className="inline-flex items-center gap-2 rounded-full bg-[#211d19] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#8e5f40]">Order online <ArrowUpRight size={14}/></a>
          </div>
          <button onClick={() => setMobileOpen(v => !v)} className="grid h-10 w-10 place-items-center rounded-full border border-stone-300 lg:hidden" aria-label="Toggle navigation">{mobileOpen ? <X size={19}/> : <MenuIcon size={19}/>}</button>
        </div>
        {mobileOpen && <nav className="grid grid-cols-2 gap-2 border-t border-stone-200 px-5 py-4 lg:hidden">{links.map(([label, href]) => <a key={label} href={href} onClick={() => setMobileOpen(false)} className="rounded-xl bg-white px-4 py-3 text-sm">{label}</a>)}<a href="/login" className="rounded-xl bg-white px-4 py-3 text-sm">Staff login</a></nav>}
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pt-20">
        <div className="relative z-10">
          <p className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.32em] text-[#9b6948]"><span className="h-px w-8 bg-[#9b6948]"/> Your daily dose of warmth</p>
          <h1 className="max-w-3xl text-[clamp(3.7rem,9vw,7.7rem)] font-light leading-[.91] tracking-[-.065em]">A little pause.<br/><span className="font-serif italic text-[#9b6948]">A little sukoon.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-stone-600 sm:text-lg">{cafe.tagline || "Good coffee, comforting food and the kind of company that makes time slow down."}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="/menu" className="inline-flex items-center gap-3 rounded-full bg-[#211d19] px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-stone-900/10 transition hover:-translate-y-0.5 hover:bg-[#8e5f40]">Explore the menu <ArrowUpRight size={16}/></a>
            <a href="/reserve" className="inline-flex items-center gap-3 rounded-full border border-stone-400 px-7 py-4 text-sm font-medium transition hover:border-[#9b6948] hover:bg-white">Reserve a table <CalendarDays size={16}/></a>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-stone-300 pt-6 text-xs text-stone-500"><span className="flex items-center gap-2"><Coffee size={15} className="text-[#9b6948]"/> Coffee & slow sips</span><span className="flex items-center gap-2"><Leaf size={15} className="text-[#718064]"/> Freshly made bites</span><span className="flex items-center gap-2"><Sparkles size={15} className="text-[#9b6948]"/> Moments worth keeping</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[590px] lg:ml-auto">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-[#cbb9a6]"/><div className="absolute -bottom-7 -left-7 h-32 w-32 rounded-full border border-[#cbb9a6]"/>
          <div className="relative aspect-[.91] overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_54%_30%,#d9b995_0%,#a88a6c_22%,transparent_48%),linear-gradient(145deg,#79634e,#28221e_72%)] p-6 text-white shadow-2xl shadow-[#493b2e]/20 sm:rounded-[2.7rem] sm:p-9">
            <div className="absolute inset-0 opacity-20" style={{backgroundImage:"radial-gradient(#fff 0.7px, transparent 0.7px)",backgroundSize:"16px 16px"}}/>
            <div className="absolute left-[18%] top-[15%] h-48 w-48 rounded-full border border-white/15 sm:h-64 sm:w-64"/><div className="absolute left-[25%] top-[22%] h-36 w-36 rounded-full border border-white/15 sm:h-52 sm:w-52"/>
            <div className="absolute left-1/2 top-[42%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border-[10px] border-[#e4d0b9] bg-[#f3e5d4] shadow-[0_26px_60px_rgba(0,0,0,.28)] sm:h-48 sm:w-48">
              <div className="absolute -right-10 top-8 h-24 w-16 rounded-r-full border-[9px] border-l-0 border-[#e4d0b9]"/><div className="absolute inset-3 rounded-[1.7rem] bg-[radial-gradient(ellipse_at_50%_40%,#a9825b,#503a2b_70%)]"/><div className="absolute left-1/2 top-5 h-4 w-12 -translate-x-1/2 rounded-full bg-[#d8bea2]/70 blur-sm"/>
            </div>
            <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between sm:bottom-10 sm:left-10 sm:right-10"><div><p className="text-[9px] tracking-[.34em] text-white/65 sm:text-[10px]">SUKOON DIARIES · EST. WITH LOVE</p><p className="mt-2 font-serif text-3xl italic sm:text-5xl">Slow down.</p><p className="mt-1 text-sm text-white/70">Sip something lovely.</p></div><span className="grid h-12 w-12 place-items-center rounded-full border border-white/30"><ArrowDownRight size={21}/></span></div>
          </div>
          <div className="absolute -bottom-5 right-4 rounded-2xl border border-[#e8ded3] bg-[#fbf8f4] px-5 py-3 shadow-xl sm:right-8"><p className="text-[9px] tracking-[.22em] text-[#9b6948]">COME AS YOU ARE</p><p className="mt-1 font-serif text-lg italic">Leave a little lighter.</p></div>
        </div>
      </section>

      <section className="border-y border-[#e8ded3] bg-[#eee7dd]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-5 py-7 text-center sm:grid-cols-4 lg:px-8"><div><b className="font-serif text-2xl">Good coffee</b><p className="mt-1 text-[10px] uppercase tracking-[.19em] text-stone-500">Made for slow sips</p></div><div><b className="font-serif text-2xl">Fresh bites</b><p className="mt-1 text-[10px] uppercase tracking-[.19em] text-stone-500">Comfort on a plate</p></div><div><b className="font-serif text-2xl">Your people</b><p className="mt-1 text-[10px] uppercase tracking-[.19em] text-stone-500">Space to connect</p></div><div><b className="font-serif text-2xl">Your moment</b><p className="mt-1 text-[10px] uppercase tracking-[.19em] text-stone-500">Made a little special</p></div></div>
      </section>

      <section id="story" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:py-28 lg:grid-cols-[.75fr_1.25fr] lg:px-8">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#9b6948]">The Sukoon feeling</p><h2 className="mt-4 max-w-md font-serif text-5xl leading-[1.05] sm:text-6xl">Not just a café.<br/><i>A little feeling.</i></h2></div>
        <div className="max-w-2xl lg:pt-3"><p className="text-lg leading-8 text-stone-600">Some days call for a strong coffee. Some call for a plate in the middle of the table and everyone reaching for a bite. Sukoon is a place to pause, catch up and make ordinary moments feel special.</p><p className="mt-5 leading-7 text-stone-500">Come by for a quick pick-me-up, settle in for a longer conversation, or bring your favourite people together for a celebration. There is room for all of it.</p><a href="/reserve" className="mt-7 inline-flex items-center gap-2 border-b border-[#9b6948] pb-2 text-sm font-semibold text-[#8e5f40]">Find your table <ArrowRight size={15}/></a></div>
      </section>

      <section className="bg-[#211d19] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#d4b394]">A taste of Sukoon</p><h2 className="mt-3 font-serif text-5xl sm:text-6xl">Made for your mood.</h2></div><a href="/menu" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm transition hover:bg-white hover:text-[#211d19]">View full digital menu <ArrowUpRight size={15}/></a></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(featuredItems.length ? featuredItems : items.length ? items.slice(0, 4) : [
            {id:1,name:"Sukoon Special Cold Coffee",description:"A signature chilled pick-me-up",pricePaise:7900,categoryName:"Cold Coffee"},
            {id:2,name:"Mummy Wali Adrak Chai",description:"A comforting cup of ginger chai",pricePaise:2000,categoryName:"Chai & Adrak"},
            {id:3,name:"Single Veg Momos",description:"Steaming hot, made to share",pricePaise:3000,categoryName:"Momos"},
            {id:4,name:"Sizzling Brownie",description:"A sweet ending to your visit",pricePaise:17900,categoryName:"Desserts & Cakes"},
          ]).map((item, i) => <a href="/menu" key={item.id} className="group rounded-2xl border border-white/10 bg-white/[.06] p-5 transition hover:-translate-y-1 hover:bg-white/[.1]"><div className={`mb-8 grid h-16 w-16 place-items-center rounded-2xl ${["bg-[#e8ded1] text-[#5b4534]","bg-[#e5e9dd] text-[#53614a]","bg-[#efe1df] text-[#80514c]","bg-[#e9e2ef] text-[#665475]"][i%4]}`}><span className="text-3xl">{["☕","🫖","🥟","🍰"][i%4]}</span></div><p className="text-[9px] uppercase tracking-[.2em] text-[#d4b394]">{item.categoryName || "Cafe favourite"}</p><h3 className="mt-2 text-lg font-semibold">{item.name}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-white/55">{item.description || "A little something to make your day."}</p><div className="mt-5 flex items-center justify-between"><b className="text-[#e4c5a7]">{money(item.pricePaise)}</b><span className="grid h-9 w-9 place-items-center rounded-full border border-white/20 transition group-hover:bg-white group-hover:text-[#211d19]"><ArrowUpRight size={15}/></span></div></a>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:py-28 lg:px-8">
        <div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#9b6948]">More than a menu</p><h2 className="mt-3 font-serif text-5xl sm:text-6xl">Make room for moments.</h2><p className="mt-5 leading-7 text-stone-600">A quick coffee, a slow lunch, a birthday with your favourite people or a spread delivered to your gathering. Choose your kind of Sukoon.</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">{experiences.map(({number,title,copy,icon:Icon,tone}) => <article key={number} className={`rounded-[1.7rem] ${tone} p-7 sm:p-8`}><div className="flex items-center justify-between"><span className="text-xs tracking-[.2em] text-stone-500">{number} / EXPERIENCE</span><Icon size={23} className="text-[#8e5f40]"/></div><h3 className="mt-12 max-w-xs font-serif text-3xl leading-tight">{title}</h3><p className="mt-4 min-h-20 text-sm leading-6 text-stone-600">{copy}</p><a href={["/menu","/reserve","/book-event"][Number(number)-1]} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#80563c]">Explore <ArrowUpRight size={15}/></a></article>)}</div>
      </section>

      <section className="border-y border-[#e8ded3] bg-[#e9e1d7] py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8"><div><p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#9b6948]">Bring Sukoon to your celebration</p><h2 className="mt-4 max-w-xl font-serif text-5xl leading-[1.05] sm:text-6xl">Big day or small gathering. We’re in.</h2><p className="mt-5 max-w-xl leading-7 text-stone-600">Plan a birthday, anniversary, intimate party or corporate get-together. Prefer to host elsewhere? Ask us about catering for your event.</p></div><div className="grid gap-3 sm:grid-cols-2"><a href="/book-event" className="group rounded-2xl bg-[#211d19] p-6 text-white transition hover:-translate-y-1"><PartyPopper size={23} className="text-[#e4c5a7]"/><h3 className="mt-8 text-xl font-semibold">Party & celebrations</h3><p className="mt-2 text-sm leading-6 text-white/60">Decor, food, cake moments and music.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#e4c5a7]">Plan a party <ArrowUpRight size={15}/></span></a><a href="/catering" className="group rounded-2xl border border-[#cbbdad] bg-[#f8f4ee] p-6 transition hover:-translate-y-1"><ChefHat size={23} className="text-[#8e5f40]"/><h3 className="mt-8 text-xl font-semibold">Catering enquiries</h3><p className="mt-2 text-sm leading-6 text-stone-500">Thoughtful food for meetings, events and gatherings.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8e5f40]">Ask about catering <ArrowUpRight size={15}/></span></a></div></div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:py-24 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.3em] text-[#9b6948]">Come find us</p><h2 className="mt-3 font-serif text-5xl sm:text-6xl">Your corner<br/><i>is waiting.</i></h2><p className="mt-6 flex items-start gap-3 text-sm leading-6 text-stone-600"><MapPin size={17} className="mt-0.5 shrink-0 text-[#9b6948]"/>{cafe.address || "Ashiyana Road, LDA Colony, Lucknow"}</p><p className="mt-3 flex items-start gap-3 text-sm leading-6 text-stone-600"><Clock3 size={17} className="mt-0.5 shrink-0 text-[#9b6948]"/>{cafe.openingHours || "Ask our team for today's opening hours."}</p>{cafe.phone && <a href={`tel:${cafe.phone}`} className="mt-3 flex items-center gap-3 text-sm text-stone-600"><Phone size={17} className="text-[#9b6948]"/>{cafe.phone}</a>}{cafe.email && <a href={`mailto:${cafe.email}`} className="mt-2 flex items-center gap-3 text-sm text-stone-600"><Search size={16} className="text-[#9b6948]"/>{cafe.email}</a>}<div className="mt-8 flex flex-wrap gap-3"><a href="/reserve" className="rounded-full bg-[#211d19] px-6 py-3 text-sm font-semibold text-white">Book a table</a><a href="/menu" className="rounded-full border border-stone-400 px-6 py-3 text-sm">Open menu</a><a href={directionsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-stone-400 px-6 py-3 text-sm">Get directions</a>{whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="rounded-full border border-stone-400 px-6 py-3 text-sm">WhatsApp us</a>}</div></div>
        <div className="relative min-h-[330px] overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_70%_25%,#c9aa8a,transparent_35%),linear-gradient(140deg,#64503d,#211d19)] p-7 text-white sm:min-h-[400px] sm:p-10"><div className="absolute -right-12 -top-12 h-64 w-64 rounded-full border border-white/15"/><div className="absolute -right-3 top-0 h-48 w-48 rounded-full border border-white/15"/><div className="absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-black/35 to-transparent"/><div className="relative flex h-full min-h-[280px] flex-col justify-between"><span className="text-[10px] tracking-[.3em] text-white/65">{cafe.cafeName || "SUKOON DIARIES"}</span><div><p className="font-serif text-4xl italic sm:text-5xl">A table. A cup.<br/>A moment to yourself.</p><a href="/reserve" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#f5f0e8] px-5 py-3 text-sm font-semibold text-[#211d19]">Reserve your seat <ArrowRight size={15}/></a></div></div></div>
      </section>

      <footer className="bg-[#211d19] px-5 py-10 text-white lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row"><div><p className="text-lg font-semibold tracking-[.25em]">SUKOON DIARIES</p><p className="mt-2 text-sm text-white/50">Good food. Warm moments. A little sukoon.</p></div><div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm text-white/65"><a href="/menu" className="hover:text-white">Digital menu</a><a href="/reserve" className="hover:text-white">Table reservations</a><a href="/book-event" className="hover:text-white">Party bookings</a><a href="/catering" className="hover:text-white">Catering</a><a href="/track-order" className="hover:text-white">Track an order</a><a href="/login" className="hover:text-white">Staff workspace</a></div></div><div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-5 text-[10px] tracking-[.18em] text-white/35">© {new Date().getFullYear()} SUKOON DIARIES · LUCKNOW</div></footer>
    </main>
  );
}
