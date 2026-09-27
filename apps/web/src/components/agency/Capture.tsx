"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Building2, CheckCircle2, ExternalLink, Fingerprint, Loader2, Plus, XCircle } from "lucide-react";
import type { CaptureLead, Locale, Zone } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Field, darkInputCls } from "@/components/ui";
import { api, type ApiClientError } from "@/lib/api";
import { TYPE_LABEL, ago, lbl, money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const TONE: Record<CaptureLead["result"], string> = {
  PENDING: "bg-white/10 text-mist",
  CAPTURED: "bg-[#2F6F4E40] text-[#7FD3A8]",
  REJECTED: "bg-[#B4231833] text-[#FF8A7A]",
  DUPLICATE: "bg-[#C9862A33] text-[#F2B866]",
};
type Row = CaptureLead & { listingId?: string };
type ListingType = keyof typeof TYPE_LABEL;
const KINDS: [string, string, string][] = [["apartment", "Apartamento", "Apartment"], ["penthouse", "Penthouse", "Penthouse"], ["house", "Casa", "House"], ["townhouse", "Townhouse", "Townhouse"], ["studio", "Estudio", "Studio"], ["villa", "Villa", "Villa"], ["chalet", "Chalet", "Chalet"], ["office", "Oficina", "Office"], ["retail", "Local", "Retail"], ["warehouse", "Galpón", "Warehouse"], ["land", "Terreno", "Land"]];
type Dup = { id?: string; slug: string | null; title: string | null; zone?: string; areaM2?: number; fingerprint?: string } | null;

export function CaptureView({ locale, rows: initialRows, zones, titles, canConvert = false }: { locale: Locale; rows: Row[]; zones: Zone[]; titles: Record<string, string>; canConvert?: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [converting, setConverting] = useState<{ id: string; listingType: ListingType } | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string | null>(null);
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
        .catch(() => setDup(null))
        .finally(() => setChecking(false));
    }, 400);
    return () => clearTimeout(t);
  }, [f.address, f.areaM2, zone]);

  const setResult = async (id: string, result: CaptureLead["result"]) => {
    const before = rows;
    setRowErr(null);
    setRows(rows.map((r) => (r.id === id ? { ...r, result } : r)));
    try {
      await api(`capture/${id}`, { method: "PATCH", json: { result } });
      router.refresh();
    } catch (e) {
      setRows(before); // roll back the optimistic change
      setRowErr((e as Error).message);
    }
  };
  const convert = async () => {
    if (!converting) return;
    setRowBusy(converting.id);
    setRowErr(null);
    try {
      const l = await api<{ id: string }>(`capture/${converting.id}/convert`, { method: "POST", json: { listingType: converting.listingType } });
      setRows(rows.map((r) => (r.id === converting.id ? { ...r, result: "CAPTURED", listingId: l.id } : r)));
      setConverting(null);
      router.push(`/${locale}/agency/listings/${l.id}/edit`);
    } catch (e) {
      const err = e as ApiClientError;
      const dupOf = (err.details as { duplicateOf?: { title: string } } | undefined)?.duplicateOf;
      setRowErr(dupOf ? tx(locale, `Ya existe un inmueble para esta dirección: «${dupOf.title}».`, `A listing already exists for this address: “${dupOf.title}”.`) : err.message);
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Cola de captación", "Capture queue")}>
      {rowErr && <div role="alert" className="mb-4 rounded-lg bg-[#B4231833] px-3 py-2 text-sm text-[#FF8A7A]">{rowErr}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
              <tr><th className="px-4 py-3">{tx(locale, "Dirección", "Address")}</th><th className="px-3 py-3">{tx(locale, "Dueño", "Owner")}</th><th className="px-3 py-3 text-right">m²</th><th className="px-3 py-3 text-right">{tx(locale, "Pide", "Asking")}</th><th className="px-3 py-3">{tx(locale, "Resultado", "Result")}</th><th className="px-3 py-3" /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Fragment key={c.id}>
                <tr className="border-t border-navy-line align-top">
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
                      <div className="flex flex-wrap gap-1">
                        {canConvert && (
                          <button onClick={() => setConverting(converting?.id === c.id ? null : { id: c.id, listingType: "SALE" })} className="flex items-center gap-1 rounded-md bg-[#F26B4D33] px-2 py-1.5 text-xs font-semibold text-coral" aria-expanded={converting?.id === c.id}>
                            <Building2 size={14} /> {tx(locale, "Convertir en inmueble", "Convert to listing")}
                          </button>
                        )}
                        <button onClick={() => setResult(c.id, "CAPTURED")} className="rounded-md bg-[#2F6F4E40] p-1.5 text-[#7FD3A8]" aria-label={tx(locale, "Marcar como captado", "Mark as captured")} title={tx(locale, "Marcar como captado", "Mark as captured")}><CheckCircle2 size={15} /></button>
                        <button onClick={() => setResult(c.id, "REJECTED")} className="rounded-md bg-[#B4231833] p-1.5 text-[#FF8A7A]" aria-label={tx(locale, "Rechazar", "Reject")} title={tx(locale, "Rechazar", "Reject")}><XCircle size={15} /></button>
                      </div>
                    )}
                    {c.listingId && (
                      <Link href={`/${locale}/agency/listings/${c.listingId}/edit`} className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-coral hover:underline">
                        <ExternalLink size={13} /> {tx(locale, "Ver inmueble", "Open listing")}
                      </Link>
                    )}
                  </td>
                </tr>
                {converting?.id === c.id && (
                  <tr className="bg-white/[.03]">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="w-56">
                          <Field dark label={tx(locale, "Operación", "Listing type")}>
                            <select className={darkInputCls} value={converting.listingType} onChange={(e) => setConverting({ ...converting, listingType: e.target.value as ListingType })}>
                              {(Object.keys(TYPE_LABEL) as ListingType[]).map((k) => <option key={k} value={k}>{lbl(TYPE_LABEL[k], locale)}</option>)}
                            </select>
                          </Field>
                        </div>
                        <p className="max-w-sm flex-1 text-xs text-mist">{tx(locale, "Se crea un borrador en tu agencia con la dirección, zona, m² y precio de la captación. Podrás completarlo antes de publicar.", "A draft is created in your agency with the capture’s address, area, m² and price. You can complete it before publishing.")}</p>
                        <Button size="sm" disabled={rowBusy === c.id} onClick={convert}>
                          {rowBusy === c.id ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />} {tx(locale, "Crear borrador", "Create draft")}
                        </Button>
                        <Button size="sm" variant="dark-ghost" type="button" onClick={() => setConverting(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-mist">{tx(locale, "La cola está vacía. Registra la primera captación con el formulario.", "The queue is empty. Log the first capture with the form.")}</td></tr>
              )}
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
            <Field dark label={tx(locale, "Tipo de inmueble", "Property type")}>
              <select className={darkInputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                {KINDS.map(([k, es, en]) => <option key={k} value={k}>{tx(locale, es, en)}</option>)}
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
              <div className="mt-1 text-xs text-mist">{dup ? (dup.zone ? `${dup.title} · ${dup.zone} · ${dup.areaM2} m²` : dup.title ?? tx(locale, "Ya existe en otra agencia (no público)", "Already listed by another agency (not public)")) : tx(locale, "Fingerprint: lat/lng + m² + hash de dirección", "Fingerprint: lat/lng + m² + address hash")}</div>
              <div className="mt-1 font-mono text-[10px] text-mist/80">{dup?.fingerprint ?? fp}</div>
            </div>
          )}
          {err && <div role="alert" className="mt-3 rounded-lg bg-[#B4231833] px-3 py-2 text-sm text-[#FF8A7A]">{err}</div>}
          <Button className="mt-4 w-full" disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {dup ? tx(locale, "Registrar como duplicado", "Log as duplicate") : tx(locale, "Añadir a la cola", "Add to queue")}</Button>
          <div className="mt-3 flex gap-2 text-xs text-mist"><Badge tone="dark">{tx(locale, "1 inmueble = 1 unidad física", "1 listing = 1 physical unit")}</Badge></div>
        </form>
      </div>
    </AdminShell>
  );
}
