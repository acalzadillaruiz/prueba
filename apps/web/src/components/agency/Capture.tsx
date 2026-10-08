"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Building2, CheckCircle2, ExternalLink, Fingerprint, Loader2, Plus, XCircle } from "lucide-react";
import type { CaptureLead, Locale, Zone } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, Field } from "@/components/ui";
import { Chip, Pill, k } from "./kit";
import { ScrollRegion } from "./ScrollRegion";
import { api, type ApiClientError } from "@/lib/api";
import { TYPE_LABEL, lbl, money, tx } from "@/lib/i18n";
import { TimeAgo } from "@/components/owner/TimeAgo";
import { cn } from "@/lib/cn";

const TONE: Record<CaptureLead["result"], "neutral" | "ok" | "danger" | "warn"> = { PENDING: "neutral", CAPTURED: "ok", REJECTED: "danger", DUPLICATE: "warn" };
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

  const actions = (c: Row) => (
    <>
      {c.result === "PENDING" && (
        <div className="flex flex-wrap items-center gap-1">
          {canConvert && (
            <button onClick={() => setConverting(converting?.id === c.id ? null : { id: c.id, listingType: "SALE" })} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-semibold md:py-1.5", "border-[1.5px]", k.outline)} aria-expanded={converting?.id === c.id}>
              <Building2 size={14} /> {tx(locale, "Convertir en inmueble", "Convert to listing")}
            </button>
          )}
          <button onClick={() => setResult(c.id, "CAPTURED")} className={cn("rounded-full p-3 hover:bg-[#2F6B4F14] md:p-1.5 dark:hover:bg-white/5", k.okText)} aria-label={tx(locale, "Marcar como captado", "Mark as captured")} title={tx(locale, "Marcar como captado", "Mark as captured")}><CheckCircle2 size={15} /></button>
          <button onClick={() => setResult(c.id, "REJECTED")} className={cn("rounded-full p-3 hover:bg-[#B3261E12] md:p-1.5 dark:hover:bg-white/5", k.dangerText)} aria-label={tx(locale, "Rechazar", "Reject")} title={tx(locale, "Rechazar", "Reject")}><XCircle size={15} /></button>
        </div>
      )}
      {c.listingId && (
        <Link href={`/${locale}/agency/listings/${c.listingId}/edit`} className={cn("flex items-center gap-1 whitespace-nowrap text-xs", k.link)}>
          <ExternalLink size={13} /> {tx(locale, "Ver inmueble", "Open listing")}
        </Link>
      )}
    </>
  );
  const convertPanel = (c: Row) =>
    converting?.id === c.id && (
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Field label={tx(locale, "Operación", "Listing type")}>
            <select className={k.input} value={converting.listingType} onChange={(e) => setConverting({ ...converting, listingType: e.target.value as ListingType })}>
              {(Object.keys(TYPE_LABEL) as ListingType[]).map((k) => <option key={k} value={k}>{lbl(TYPE_LABEL[k], locale)}</option>)}
            </select>
          </Field>
        </div>
        <p className={cn("max-w-sm flex-1 text-xs", k.muted)}>{tx(locale, "Se crea un borrador en tu agencia con la dirección, zona, m² y precio de la captación. Podrás completarlo antes de publicar.", "A draft is created in your agency with the capture’s address, area, m² and price. You can complete it before publishing.")}</p>
        <Button size="sm" variant="navy" className={k.navy} disabled={rowBusy === c.id} onClick={convert}>
          {rowBusy === c.id ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />} {tx(locale, "Crear borrador", "Create draft")}
        </Button>
        <Button size="sm" variant="ghost" className={k.ghost} type="button" onClick={() => setConverting(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
      </div>
    );

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Cola de captación", "Capture queue")}>
      {rowErr && <div role="alert" className={cn("mb-4", k.err)}>{rowErr}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_380px]">
        {/* Phones: one card per capture (full address, owner, figures and actions); tablets and up keep the table. */}
        <ul className="space-y-3 self-start md:hidden" aria-label={tx(locale, "Cola de captación", "Capture queue")} data-testid="capture-cards">
          {rows.map((c) => (
            <li key={c.id} className={cn(k.card, "p-4")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold leading-snug [overflow-wrap:anywhere]">{c.address}</div>
                  <div className={cn("mt-0.5 text-xs", k.muted)}>{c.zone} · <TimeAgo iso={c.createdAt} locale={locale} /></div>
                </div>
                <Pill tone={TONE[c.result]} className="shrink-0">{label[c.result]}</Pill>
              </div>
              {c.duplicateOf && <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-semibold", k.warnText)}><Fingerprint size={12} className="shrink-0" /> <span className="min-w-0 [overflow-wrap:anywhere]">= {titles[c.duplicateOf] ?? c.duplicateOf}</span></div>}
              <dl className={cn("mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-2 rounded-xl px-3 py-2.5", k.soft)}>
                <div className="min-w-0">
                  <dt className={cn(k.label, "text-[10px]")}>{tx(locale, "Dueño", "Owner")}</dt>
                  <dd className="mt-0.5 text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{c.ownerName}</dd>
                  <dd className={cn("text-xs [overflow-wrap:anywhere]", k.muted)}>{c.phone}</dd>
                </div>
                <div className="min-w-0">
                  <dt className={cn(k.label, "text-[10px]")}>m²</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{c.areaM2}</dd>
                </div>
                <div className="min-w-0 text-right">
                  <dt className={cn(k.label, "text-[10px]")}>{tx(locale, "Pide", "Asking")}</dt>
                  <dd className={cn("mt-0.5 whitespace-nowrap text-sm tracking-normal", k.num)}>{money(c.askingPrice, locale)}</dd>
                </div>
              </dl>
              {(c.result === "PENDING" || c.listingId) && <div className="mt-3">{actions(c)}</div>}
              {converting?.id === c.id && <div className={cn("mt-3 rounded-xl p-3", k.soft)}>{convertPanel(c)}</div>}
            </li>
          ))}
          {rows.length === 0 && <li className={cn(k.card, "px-4 py-10 text-center", k.muted)}>{tx(locale, "La cola está vacía. Registra la primera captación con el formulario.", "The queue is empty. Log the first capture with the form.")}</li>}
        </ul>
        <ScrollRegion fade={false} label={tx(locale, "Cola de captación", "Capture queue")} className={cn("hidden self-start md:block", k.card)}>
          <table className="np-sticky-last w-full min-w-[860px] text-sm">
            <thead className={cn("border-b text-left", k.line, k.th)}>
              <tr><th className="px-4 py-3">{tx(locale, "Dirección", "Address")}</th><th className="px-3 py-3">{tx(locale, "Dueño", "Owner")}</th><th className="px-3 py-3 text-right">m²</th><th className="px-3 py-3 text-right">{tx(locale, "Pide", "Asking")}</th><th className="px-3 py-3">{tx(locale, "Resultado", "Result")}</th><th className="px-3 py-3" /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Fragment key={c.id}>
                <tr className={cn("border-t align-top first:border-t-0", k.line)}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{c.address}</div>
                    <div className={cn("text-xs", k.muted)}>{c.zone} · <TimeAgo iso={c.createdAt} locale={locale} /></div>
                    {c.duplicateOf && <div className={cn("mt-1 flex items-center gap-1 text-xs font-semibold", k.warnText)}><Fingerprint size={12} /> = {titles[c.duplicateOf] ?? c.duplicateOf}</div>}
                  </td>
                  <td className="px-3 py-3"><div>{c.ownerName}</div><div className={cn("text-xs", k.muted)}>{c.phone}</div></td>
                  <td className="px-3 py-3 text-right">{c.areaM2}</td>
                  <td className={cn("whitespace-nowrap px-3 py-3 text-right tracking-normal", k.num)}>{money(c.askingPrice, locale)}</td>
                  <td className="px-3 py-3"><Pill tone={TONE[c.result]}>{label[c.result]}</Pill></td>
                  <td className="px-3 py-3">{actions(c)}</td>
                </tr>
                {converting?.id === c.id && (
                  <tr className={k.soft}>
                    <td colSpan={6} className="px-4 py-3">
                      {convertPanel(c)}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className={cn("px-4 py-10 text-center", k.muted)}>{tx(locale, "La cola está vacía. Registra la primera captación con el formulario.", "The queue is empty. Log the first capture with the form.")}</td></tr>
              )}
            </tbody>
          </table>
        </ScrollRegion>
        <form
          className={cn(k.card, "self-start p-5 md:p-6")}
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
          <h2 className={k.title}>{tx(locale, "Nueva captación", "New capture")}</h2>
          <div className="mt-3 space-y-3">
            <Field label={tx(locale, "Dirección", "Address")}><input required minLength={5} className={k.input} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <Field label={tx(locale, "Zona", "Area")}>
              <select className={k.input} value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })}>
                {zones.map((z) => <option key={z.slug}>{z.name}</option>)}
              </select>
            </Field>
            <Field label={tx(locale, "Tipo de inmueble", "Property type")}>
              <select className={k.input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                {KINDS.map(([k, es, en]) => <option key={k} value={k}>{tx(locale, es, en)}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="m²"><input className={k.input} type="number" min={1} value={f.areaM2} onChange={(e) => setF({ ...f, areaM2: +e.target.value })} /></Field>
              <Field label={tx(locale, "Precio pedido", "Asking")}><input className={k.input} type="number" min={1} value={f.askingPrice} onChange={(e) => setF({ ...f, askingPrice: +e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label={tx(locale, "Dueño", "Owner")}><input required minLength={2} className={k.input} value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} /></Field>
              <Field label={tx(locale, "Teléfono", "Phone")}><input required minLength={6} className={k.input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            </div>
          </div>
          {f.address.length >= 6 && (
            <div className={cn("np-in mt-4", dup ? k.warnBox : k.okBox)}>
              <div className="flex items-center gap-2 font-semibold">{checking ? <Loader2 size={16} className="animate-spin" /> : dup ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}{dup ? tx(locale, "Posible duplicado", "Possible duplicate") : tx(locale, "Sin duplicados", "No duplicates")}</div>
              <div className="mt-1 text-xs text-navy/75 dark:text-ivory/75">{dup ? (dup.zone ? `${dup.title} · ${dup.zone} · ${dup.areaM2} m²` : dup.title ?? tx(locale, "Ya existe en otra agencia (no público)", "Already listed by another agency (not public)")) : tx(locale, "Fingerprint: lat/lng + m² + hash de dirección", "Fingerprint: lat/lng + m² + address hash")}</div>
              <div className="mt-1 font-mono text-[10px] text-navy/55 dark:text-ivory/55">{dup?.fingerprint ?? fp}</div>
            </div>
          )}
          {err && <div role="alert" className={cn("mt-3", k.err)}>{err}</div>}
          <Button className={cn("mt-4 w-full", k.primary)} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {dup ? tx(locale, "Registrar como duplicado", "Log as duplicate") : tx(locale, "Añadir a la cola", "Add to queue")}</Button>
          <div className="mt-3 flex gap-2"><Chip>{tx(locale, "1 inmueble = 1 unidad física", "1 listing = 1 physical unit")}</Chip></div>
        </form>
      </div>
    </AdminShell>
  );
}
