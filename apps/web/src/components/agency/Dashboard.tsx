"use client";

import Link from "next/link";
import { AlarmClock, ArrowUpRight, Download, Eye, Heart, Timer } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge, Button, Card, Stat } from "@/components/ui";
import { BarChart, Funnel } from "./charts";
import { useApp } from "@/lib/store";
import type { Lead, Listing, Tour } from "@/types/domain";
import type { DashboardStats } from "@/server/agency-stats";
import { dateTime, dwell, money, num, tx } from "@/lib/i18n";

export function AgencyDashboard({ locale, stats, listings, newLeads, tours, agencyName }: { locale: Locale; stats: DashboardStats; listings: Listing[]; newLeads: Lead[]; tours: (Tour & { agentName: string; agentHue: number })[]; agencyName: string }) {
  const { user } = useApp();
  const isAgent = user?.role === "AGENT";
  const byId = new Map(listings.map((l) => [l.id, l]));
  const top = [...listings].sort((a, b) => b.stats.leads - a.stats.leads).slice(0, 6);
  const days = stats.perDay.map((d) => ({ label: dateTime(d.date, locale, { day: "numeric", month: "short" }), value: d.value }));
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={isAgent ? tx(locale, "Mi rendimiento", "My performance") : `${tx(locale, "Panel", "Dashboard")} · ${agencyName}`}
      actions={isAgent ? undefined : <Button size="sm" variant="dark-outline" href={`/${locale}/agency/reports`}><Download size={14} /> CSV</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat dark label={tx(locale, "Inmuebles activos", "Active listings")} value={stats.activeListings} delta={stats.activeDelta ? sign(stats.activeDelta) : undefined} hint={tx(locale, "nuevos en 30 días", "new in 30 days")} />
        <Stat dark label={tx(locale, "Leads 7 días", "Leads 7 days")} value={stats.leads7d} delta={`${sign(stats.leadsDeltaPct)}%`} hint={tx(locale, "vs. semana anterior", "vs. previous week")} />
        <Stat dark label={tx(locale, "Conversión lead → visita", "Lead → tour")} value={`${stats.convTourPct} %`} hint={tx(locale, "últimos 30 días", "last 30 days")} />
        <Stat dark label={tx(locale, "Tiempo medio a visita", "Avg. time to tour")} value={stats.avgDaysToTour === null ? "—" : `${String(stats.avgDaysToTour).replace(".", locale === "es" ? "," : ".")} d`} hint={tx(locale, "desde el lead", "from lead")} />
        <Stat dark label={tx(locale, "SLA 15 min cumplido", "15-min SLA met")} value={stats.slaPct === null ? "—" : `${stats.slaPct} %`} hint={tx(locale, "primera respuesta", "first response")} />
      </div>

      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-3">
        <Card dark className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-lg font-semibold">{tx(locale, "Leads por día", "Leads per day")}</div>
            <span className="text-xs text-mist">{tx(locale, "Últimos 14 días", "Last 14 days")}</span>
          </div>
          <BarChart data={days} height={200} />
        </Card>
        <Card dark className="p-5">
          <div className="mb-4 font-display text-lg font-semibold">{tx(locale, "Embudo (30 días)", "Funnel (30 days)")}</div>
          <Funnel steps={[{ label: tx(locale, "Leads", "Leads"), value: stats.funnel.NEW }, { label: tx(locale, "Contactados", "Contacted"), value: stats.funnel.CONTACTED }, { label: tx(locale, "Visitas", "Tours"), value: stats.funnel.TOUR }, { label: tx(locale, "Ofertas", "Offers"), value: stats.funnel.OFFER }, { label: tx(locale, "Cerrados", "Won"), value: stats.funnel.WON }]} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-3">
        <Card dark className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-lg font-semibold">{tx(locale, "Rendimiento por anuncio", "Performance by listing")}</div>
            <Link href={`/${locale}/agency/listings`} className="text-sm text-coral">{tx(locale, "Ver todos", "See all")}</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-mist">
                <tr>
                  <th className="pb-2 font-semibold">{tx(locale, "Inmueble", "Listing")}</th>
                  <th className="pb-2 text-right font-semibold"><Eye size={13} className="inline" /> {tx(locale, "Impr.", "Impr.")}</th>
                  <th className="pb-2 text-right font-semibold"><Heart size={13} className="inline" /> Saves</th>
                  <th className="pb-2 text-right font-semibold">Leads</th>
                  <th className="pb-2 text-right font-semibold"><Timer size={13} className="inline" /> {tx(locale, "Tiempo", "Time")}</th>
                  <th className="pb-2 pl-4 text-right font-semibold" title={tx(locale, "Leads por cada 1.000 impresiones", "Leads per 1,000 impressions")}>{tx(locale, "Conversión", "Conversion")}</th>
                </tr>
              </thead>
              <tbody>
                {top.map((l) => (
                  <tr key={l.id} className="border-t border-navy-line">
                    <td className="py-2.5">
                      <Link href={`/${locale}/agency/listings/${l.id}/edit`} className="flex items-center gap-3 hover:text-coral">
                        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-9 w-12 shrink-0 rounded" />
                        <span className="line-clamp-1 font-semibold">{tx(locale, l.title_es, l.title_en)}</span>
                      </Link>
                    </td>
                    <td className="text-right">{num(l.stats.impressions, locale)}</td>
                    <td className="text-right">{l.stats.saves}</td>
                    <td className="text-right font-semibold">{l.stats.leads}</td>
                    <td className="text-right">{dwell(l.stats.avgTimeSec)}</td>
                    <td className="pl-4 text-right text-mist">{l.stats.impressions ? `${new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", { maximumFractionDigits: 1 }).format((l.stats.leads / l.stats.impressions) * 1000)} ‰` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card dark className="p-5">
          <div className="mb-3 font-display text-lg font-semibold">{isAgent ? tx(locale, "Mis resultados", "My results") : tx(locale, "Ranking de agentes", "Agent ranking")}</div>
          {stats.ranking.length === 0 && <div className="text-sm text-mist">{tx(locale, "Aún no hay agentes en el equipo.", "No agents on the team yet.")}</div>}
          <div className="space-y-3">
            {stats.ranking.map(({ id, name, hue, leads: n, won, respMin, gmv }, i) => (
              <div key={id} className="flex items-center gap-3">
                <span className="w-4 font-display text-mist">{i + 1}</span>
                <Avatar initials={name.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={hue} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{name}</div>
                  <div className="text-xs text-mist">{n} leads · {won} {tx(locale, "cierres", "won")} · {tx(locale, "resp.", "resp.")} {respMin ?? "—"} min</div>
                </div>
                <div className="text-right font-display text-sm">{gmv ? money(gmv, locale) : "—"}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-2">
        <Card dark className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><AlarmClock size={18} className="text-coral" /> {tx(locale, "Leads sin responder", "Unanswered leads")}</div>
            <Link href={`/${locale}/agency/leads`} className="text-sm text-coral">Inbox <ArrowUpRight size={13} className="inline" /></Link>
          </div>
          {newLeads.length === 0 && <div className="text-sm text-mist">{tx(locale, "Todos los leads tienen respuesta.", "Every lead has been answered.")}</div>}
          {newLeads.slice(0, 4).map((ld) => {
            const mins = Math.round((Date.now() - Date.parse(ld.createdAt)) / 60000);
            const l = byId.get(ld.listingId);
            return (
              <div key={ld.id} className="flex items-center gap-3 border-t border-navy-line py-2.5 text-sm">
                <span className="font-semibold">{ld.name}</span>
                <span className="line-clamp-1 flex-1 text-mist">{l ? tx(locale, l.title_es, l.title_en) : ""}</span>
                <Badge tone={mins > 15 ? "danger" : "warn"} className={mins > 15 ? "bg-[#B3261E33] text-[#E79A7F]" : "bg-[#8A5A0033] text-[#F2B866]"}>{mins > 15 ? tx(locale, "SLA vencido", "SLA breached") : `${15 - mins} min`}</Badge>
              </div>
            );
          })}
        </Card>
        <Card dark className="p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Próximas visitas", "Upcoming tours")}</div>
          {tours.length === 0 && <div className="text-sm text-mist">{tx(locale, "Sin visitas próximas.", "No upcoming tours.")}</div>}
          {tours.slice(0, 6).map((t) => {
            const l = byId.get(t.listingId);
            const a = { initials: t.agentName.split(" ").map((p) => p[0]).slice(0, 2).join(""), hue: t.agentHue };
            return (
              <div key={t.id} className="flex items-center gap-3 border-t border-navy-line py-2.5 text-sm">
                <span className="w-32 font-display inline-block first-letter:uppercase">{dateTime(t.start, locale)}</span>
                <span className="line-clamp-1 flex-1">{t.seekerName} · <span className="text-mist">{l?.zone}</span></span>
                <Avatar initials={a.initials} hue={a.hue} size={22} />
                <Badge className={t.status === "CONFIRMED" ? "bg-[#2F6B4F40] text-[#7FC8A4]" : "bg-[#8A5A0033] text-[#F2B866]"}>{t.status === "CONFIRMED" ? "OK" : tx(locale, "Pend.", "Pend.")}</Badge>
              </div>
            );
          })}
          <div className="mt-2 text-xs text-mist">{tx(locale, "Datos en vivo desde la base de datos", "Live data from the database")}</div>
        </Card>
      </div>
    </AdminShell>
  );
}
