"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Printer, ChefHat, ReceiptText, CheckCircle2 } from "lucide-react";

const API = process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100");
const money = (p: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(p / 100);

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<any>(null);
  const [type, setType] = useState("invoice");
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    let alive = true;
    params.then(async (p) => {
      const query = new URLSearchParams(window.location.search);
      const requestedType = query.get("type") || "invoice";
      const batch = query.get("batch");
      setType(requestedType);
      if (!p.id || !/^\d+$/.test(p.id)) { if (alive) setError("Missing or invalid order ID."); return; }
      try {
        const response = await fetch(`${API}/api/v1/orders/${p.id}/receipt/${requestedType}${batch ? `?batch=${encodeURIComponent(batch)}` : ""}`, { credentials: "include", cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Receipt unavailable");
        if (alive) setData(body);
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : "Receipt unavailable"); }
    });
    return () => { alive = false; };
  }, [params]);

  if (!data) return <main className="p-8 text-sm text-stone-600">{error || "Loading receipt…"}</main>;
  const order = data.order;
  const isKot = type === "kot";

  async function printReceipt() {
    setPrinting(true); setError("");
    try {
      // The explicit print action advances the order lifecycle on the server.
      const eventResponse = await fetch(`${API}/api/v1/orders/${order.id}/print-event`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: isKot ? "kot" : "invoice" }),
      });
      const eventBody = await eventResponse.json();
      if (!eventResponse.ok) throw new Error(eventBody.error || "Could not update order status");
      try {
        const response = await fetch("http://127.0.0.1:8787/print", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: isKot ? "kot" : "invoice", orderId: order.id, paperWidthMm: Number(localStorage.getItem("sukoon.paperWidth") || 80), printerName: localStorage.getItem(isKot ? "sukoon.kotPrinter" : "sukoon.receiptPrinter") || undefined, order, lines: data.lines, invoice: data.invoice, cafe: data.cafe, table: data.table }),
        });
        if (!response.ok) throw new Error("Print agent unavailable");
        setPrinted(true);
      } catch {
        // Browser printing remains available if the local print agent is offline.
        window.print();
        setPrinted(true);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Print action failed"); }
    finally { setPrinting(false); }
  }

  return (
    <main className="min-h-screen bg-stone-100 p-4 text-black print:bg-white print:p-0">
      <div className="mx-auto max-w-[440px] rounded-2xl bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:p-4 print:shadow-none">
        <div className="text-center"><p className="text-[10px] font-bold tracking-[.35em] text-stone-500">SUKOON DIARIES</p><h1 className="mt-1 text-2xl font-bold">{data.cafe?.cafeName || "Sukoon Cafe"}</h1><p className="mt-1 text-[10px] text-stone-500">{data.cafe?.address || "Cafe address"}</p>{data.cafe?.phone && <p className="text-[10px]">Contact: {data.cafe.phone}</p>}<div className="my-4 border-t border-dashed border-black"/><div className="flex items-center justify-center gap-2 text-lg font-bold">{isKot ? <ChefHat size={18}/> : <ReceiptText size={18}/>} {isKot ? "KITCHEN ORDER TICKET" : "CUSTOMER INVOICE"}</div>{isKot && data.lines?.[0]?.batchNumber > 1 && <p className="mt-1 text-xs font-bold">ADDITIONAL ITEMS · ROUND {data.lines[0].batchNumber}</p>}</div>
        <div className="mt-5 space-y-1 text-xs"><p><b>Order:</b> {order.orderNumber}</p><p><b>Date:</b> {new Date(order.createdAt).toLocaleString("en-IN")}</p><p><b>Type:</b> {order.source}</p>{data.table && <p><b>Table:</b> {data.table.tableNumber}</p>}{order.externalPlatformOrderId && <p><b>Platform ID:</b> {order.externalPlatformOrderId}</p>}{order.customerName && <p><b>Customer:</b> {order.customerName}</p>}{order.customerPhone && <p><b>Phone:</b> {order.customerPhone}</p>}{order.deliveryAddress && <p><b>Address:</b> {order.deliveryAddress}</p>}{!isKot && <p><b>Invoice:</b> {data.invoice?.invoiceNumber || "—"}</p>}<p><b>Prepared by:</b> {order.createdByName || "Cafe team"}{order.createdByRole ? ` · ${order.createdByRole}` : ""}</p></div>
        <div className="my-4 border-t border-dashed border-black"/>
        <div className="space-y-3">{data.lines.map((line: any) => <div key={line.id} className="flex justify-between gap-3 text-sm"><div className="min-w-0"><p className="font-semibold">{line.itemNameSnapshot}</p><p className="text-xs">Qty: {line.quantity}{line.notes ? ` · ${line.notes}` : ""}</p></div>{!isKot && <p className="shrink-0">{money(line.unitPricePaise * line.quantity)}</p>}</div>)}{isKot && order.orderNotes && <p className="rounded border border-dashed border-black p-2 text-xs"><b>ORDER NOTES:</b> {order.orderNotes}</p>}</div>
        {!isKot && <><div className="my-4 border-t border-dashed border-black"/><div className="space-y-1 text-sm"><p className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotalPaise)}</span></p><p className="flex justify-between"><span>Discount</span><span>−{money(order.discountPaise)}</span></p><p className="flex justify-between"><span>Tax</span><span>{money(order.taxPaise)}</span></p><p className="flex justify-between border-t border-black pt-2 text-base font-bold"><span>Grand total</span><span>{money(order.totalPaise)}</span></p><p className="pt-2 text-xs"><b>Payment:</b> {order.paymentStatus} · {order.paymentMethod || "—"}</p></div></>}
        <div className="my-5 border-t border-dashed border-black"/><p className="text-center text-xs">{isKot ? "Please prepare this order." : "Thank you for visiting Sukoon Diaries. Have a lovely day!"}</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 print:hidden">{error}</p>}
        {printed && <p className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-700 print:hidden"><CheckCircle2 size={14}/> {isKot ? "Order moved to Preparing / Making." : "Order marked Completed. Payment remains separately tracked."}</p>}
        <div className="mt-6 flex gap-2 print:hidden"><button disabled={printing} onClick={() => void printReceipt()} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#211d19] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Printer size={15}/>{printing ? "Processing…" : `Print ${isKot ? "KOT" : "invoice"}`}</button><a href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm"><ArrowLeft size={14}/> Back</a></div>
      </div>
      <style jsx global>{`@media print{@page{size:auto;margin:4mm}body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style>
    </main>
  );
}
