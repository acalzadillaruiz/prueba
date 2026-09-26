"use client";

import Link from "next/link";
import { AlarmClock, ArrowUpRight, Download, Eye, Heart, Timer } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge, Button, Card, Stat } from "@/components/ui";
import { BarChart, Funnel, Spark } from "./charts";
import { useDemo } from "@/lib/store";
import { LISTINGS, listingById } from "@/mock/listings";
import { TOURS } from "@/mock/ops";
import { USERS, userById } from "@/mock/people";
import { ago, dateTime, money, num, tx } from "@/lib/i18n";

const LEADS_14D = [6, 9, 7, 11, 8, 5, 4, 10, 13, 9, 12, 14, 8, 12];

export function AgencyDashboard({ locale }: { locale: Locale }) {
  const { leads, userId } = useDemo();
  const me = userById(userId ?? undefined);
  const isAgent = me?.role === "AGENT";
  const mine = LISTINGS.filter((l) => l.agencyId === "ag-andes" && (!isAgent || l.agentId === me?.id));
  const active = mine.filter((l) => l.status === "ACTIVE" || l.status === "UNDER_OFFER");
  const agencyLeads = leads.filter((l) => l.agencyId === "ag-andes" && (!isAgent || l.agentId === me?.id));
  const newLeads = agencyLeads.filter((l) => l.stage === "NEW");
  const agents = USERS.filter((u) => u.agencyId === "ag-andes" && u.role === "AGENT");
  const ranking = agents
    .map((a, i) => ({ a, leads: agencyLeads.filter((l) => l.agentId === a.id).length + [8, 5, 2][i], won: [3, 2, 0][i], resp: [6, 11, 24][i], gmv: [412000, 265000, 0][i] }))
    .sort((x, y) => y.won - x.won);
  const top = [...mine].sort((a, b) => b.stats.leads - a.stats.leads).slice(0, 6);
  const days = LEADS_14D.map((v, i) => ({ label: dateTime(new Date(Date.parse("2026-09-26T18:00:00Z") - (13 - i) * 864e5).toISOString(), locale, { day: "numeric", month: "short" }), value: v }));
  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={isAgent ? tx(locale, "Mi rendimiento", "My performance") : tx(locale, "Panel · Andes Prime", "Dashboard · Andes Prime")}
      actions={<Button size="sm" variant="dark-outline" href={`/${locale}/agency/reports`}><Download size={14} /> CSV</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat dark label={tx(locale, "Inmuebles activos", "Active listings")} value={active.length} delta="+3" hint={tx(locale, "vs. mes anterior", "vs. last month")} />
        <Stat dark label={tx(locale, "Leads 7 días", "Leads 7 days")} value={LEADS_14D.slice(7).reduce((a, b) => a + b, 0) + (agencyLeads.length - 12 > 0 ? agencyLeads.length - 12 : 0)} delta="+18%" />
        <Stat dark label={tx(locale, "Conversión lead → visita", "Lead → tour")} value="31 %" delta="+4 pts" />
        <Stat dark label={tx(locale, "Tiempo medio a visita", "Avg. time to tour")} value="2,4 d" delta="-0,6 d" hint={tx(locale, "menor es mejor", "lower is better")} />
        <Stat dark label={tx(locale, "SLA 15 min cumplido", "15-min SLA met")} value="87 %" delta="+5 pts" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card dark className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-lg font-semibold">{tx(locale, "Leads por día", "Leads per day")}</div>
            <span className="text-xs text-mist">{tx(locale, "Últimos 14 días", "Last 14 days")}</span>
          </div>
          <BarChart data={days} height={200} />
        </Card>
        <Card dark className="p-5">
          <div className="mb-4 font-display text-lg font-semibold">{tx(locale, "Embudo (30 días)", "Funnel (30 days)")}</div>
          <Funnel steps={[{ label: tx(locale, "Leads", "Leads"), value: 164 }, { label: tx(locale, "Contactados", "Contacted"), value: 142 }, { label: tx(locale, "Visitas", "Tours"), value: 51 }, { label: tx(locale, "Ofertas", "Offers"), value: 14 }, { label: tx(locale, "Cerrados", "Won"), value: 5 }]} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
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
                  <th className="pb-2 pl-4 font-semibold">{tx(locale, "Tendencia", "Trend")}</th>
                </tr>
              </thead>
              <tbody>
                {top.map((l, i) => (
                  <tr key={l.id} className="border-t border-navy-line">
                    <td className="py-2.5">
                      <Link href={`/${locale}/agency/listings/${l.id}/edit`} className="flex items-center gap-3 hover:text-coral">
                        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l.id, 0)} className="h-9 w-12 shrink-0 rounded" />
                        <span className="line-clamp-1 font-semibold">{tx(locale, l.title_es, l.title_en)}</span>
                      </Link>
                    </td>
                    <td className="text-right">{num(l.stats.impressions, locale)}</td>
                    <td className="text-right">{l.stats.saves}</td>
                    <td className="text-right font-semibold">{l.stats.leads}</td>
                    <td className="text-right">{Math.floor(l.stats.avgTimeSec / 60)}:{String(l.stats.avgTimeSec % 60).padStart(2, "0")}</td>
                    <td className="pl-4"><Spark values={[3, 5, 4, 6, 5, 7, 8].map((v) => v + ((i * 7 + v) % 4))} className="h-6 w-24" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card dark className="p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Ranking de agentes", "Agent ranking")}</div>
          <div className="space-y-3">
            {ranking.map(({ a, leads: n, won, resp, gmv }, i) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="w-4 font-display text-mist">{i + 1}</span>
                <Avatar initials={a.initials} hue={a.hue} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-mist">{n} leads · {won} {tx(locale, "cierres", "won")} · {tx(locale, "resp.", "resp.")} {resp} min</div>
                </div>
                <div className="text-right font-display text-sm">{gmv ? money(gmv, locale) : "—"}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card dark className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><AlarmClock size={18} className="text-coral" /> {tx(locale, "Leads sin responder", "Unanswered leads")}</div>
            <Link href={`/${locale}/agency/leads`} className="text-sm text-coral">Inbox <ArrowUpRight size={13} className="inline" /></Link>
          </div>
          {newLeads.slice(0, 4).map((ld) => {
            const mins = Math.round((Date.parse("2026-09-26T18:00:00Z") - Date.parse(ld.createdAt)) / 60000);
            return (
              <div key={ld.id} className="flex items-center gap-3 border-t border-navy-line py-2.5 text-sm">
                <span className="font-semibold">{ld.name}</span>
                <span className="line-clamp-1 flex-1 text-mist">{tx(locale, listingById(ld.listingId)!.title_es, listingById(ld.listingId)!.title_en)}</span>
                <Badge tone={mins > 15 ? "danger" : "warn"} className={mins > 15 ? "bg-[#B4231833] text-[#FF8A7A]" : "bg-[#C9862A33] text-[#F2B866]"}>{mins > 15 ? tx(locale, "SLA vencido", "SLA breached") : `${15 - mins} min`}</Badge>
              </div>
            );
          })}
        </Card>
        <Card dark className="p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Próximas visitas", "Upcoming tours")}</div>
          {TOURS.filter((t) => t.status !== "DONE").slice(0, 5).map((t) => {
            const l = listingById(t.listingId)!;
            const a = userById(t.agentId)!;
            return (
              <div key={t.id} className="flex items-center gap-3 border-t border-navy-line py-2.5 text-sm">
                <span className="w-32 font-display capitalize">{dateTime(t.start, locale)}</span>
                <span className="line-clamp-1 flex-1">{t.seekerName} · <span className="text-mist">{l.zone}</span></span>
                <Avatar initials={a.initials} hue={a.hue} size={22} />
                <Badge className={t.status === "CONFIRMED" ? "bg-[#2F6F4E40] text-[#7FD3A8]" : "bg-[#C9862A33] text-[#F2B866]"}>{t.status === "CONFIRMED" ? "OK" : tx(locale, "Pend.", "Pend.")}</Badge>
              </div>
            );
          })}
          <div className="mt-2 text-xs text-mist">{tx(locale, "Actualizado", "Updated")} {ago(new Date(Date.parse("2026-09-26T18:00:00Z") - 15000).toISOString(), locale)} · polling 15 s</div>
        </Card>
      </div>
    </AdminShell>
  );
}
