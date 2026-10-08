"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSignature, Filter, Pencil, Plus, Rocket, UserPlus, XCircle } from "lucide-react";
import type { ListingStatus, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button } from "@/components/ui";
import { Count, Initials, Pill, StatusPill, k, tab } from "./kit";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { Listing } from "@/types/domain";
import { STATUS_LABEL, TYPE_LABEL, ago, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export type MandateRow = { id: string; status: "REQUESTED" | "ASSIGNED"; agentId: string | null; ownerName: string; createdAt: string; listing: { id: string; title_es: string; title_en: string; zone: string; city: string; priceAmount: number } | null };

export function ListingsTable({ locale, listings, agents, mandates = [] }: { locale: Locale; listings: Listing[]; agents: { id: string; name: string; hue: number }[]; mandates?: MandateRow[] }) {
  const router = useRouter();
  const { user } = useApp();
  const manager = user?.role === "AGENCY_OWNER" || user?.role === "BACKOFFICE" || user?.role === "SUPERADMIN";
  const [status, setStatus] = useState<ListingStatus | "ALL" | "REVIEW">("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mine = q ? listings.filter((l) => norm(`${l.title_es} ${l.title_en} ${l.zone} ${l.city} ${l.address} ${l.agent?.name ?? ""}`).includes(norm(q))) : listings;
  const patch = async (id: string, json: object, path = `listings/${id}`) => {
    setBusy(id);
    setError(null);
    try {
      await api(path, { method: "PATCH", json });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const review = mine.filter((l) => l.review === "PENDING").map((l) => l.id);
  const rows = mine.filter((l) => status === "ALL" || (status === "REVIEW" ? review.includes(l.id) : l.status === status));
  const tabs: [typeof status, string][] = [["ALL", tx(locale, "Todos", "All")], ["REVIEW", tx(locale, "Por aprobar", "To approve")], ["ACTIVE", lbl(STATUS_LABEL.ACTIVE, locale)], ["UNDER_OFFER", lbl(STATUS_LABEL.UNDER_OFFER, locale)], ["COMING_SOON", lbl(STATUS_LABEL.COMING_SOON, locale)], ["SOLD", lbl(STATUS_LABEL.SOLD, locale)], ["RENTED", lbl(STATUS_LABEL.RENTED, locale)], ["WITHDRAWN", lbl(STATUS_LABEL.WITHDRAWN, locale)], ["DRAFT", lbl(STATUS_LABEL.DRAFT, locale)]];
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Inmuebles", "Listings")} actions={user?.role !== "PHOTOGRAPHER" && user?.role !== "CAPTOR" ? <Button className={k.primary} href={`/${locale}/agency/listings/new`}><Plus size={16} /> {tx(locale, "Nuevo inmueble", "New listing")}</Button> : undefined}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.map(([key, t]) => (
          <button key={key} onClick={() => setStatus(key)} aria-pressed={status === key} className={tab(status === key)}>
            {t} {key === "REVIEW" && <Count>{review.length}</Count>}
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-72">
          <Filter size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", k.muted)} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(locale, "Buscar título, zona, agente…", "Search title, area, agent…")} aria-label={tx(locale, "Buscar inmuebles", "Search listings")} className={cn(k.input, "rounded-full pl-10")} />
        </label>
      </div>
      {error && <div className={cn("mb-3", k.err)} role="alert">{error}</div>}
      {mandates.length > 0 && (
        <section className={cn(k.card, "mb-6 p-5 md:p-6")} aria-labelledby="mandates-title" data-testid="mandates">
          <h2 id="mandates-title" className={cn(k.title, "mb-1 flex items-center gap-2.5")}><FileSignature size={18} strokeWidth={1.6} className="text-gold-text dark:text-[#D4B98C]" /> {tx(locale, "Encargos de propietarios", "Owner mandates")} <Count>{mandates.length}</Count></h2>
          <p className={cn("mb-3 text-[13px]", k.muted)}>{tx(locale, "Solicitado → asigna un agente → publícalo cuando la ficha esté lista.", "Requested → assign an agent → publish when the listing is ready.")}</p>
          <div className={cn("divide-y", k.divide)}>
            {mandates.map((m) => {
              const title = m.listing ? tx(locale, m.listing.title_es, m.listing.title_en) : "—";
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm" data-mandate={m.id}>
                  <div className="min-w-0 flex-1 basis-60">
                    {m.status === "ASSIGNED" && m.listing ? <Link href={`/${locale}/agency/listings/${m.listing.id}/edit`} className="line-clamp-1 font-semibold underline-offset-4 hover:underline">{title}</Link> : <div className="line-clamp-1 font-semibold">{title}</div>}
                    <div className={cn("text-xs", k.muted)}>{m.ownerName}{m.listing ? ` · ${m.listing.zone}, ${m.listing.city} · ${money(m.listing.priceAmount, locale)}` : ""} · {ago(m.createdAt, locale)}</div>
                  </div>
                  <Pill tone={m.status === "REQUESTED" ? "arena" : "egeo"}>{m.status === "REQUESTED" ? tx(locale, "Solicitado", "Requested") : tx(locale, "Asignado", "Assigned")}</Pill>
                  {manager && (
                    <select value={m.agentId ?? ""} disabled={busy === m.id} onChange={(e) => e.target.value && patch(m.id, { agentId: e.target.value }, `mandates/${m.id}`)} className={k.select} aria-label={tx(locale, `Agente del encargo ${title}`, `Agent for mandate ${title}`)}>
                      <option value="" disabled>{tx(locale, "Asignar agente…", "Assign agent…")}</option>
                      {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                    </select>
                  )}
                  {m.status === "ASSIGNED" && (
                    <Button size="sm" variant="navy" className={k.navy} disabled={busy === m.id} onClick={() => patch(m.id, { status: "ACTIVE" }, `mandates/${m.id}`)}><Rocket size={14} /> {tx(locale, "Publicar", "Publish")}</Button>
                  )}
                  {manager && declineId !== m.id && (
                    <Button size="sm" variant="ghost" className={k.ghost} disabled={busy === m.id} onClick={() => setDeclineId(m.id)} aria-label={tx(locale, `Rechazar encargo ${title}`, `Decline mandate ${title}`)}><XCircle size={14} /> {tx(locale, "Rechazar", "Decline")}</Button>
                  )}
                  {manager && declineId === m.id && (
                    <span role="group" aria-label={tx(locale, "Confirmar rechazo", "Confirm decline")} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{tx(locale, "¿Rechazar este encargo? El propietario dejará de verlo como activo.", "Decline this mandate? The owner will no longer see it as active.")}</span>
                      <Button size="sm" variant="navy" className={k.navy} disabled={busy === m.id} onClick={() => { setDeclineId(null); patch(m.id, { status: "CANCELLED" }, `mandates/${m.id}`); }}>{tx(locale, "Sí, rechazar", "Yes, decline")}</Button>
                      <Button size="sm" variant="ghost" className={k.ghost} onClick={() => setDeclineId(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      {/* Phones: one card per listing (every column + the row actions stay visible). Tablets and up: the table. */}
      <ul className="space-y-3 md:hidden" aria-label={tx(locale, "Inmuebles", "Listings")}>
        {rows.map((l) => {
          const title = tx(locale, l.title_es, l.title_en);
          const inReview = review.includes(l.id);
          const edit = `/${locale}/agency/listings/${l.id}/edit`;
          return (
            <li key={l.id} className={cn(k.card, "p-4")} data-listing={l.id}>
              <Link href={edit} className="flex items-start gap-3">
                <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-[68px] w-[88px] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 font-semibold leading-snug">{title}</div>
                  <div className={cn("mt-0.5 text-xs", k.muted)}>{lbl(TYPE_LABEL[l.listingType], locale)} · {l.zone} · {num(l.areaM2, locale)} m²</div>
                  <div className={cn("mt-1 text-[17px] leading-tight", k.num, "tracking-normal")}>{money(l.priceAmount, locale)}<span className={cn("text-xs font-normal", k.muted)}>{priceSuffix(l, locale)}</span></div>
                </div>
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {inReview ? <Pill tone="warn">{tx(locale, "En revisión", "In review")}</Pill> : l.review === "REJECTED" ? <Pill tone="danger">{tx(locale, "Rechazado", "Rejected")}</Pill> : <StatusPill status={l.status} locale={locale} />}
                {l.luxury && <Pill tone="exclusive">{tx(locale, "Exclusiva", "Exclusive")}</Pill>}
                <span className={cn("ml-auto text-xs", k.muted)} suppressHydrationWarning>{ago(l.updatedAt, locale)}</span>
              </div>
              <dl className={cn("mt-3 grid grid-cols-3 gap-2 rounded-xl px-3 py-2.5 text-center", k.soft)}>
                <div className="min-w-0">
                  <dt className={cn(k.label, "text-[10px]")}>{tx(locale, "Calidad", "Quality")}</dt>
                  <dd className="mt-1 flex items-center justify-center gap-1.5">
                    <span className="h-1.5 w-10 rounded-full bg-[#ECE6DA] dark:bg-white/10" aria-hidden><span className={cn("block h-full rounded-full", l.quality >= 85 ? "bg-ok" : l.quality >= 65 ? "bg-warn" : "bg-danger")} style={{ width: `${l.quality}%` }} /></span>
                    <span className="text-xs font-semibold">{l.quality}</span>
                  </dd>
                </div>
                <div>
                  <dt className={cn(k.label, "text-[10px]")}>Leads</dt>
                  <dd className="mt-0.5 font-semibold">{l.stats.leads}</dd>
                </div>
                <div>
                  <dt className={cn(k.label, "text-[10px]")}>{tx(locale, "Días", "Days")}</dt>
                  <dd className="mt-0.5 font-semibold">{l.daysOnMarket}</dd>
                </div>
              </dl>
              <label className="mt-3 flex items-center gap-3 text-sm">
                <span className={cn("shrink-0", k.muted)}>{tx(locale, "Agente", "Agent")}</span>
                <select value={l.agentId ?? ""} disabled={!manager || busy === l.id} onChange={(e) => patch(l.id, { agentId: e.target.value || null })} className={cn(k.select, "h-10 min-w-0 flex-1")} aria-label={tx(locale, `Agente de ${title}`, `Agent for ${title}`)}>
                  <option value="">—</option>
                  {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                </select>
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {inReview && manager && (
                  <>
                    <Button size="sm" variant="navy" className={cn(k.navy, "min-h-10")} disabled={busy === l.id} onClick={() => patch(l.id, { review: "APPROVED" })}><CheckCircle2 size={14} /> {tx(locale, "Aprobar", "Approve")}</Button>
                    <Button size="sm" variant="ghost" className={cn(k.ghost, "min-h-10")} disabled={busy === l.id} onClick={() => patch(l.id, { review: "REJECTED" })} aria-label={tx(locale, `Rechazar publicación de ${title}`, `Reject listing ${title}`)}><XCircle size={14} /> {tx(locale, "Rechazar", "Reject")}</Button>
                  </>
                )}
                <Link href={edit} className={cn("ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm", k.link)} aria-label={tx(locale, `Editar ${title}`, `Edit ${title}`)}><Pencil size={14} aria-hidden /> {tx(locale, "Editar", "Edit")}</Link>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className={cn(k.card, "px-4 py-10 text-center text-sm", k.muted)}>{tx(locale, "No hay inmuebles con este filtro.", "No listings match this filter.")}</li>}
      </ul>
      <div className={cn("hidden overflow-x-auto md:block", k.card)}>
        <table className="w-full min-w-[1120px] text-sm">
          <thead className={cn("border-b text-left", k.line, k.th)}>
            <tr>
              <th className="px-4 py-3 font-semibold">{tx(locale, "Inmueble", "Listing")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Estado", "Status")}</th>
              <th className="px-3 py-3 text-right font-semibold">{tx(locale, "Precio", "Price")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Agente", "Agent")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Calidad", "Quality")}</th>
              <th className="px-3 py-3 text-right font-semibold">Leads</th>
              <th className="px-3 py-3 text-right font-semibold">{tx(locale, "Días", "Days")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Actualizado", "Updated")}</th>
              <th className={cn("sticky right-0 px-3 py-3", k.stickyCol)} />
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const inReview = review.includes(l.id);
              const a = l.agent;
              return (
                <tr key={l.id} className={cn("border-t first:border-t-0", k.line, k.hover)}>
                  <td className="min-w-[230px] px-4 py-3 md:min-w-[300px]">
                    <Link href={`/${locale}/agency/listings/${l.id}/edit`} className="flex items-center gap-3">
                      <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-12 w-16 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <div className="line-clamp-2 font-semibold leading-snug underline-offset-4 hover:underline">{tx(locale, l.title_es, l.title_en)}</div>
                        <div className={cn("text-xs", k.muted)}>{lbl(TYPE_LABEL[l.listingType], locale)} · {l.zone} · {num(l.areaM2, locale)} m²</div>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3"><div className="flex flex-col items-start gap-1">{inReview ? <Pill tone="warn">{tx(locale, "En revisión", "In review")}</Pill> : l.review === "REJECTED" ? <Pill tone="danger">{tx(locale, "Rechazado", "Rejected")}</Pill> : <StatusPill status={l.status} locale={locale} />}{l.luxury && <Pill tone="exclusive">{tx(locale, "Exclusiva", "Exclusive")}</Pill>}</div></td>
                  <td className={cn("whitespace-nowrap px-3 text-right", k.num, "tracking-normal")}>{money(l.priceAmount, locale)}<span className={cn("text-xs font-normal", k.muted)}>{priceSuffix(l, locale)}</span></td>
                  <td className="px-3">
                    <select value={l.agentId ?? ""} disabled={!manager || busy === l.id} onChange={(e) => patch(l.id, { agentId: e.target.value || null })} className={k.select} aria-label={tx(locale, "Agente", "Agent")}>
                      <option value="">—</option>
                      {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-[#ECE6DA] dark:bg-white/10"><div className={cn("h-full rounded-full", l.quality >= 85 ? "bg-ok" : l.quality >= 65 ? "bg-warn" : "bg-danger")} style={{ width: `${l.quality}%` }} /></div>
                      <span className="text-xs font-semibold">{l.quality}</span>
                    </div>
                  </td>
                  <td className="px-3 text-right font-semibold">{l.stats.leads}</td>
                  <td className="px-3 text-right">{l.daysOnMarket}</td>
                  <td className={cn("px-3 text-xs", k.muted)} suppressHydrationWarning>{ago(l.updatedAt, locale)}</td>
                  <td className={cn("sticky right-0 px-3", k.stickyCol)}>
                    {inReview && manager ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="navy" className={k.navy} disabled={busy === l.id} onClick={() => patch(l.id, { review: "APPROVED" })}><CheckCircle2 size={14} /> {tx(locale, "Aprobar", "Approve")}</Button>
                        <Button size="sm" variant="ghost" className={k.ghost} disabled={busy === l.id} onClick={() => patch(l.id, { review: "REJECTED" })} aria-label={tx(locale, "Rechazar publicación", "Reject listing")} title={tx(locale, "Rechazar publicación", "Reject listing")}><XCircle size={14} /></Button>
                      </div>
                    ) : (
                      a && <span title={a.name}><Initials name={a.name} size={28} /></span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className={cn("px-4 py-10 text-center", k.muted)}>{tx(locale, "No hay inmuebles con este filtro.", "No listings match this filter.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={cn("mt-3 flex items-center gap-2 text-xs", k.muted)}><UserPlus size={13} /> {tx(locale, "Backoffice y dueño pueden reasignar agentes. Los agentes solo editan sus inmuebles.", "Backoffice and owner can reassign agents. Agents only edit their own listings.")}</div>
    </AdminShell>
  );
}
