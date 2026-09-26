"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Fingerprint, Plus, XCircle } from "lucide-react";
import type { CaptureLead, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Field, darkInputCls } from "@/components/ui";
import { CAPTURES } from "@/mock/ops";
import { LISTINGS, listingById } from "@/mock/listings";
import { ago, money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const TONE: Record<CaptureLead["result"], string> = {
  PENDING: "bg-white/10 text-mist",
  CAPTURED: "bg-[#2F6F4E40] text-[#7FD3A8]",
  REJECTED: "bg-[#B4231833] text-[#FF8A7A]",
  DUPLICATE: "bg-[#C9862A33] text-[#F2B866]",
};

export function CaptureView({ locale }: { locale: Locale }) {
  const [rows, setRows] = useState(CAPTURES);
  const [addr, setAddr] = useState("Av. San Juan Bosco, Torre Alba, piso 9");
  const [m2, setM2] = useState(142);
  const dup = LISTINGS.find((l) => l.address.toLowerCase().includes(addr.toLowerCase().slice(0, 18)) && Math.abs(l.areaM2 - m2) <= 5);
  const label: Record<CaptureLead["result"], string> = { PENDING: tx(locale, "Pendiente", "Pending"), CAPTURED: tx(locale, "Captado", "Captured"), REJECTED: tx(locale, "Rechazado", "Rejected"), DUPLICATE: tx(locale, "Duplicado", "Duplicate") };
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Cola de captación", "Capture queue")}>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-np border border-navy-line bg-navy-card">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
              <tr><th className="px-4 py-3">{tx(locale, "Dirección", "Address")}</th><th className="px-3 py-3">{tx(locale, "Dueño", "Owner")}</th><th className="px-3 py-3 text-right">m²</th><th className="px-3 py-3 text-right">{tx(locale, "Pide", "Asking")}</th><th className="px-3 py-3">{tx(locale, "Resultado", "Result")}</th><th className="px-3 py-3" /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-navy-line align-top">
                  <td className="px-4 py-3"><div className="font-semibold">{c.address}</div><div className="text-xs text-mist">{c.zone} · {ago(c.createdAt, locale)}</div>{c.duplicateOf && <div className="mt-1 flex items-center gap-1 text-xs text-[#F2B866]"><Fingerprint size={12} /> = {tx(locale, listingById(c.duplicateOf)!.title_es, listingById(c.duplicateOf)!.title_en)}</div>}</td>
                  <td className="px-3 py-3"><div>{c.ownerName}</div><div className="text-xs text-mist">{c.phone}</div></td>
                  <td className="px-3 py-3 text-right">{c.areaM2}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-display">{money(c.askingPrice, locale)}</td>
                  <td className="px-3 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", TONE[c.result])}>{label[c.result]}</span></td>
                  <td className="px-3 py-3">
                    {c.result === "PENDING" && (
                      <div className="flex gap-1">
                        <button onClick={() => setRows(rows.map((r) => (r.id === c.id ? { ...r, result: "CAPTURED" } : r)))} className="rounded-md bg-[#2F6F4E40] p-1.5 text-[#7FD3A8]" aria-label="Captado"><CheckCircle2 size={15} /></button>
                        <button onClick={() => setRows(rows.map((r) => (r.id === c.id ? { ...r, result: "REJECTED" } : r)))} className="rounded-md bg-[#B4231833] p-1.5 text-[#FF8A7A]" aria-label="Rechazado"><XCircle size={15} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card p-4">
          <div className="font-display text-lg font-semibold">{tx(locale, "Nueva captación", "New capture")}</div>
          <div className="mt-3 space-y-3">
            <Field dark label={tx(locale, "Dirección", "Address")}><input className={darkInputCls} value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field dark label="m²"><input className={darkInputCls} type="number" value={m2} onChange={(e) => setM2(+e.target.value)} /></Field>
              <Field dark label={tx(locale, "Precio pedido", "Asking")}><input className={darkInputCls} defaultValue="240000" /></Field>
            </div>
            <Field dark label={tx(locale, "Dueño y teléfono", "Owner & phone")}><input className={darkInputCls} defaultValue="Luis Pineda · +58 414 555 0412" /></Field>
          </div>
          <div className={cn("np-in mt-4 rounded-lg border p-3 text-sm", dup ? "border-[#C9862A80] bg-[#C9862A1a]" : "border-[#2F6F4E80] bg-[#2F6F4E1a]")} key={String(!!dup)}>
            <div className="flex items-center gap-2 font-semibold">{dup ? <AlertTriangle size={16} className="text-[#F2B866]" /> : <CheckCircle2 size={16} className="text-[#7FD3A8]" />}{dup ? tx(locale, "Posible duplicado", "Possible duplicate") : tx(locale, "Sin duplicados", "No duplicates")}</div>
            <div className="mt-1 text-xs text-mist">{dup ? `${tx(locale, dup.title_es, dup.title_en)} · ${dup.zone} · ${dup.areaM2} m²` : tx(locale, "Fingerprint: lat/lng + m² + hash de dirección", "Fingerprint: lat/lng + m² + address hash")}</div>
            {dup && <div className="mt-1 font-mono text-[10px] text-mist/80">{dup.fingerprint}</div>}
          </div>
          <Button className="mt-4 w-full" disabled={!!dup}><Plus size={15} /> {tx(locale, "Añadir a la cola", "Add to queue")}</Button>
          <div className="mt-3 flex gap-2 text-xs text-mist"><Badge tone="dark">1 {tx(locale, "listing = 1 unidad física", "listing = 1 physical unit")}</Badge></div>
        </div>
      </div>
    </AdminShell>
  );
}
