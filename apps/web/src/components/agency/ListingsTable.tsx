"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSignature, Filter, Plus, Rocket, UserPlus, XCircle } from "lucide-react";
import type { ListingStatus, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { StatusBadge } from "@/components/listing/bits";
import { Avatar, Button } from "@/components/ui";
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
    <AdminShell locale={locale} area="agency" title={tx(locale, "Inmuebles", "Listings")} actions={user?.role !== "PHOTOGRAPHER" && user?.role !== "CAPTOR" ? <Button size="sm" href={`/${locale}/agency/listings/new`}><Plus size={15} /> {tx(locale, "Nuevo inmueble", "New listing")}</Button> : undefined}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map(([k, t]) => (
          <button key={k} onClick={() => setStatus(k)} className={cn("rounded-full border px-3.5 py-1.5 font-display text-sm", status === k ? "border-coral bg-coral-cta text-white" : "border-navy-line text-ivory/80 hover:bg-white/5")}>
            {t} {k === "REVIEW" && <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{review.length}</span>}
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-64">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(locale, "Buscar título, zona, agente…", "Search title, area, agent…")} aria-label={tx(locale, "Buscar inmuebles", "Search listings")} className="h-9 w-full rounded-lg border border-navy-line bg-navy pl-9 pr-3 text-sm placeholder:text-mist/60 focus:border-coral focus:outline-none" />
        </label>
      </div>
      {error && <div className="mb-3 rounded-lg bg-[#B423181A] px-3 py-2 text-sm text-danger" role="alert">{error}</div>}
      {mandates.length > 0 && (
        <section className="mb-5 rounded-np border border-gold/40 bg-navy-card p-4" aria-labelledby="mandates-title" data-testid="mandates">
          <div id="mandates-title" className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><FileSignature size={17} className="text-gold" /> {tx(locale, "Encargos de propietarios", "Owner mandates")} <span className="rounded-full bg-white/10 px-2 text-xs">{mandates.length}</span></div>
          <p className="mb-3 text-xs text-mist">{tx(locale, "Solicitado → asigna un agente → publícalo cuando la ficha esté lista.", "Requested → assign an agent → publish when the listing is ready.")}</p>
          <div className="divide-y divide-navy-line">
            {mandates.map((m) => {
              const title = m.listing ? tx(locale, m.listing.title_es, m.listing.title_en) : "—";
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm" data-mandate={m.id}>
                  <div className="min-w-0 flex-1 basis-60">
                    {m.status === "ASSIGNED" && m.listing ? <Link href={`/${locale}/agency/listings/${m.listing.id}/edit`} className="line-clamp-1 font-semibold hover:text-coral">{title}</Link> : <div className="line-clamp-1 font-semibold">{title}</div>}
                    <div className="text-xs text-mist">{m.ownerName}{m.listing ? ` · ${m.listing.zone}, ${m.listing.city} · ${money(m.listing.priceAmount, locale)}` : ""} · {ago(m.createdAt, locale)}</div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", m.status === "REQUESTED" ? "bg-[#C9862A33] text-[#F2B866]" : "bg-[#2F6F4E40] text-[#7FD3A8]")}>{m.status === "REQUESTED" ? tx(locale, "Solicitado", "Requested") : tx(locale, "Asignado", "Assigned")}</span>
                  {manager && (
                    <select value={m.agentId ?? ""} disabled={busy === m.id} onChange={(e) => e.target.value && patch(m.id, { agentId: e.target.value }, `mandates/${m.id}`)} className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs" aria-label={tx(locale, `Agente del encargo ${title}`, `Agent for mandate ${title}`)}>
                      <option value="" disabled>{tx(locale, "Asignar agente…", "Assign agent…")}</option>
                      {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                    </select>
                  )}
                  {m.status === "ASSIGNED" && (
                    <Button size="sm" disabled={busy === m.id} onClick={() => patch(m.id, { status: "ACTIVE" }, `mandates/${m.id}`)}><Rocket size={14} /> {tx(locale, "Publicar", "Publish")}</Button>
                  )}
                  {manager && (
                    <Button size="sm" variant="dark-ghost" disabled={busy === m.id} onClick={() => patch(m.id, { status: "CANCELLED" }, `mandates/${m.id}`)} aria-label={tx(locale, `Rechazar encargo ${title}`, `Decline mandate ${title}`)}><XCircle size={14} /> {tx(locale, "Rechazar", "Decline")}</Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
            <tr>
              <th className="px-4 py-3 font-semibold">{tx(locale, "Inmueble", "Listing")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Estado", "Status")}</th>
              <th className="px-3 py-3 text-right font-semibold">{tx(locale, "Precio", "Price")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Agente", "Agent")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Calidad", "Quality")}</th>
              <th className="px-3 py-3 text-right font-semibold">Leads</th>
              <th className="px-3 py-3 text-right font-semibold">{tx(locale, "Días", "Days")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Actualizado", "Updated")}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const inReview = review.includes(l.id);
              const a = l.agent;
              return (
                <tr key={l.id} className="border-t border-navy-line hover:bg-white/[.03]">
                  <td className="px-4 py-2.5">
                    <Link href={`/${locale}/agency/listings/${l.id}/edit`} className="flex items-center gap-3">
                      <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-11 w-14 shrink-0 rounded-md" />
                      <div className="min-w-0">
                        <div className="line-clamp-1 font-semibold hover:text-coral">{tx(locale, l.title_es, l.title_en)}</div>
                        <div className="text-xs text-mist">{lbl(TYPE_LABEL[l.listingType], locale)} · {l.zone} · {num(l.areaM2, locale)} m²</div>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3">{inReview ? <span className="whitespace-nowrap rounded-full bg-[#C9862A33] px-2 py-0.5 text-[11px] font-bold uppercase text-[#F2B866]">{tx(locale, "En revisión", "In review")}</span> : l.review === "REJECTED" ? <span className="rounded-full bg-[#B4231833] px-2 py-0.5 text-[11px] font-bold uppercase text-[#FF8A7A]">{tx(locale, "Rechazado", "Rejected")}</span> : <StatusBadge status={l.status} locale={locale} />}</td>
                  <td className="px-3 text-right font-display">{money(l.priceAmount, locale)}<span className="text-xs text-mist">{priceSuffix(l, locale)}</span></td>
                  <td className="px-3">
                    <select value={l.agentId ?? ""} disabled={!manager || busy === l.id} onChange={(e) => patch(l.id, { agentId: e.target.value || null })} className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs" aria-label={tx(locale, "Agente", "Agent")}>
                      <option value="">—</option>
                      {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-white/10"><div className={cn("h-full rounded-full", l.quality >= 85 ? "bg-ok" : l.quality >= 65 ? "bg-warn" : "bg-danger")} style={{ width: `${l.quality}%` }} /></div>
                      <span className="text-xs font-semibold">{l.quality}</span>
                    </div>
                  </td>
                  <td className="px-3 text-right font-semibold">{l.stats.leads}</td>
                  <td className="px-3 text-right">{l.daysOnMarket}</td>
                  <td className="px-3 text-xs text-mist" suppressHydrationWarning>{ago(l.updatedAt, locale)}</td>
                  <td className="px-3">
                    {inReview && manager ? (
                      <div className="flex gap-1">
                        <Button size="sm" disabled={busy === l.id} onClick={() => patch(l.id, { review: "APPROVED" })}><CheckCircle2 size={14} /> {tx(locale, "Aprobar", "Approve")}</Button>
                        <Button size="sm" variant="dark-ghost" disabled={busy === l.id} onClick={() => patch(l.id, { review: "REJECTED" })} aria-label={tx(locale, "Rechazar publicación", "Reject listing")} title={tx(locale, "Rechazar publicación", "Reject listing")}><XCircle size={14} /></Button>
                      </div>
                    ) : (
                      a && <Avatar initials={a.name.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={a.hue} size={24} />
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-mist">{tx(locale, "No hay inmuebles con este filtro.", "No listings match this filter.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-mist"><UserPlus size={13} /> {tx(locale, "Backoffice y dueño pueden reasignar agentes. Los agentes solo editan sus inmuebles.", "Backoffice and owner can reassign agents. Agents only edit their own listings.")}</div>
    </AdminShell>
  );
}
