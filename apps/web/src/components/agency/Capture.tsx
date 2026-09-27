"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Fingerprint, Loader2, Plus, XCircle } from "lucide-react";
import type { CaptureLead, Locale, Zone } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Field, darkInputCls } from "@/components/ui";
import { api } from "@/lib/api";
import { ago, money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const TONE: Record<CaptureLead["result"], string> = {
  PENDING: "bg-white/10 text-mist",
  CAPTURED: "bg-[#2F6F4E40] text-[#7FD3A8]",
  REJECTED: "bg-[#B4231833] text-[#FF8A7A]",
  DUPLICATE: "bg-[#C9862A33] text-[#F2B866]",
};
type Dup = { id: string; slug: string; title: string; zone: string; areaM2: number; fingerprint: string } | null;

export function CaptureView({ locale, rows: initialRows, zones, titles }: { locale: Locale; rows: CaptureLead[]; zones: Zone[]; titles: Record<string, string> }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [f, setF] = useState({ address: "", zone: zones[0]?.name ?? "", areaM2: 100, askingPrice: 150000, ownerName: "", phone: "", kind: "apartment" });
  const [dup, setDup] = useState<Dup>(null);
  const [fp, setFp] = useState("");
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const zone = zones.find((z) => z.name === f.zone);
  const label: Record<CaptureLead["result"], string> = { PENDING: tx(locale, "Pendiente", "Pending"), CAPTURED: tx(locale, "Captado", "Captured"), REJECTED: tx(locale, "Rechazado", "Rejected"), DUPLICATE: tx(locale, "Duplicado", "Duplicate") };

  useEffect(() => {
    if (f.address.length < 6) return setDup(null);
    setChecking(true);
    const t = setTimeout(() => {
      api<{ duplicate: Dup; fingerprint: string }>("capture/check", { method: "POST", json: { address: f.address, areaM2: f.areaM2, lat: zone?.lat, lng: zone?.lng } })
        .then((r) => {
          setDup(r.duplicate);
          setFp(r.fingerprint);
        })
        .finally(() => setChecking(false));
    }, 400);
    return () => clearTimeout(t);
  }, [f.address, f.areaM2, zone]);

  const setResult = async (id: string, result: CaptureLead["result"]) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, result } : r)));
    await api(`capture/${id}`, { method: "PATCH", json: { result } });
    router.refresh();
  };

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Cola de captación", "Capture queue")}>
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
              <tr><th className="px-4 py-3">{tx(locale, "Dirección", "Address")}</th><th className="px-3 py-3">{tx(locale, "Dueño", "Owner")}</th><th className="px-3 py-3 text-right">m²</th><th className="px-3 py-3 text-right">{tx(locale, "Pide", "Asking")}</th><th className="px-3 py-3">{tx(locale, "Resultado", "Result")}</th><th className="px-3 py-3" /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-navy-line align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{c.address}</div>
                    <div className="text-xs text-mist">{c.zone} · {ago(c.createdAt, locale)}</div>
                    {c.duplicateOf && <div className="mt-1 flex items-center gap-1 text-xs text-[#F2B866]"><Fingerprint size={12} /> = {titles[c.duplicateOf] ?? c.duplicateOf}</div>}
                  </td>
                  <td className="px-3 py-3"><div>{c.ownerName}</div><div className="text-xs text-mist">{c.phone}</div></td>
                  <td className="px-3 py-3 text-right">{c.areaM2}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-display">{money(c.askingPrice, locale)}</td>
                  <td className="px-3 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", TONE[c.result])}>{label[c.result]}</span></td>
                  <td className="px-3 py-3">
                    {c.result === "PENDING" && (
                      <div className="flex gap-1">
                        <button onClick={() => setResult(c.id, "CAPTURED")} className="rounded-md bg-[#2F6F4E40] p-1.5 text-[#7FD3A8]" aria-label={label.CAPTURED}><CheckCircle2 size={15} /></button>
                        <button onClick={() => setResult(c.id, "REJECTED")} className="rounded-md bg-[#B4231833] p-1.5 text-[#FF8A7A]" aria-label={label.REJECTED}><XCircle size={15} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          className="rounded-np border border-navy-line bg-navy-card p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setBusy(true);
            try {
              const c = await api<CaptureLead & { createdAt: string; duplicateOfId?: string }>("capture", { method: "POST", json: { ...f, lat: zone?.lat, lng: zone?.lng } });
              setRows([{ ...c, createdAt: new Date().toISOString(), duplicateOf: c.duplicateOfId ?? undefined }, ...rows]);
              setF({ ...f, address: "", ownerName: "", phone: "" });
              router.refresh();
            } catch (e2) {
              setErr((e2 as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="font-display text-lg font-semibold">{tx(locale, "Nueva captación", "New capture")}</div>
          <div className="mt-3 space-y-3">
            <Field dark label={tx(locale, "Dirección", "Address")}><input required minLength={5} className={darkInputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <Field dark label={tx(locale, "Zona", "Area")}>
              <select className={darkInputCls} value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })}>
                {zones.map((z) => <option key={z.slug}>{z.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field dark label="m²"><input className={darkInputCls} type="number" min={1} value={f.areaM2} onChange={(e) => setF({ ...f, areaM2: +e.target.value })} /></Field>
              <Field dark label={tx(locale, "Precio pedido", "Asking")}><input className={darkInputCls} type="number" min={1} value={f.askingPrice} onChange={(e) => setF({ ...f, askingPrice: +e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field dark label={tx(locale, "Dueño", "Owner")}><input required minLength={2} className={darkInputCls} value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} /></Field>
              <Field dark label={tx(locale, "Teléfono", "Phone")}><input required minLength={6} className={darkInputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            </div>
          </div>
          {f.address.length >= 6 && (
            <div className={cn("np-in mt-4 rounded-lg border p-3 text-sm", dup ? "border-[#C9862A80] bg-[#C9862A1a]" : "border-[#2F6F4E80] bg-[#2F6F4E1a]")}>
              <div className="flex items-center gap-2 font-semibold">{checking ? <Loader2 size={16} className="animate-spin" /> : dup ? <AlertTriangle size={16} className="text-[#F2B866]" /> : <CheckCircle2 size={16} className="text-[#7FD3A8]" />}{dup ? tx(locale, "Posible duplicado", "Possible duplicate") : tx(locale, "Sin duplicados", "No duplicates")}</div>
              <div className="mt-1 text-xs text-mist">{dup ? `${dup.title} · ${dup.zone} · ${dup.areaM2} m²` : tx(locale, "Fingerprint: lat/lng + m² + hash de dirección", "Fingerprint: lat/lng + m² + address hash")}</div>
              <div className="mt-1 font-mono text-[10px] text-mist/80">{dup?.fingerprint ?? fp}</div>
            </div>
          )}
          {err && <div className="mt-3 rounded-lg bg-[#B4231833] px-3 py-2 text-sm text-[#FF8A7A]">{err}</div>}
          <Button className="mt-4 w-full" disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {dup ? tx(locale, "Registrar como duplicado", "Log as duplicate") : tx(locale, "Añadir a la cola", "Add to queue")}</Button>
          <div className="mt-3 flex gap-2 text-xs text-mist"><Badge tone="dark">{tx(locale, "1 inmueble = 1 unidad física", "1 listing = 1 physical unit")}</Badge></div>
        </form>
      </div>
    </AdminShell>
  );
}
