"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Filter, Plus, UserPlus } from "lucide-react";
import type { ListingStatus, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { StatusBadge } from "@/components/listing/bits";
import { Avatar, Button } from "@/components/ui";
import { LISTINGS } from "@/mock/listings";
import { USERS, userById } from "@/mock/people";
import { STATUS_LABEL, TYPE_LABEL, ago, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function ListingsTable({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<ListingStatus | "ALL" | "REVIEW">("ALL");
  const [approved, setApproved] = useState<string[]>([]);
  const mine = LISTINGS.filter((l) => l.agencyId === "ag-andes");
  const review = mine.slice(0, 2).map((l) => l.id);
  const agents = USERS.filter((u) => u.agencyId === "ag-andes" && u.role === "AGENT");
  const rows = mine.filter((l) => status === "ALL" || (status === "REVIEW" ? review.includes(l.id) && !approved.includes(l.id) : l.status === status));
  const tabs: [typeof status, string][] = [["ALL", tx(locale, "Todos", "All")], ["REVIEW", tx(locale, "Por aprobar", "To approve")], ["ACTIVE", lbl(STATUS_LABEL.ACTIVE, locale)], ["UNDER_OFFER", lbl(STATUS_LABEL.UNDER_OFFER, locale)], ["COMING_SOON", lbl(STATUS_LABEL.COMING_SOON, locale)], ["SOLD", lbl(STATUS_LABEL.SOLD, locale)], ["DRAFT", lbl(STATUS_LABEL.DRAFT, locale)]];
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Inmuebles", "Listings")} actions={<Button size="sm" href={`/${locale}/agency/listings/${mine[0].id}/edit`}><Plus size={15} /> {tx(locale, "Nuevo inmueble", "New listing")}</Button>}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map(([k, t]) => (
          <button key={k} onClick={() => setStatus(k)} className={cn("rounded-full border px-3.5 py-1.5 font-display text-sm", status === k ? "border-coral bg-coral text-white" : "border-navy-line text-ivory/80 hover:bg-white/5")}>
            {t} {k === "REVIEW" && <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{review.length - approved.length}</span>}
          </button>
        ))}
        <Button size="sm" variant="dark-ghost" className="ml-auto"><Filter size={14} /> {tx(locale, "Filtros", "Filters")}</Button>
      </div>
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
              const a = userById(l.agentId);
              const inReview = review.includes(l.id) && !approved.includes(l.id);
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
                  <td className="px-3">{inReview ? <span className="rounded-full bg-[#C9862A33] px-2 py-0.5 text-[11px] font-bold uppercase text-[#F2B866]">{tx(locale, "En revisión", "In review")}</span> : <StatusBadge status={l.status} locale={locale} />}</td>
                  <td className="px-3 text-right font-display">{money(l.priceAmount, locale)}<span className="text-xs text-mist">{priceSuffix(l, locale)}</span></td>
                  <td className="px-3">
                    <select defaultValue={l.agentId} className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs">
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
                  <td className="px-3 text-xs text-mist">{ago(l.updatedAt, locale)}</td>
                  <td className="px-3">
                    {inReview ? (
                      <Button size="sm" onClick={() => setApproved([...approved, l.id])}><CheckCircle2 size={14} /> {tx(locale, "Aprobar", "Approve")}</Button>
                    ) : (
                      a && <Avatar initials={a.initials} hue={a.hue} size={24} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-mist"><UserPlus size={13} /> {tx(locale, "Backoffice y dueño pueden reasignar agentes. Los agentes solo editan sus inmuebles.", "Backoffice and owner can reassign agents. Agents only edit their own listings.")}</div>
    </AdminShell>
  );
}
