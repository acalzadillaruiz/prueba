"use client";

import Link from "next/link";
import { ArrowUpRight, Download, Plus } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button } from "@/components/ui";
import { BarChart, Funnel } from "./charts";
import { Chip, Empty, Initials, Kpi, Panel, Pill, StatusPill, k, kpiGrid5 } from "./kit";
import { useApp } from "@/lib/store";
import type { Lead, Listing, Tour } from "@/types/domain";
import type { DashboardStats } from "@/server/agency-stats";
import { dateTime, dwell, money, num, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/** "Buenos días" by the Caracas clock (UTC−4, no DST). */
/** 11 min · 3 h · 2 d */
const span = (mins: number) => (mins < 60 ? `${mins}\u00a0min` : mins < 1440 ? `${Math.round(mins / 60)}\u00a0h` : `${Math.round(mins / 1440)}\u00a0d`);

/** Calendar ?w= offset (Caracas weeks, Monday first) of a date, relative to this week. */
const weekOffset = (iso: string) => {
  const monday = (ms: number) => {
    const d = new Date(ms - 4 * 3600e3);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  };
  return Math.round((monday(Date.parse(iso)) - monday(Date.now())) / (7 * 864e5));
};

const greeting = (locale: Locale) => {
  const h = new Date(Date.now() - 4 * 3600e3).getUTCHours();
  return h < 12 ? tx(locale, "Buenos días", "Good morning") : h < 19 ? tx(locale, "Buenas tardes", "Good afternoon") : tx(locale, "Buenas noches", "Good evening");
};

export function AgencyDashboard({ locale, stats, listings, newLeads, tours, agencyName }: { locale: Locale; stats: DashboardStats; listings: Listing[]; newLeads: (Lead & { score?: number | null })[]; tours: (Tour & { agentName: string; agentHue: number })[]; agencyName: string }) {
  const { user } = useApp();
  const isAgent = user?.role === "AGENT";
  const canCreate = !!user && ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"].includes(user.role);
  const byId = new Map(listings.map((l) => [l.id, l]));
  const top = [...listings].sort((a, b) => b.stats.leads - a.stats.leads).slice(0, 6);
  const days = stats.perDay.map((d) => ({ label: dateTime(d.date, locale, { day: "numeric", month: "short" }), value: d.value }));
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  const first = (user?.name ?? "").split(" ")[0];
  const fmt1 = (n: number) => new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", { maximumFractionDigits: 1 }).format(n);
  return (
    <AdminShell
      locale={locale}
      area="agency"
      eyebrow={agencyName ? `New Place · ${agencyName}` : undefined}
      title={isAgent ? tx(locale, "Mi rendimiento", "My performance") : first ? `${greeting(locale)}, ${first}` : `${tx(locale, "Panel", "Dashboard")} · ${agencyName}`}
      actions={
        <>
          {!isAgent && <Button size="sm" variant="outline" className={k.outline} href={`/${locale}/agency/reports`}><Download size={14} /> CSV</Button>}
          {canCreate && <Button className={k.primary} href={`/${locale}/agency/listings/new`}><Plus size={16} /> {tx(locale, "Nuevo inmueble", "New listing")}</Button>}
        </>
      }
    >
      <div className={kpiGrid5}>
        <Kpi label={tx(locale, "Inmuebles activos", "Active listings")} value={stats.activeListings} delta={stats.activeDelta ? sign(stats.activeDelta) : undefined} down={stats.activeDelta < 0} hint={tx(locale, "nuevos en 30 días", "new in 30 days")} />
        <Kpi label={tx(locale, "Leads · 7 días", "Leads · 7 days")} value={stats.leads7d} delta={stats.leadsDeltaPct === null ? undefined : `${sign(stats.leadsDeltaPct)} %`} deltaNote={tx(locale, "Aún hay pocos datos para comparar", "Not enough data to compare yet")} down={(stats.leadsDeltaPct ?? 0) < 0} hint={tx(locale, "vs. semana anterior", "vs. previous week")} />
        <Kpi label={tx(locale, "Conversión lead → visita", "Lead → tour")} value={`${stats.convTourPct} %`} hint={tx(locale, "últimos 30 días", "last 30 days")} />
        <Kpi label={tx(locale, "Tiempo medio a visita", "Avg. time to tour")} value={stats.avgDaysToTour === null ? "—" : `${String(stats.avgDaysToTour).replace(".", locale === "es" ? "," : ".")} d`} hint={tx(locale, "desde el lead", "from lead")} />
        <Kpi label={tx(locale, "Respondidos en 15\u00a0min", "Answered within 15\u00a0min")} value={stats.slaPct === null ? "—" : `${stats.slaPct} %`} hint={tx(locale, "primera respuesta", "first response")} />
      </div>

      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1.45fr_1fr]">
        <Panel className="flex flex-col" bodyClass="flex min-h-0 flex-1 flex-col" title={tx(locale, "Leads por día", "Leads per day")} action={<span className={cn("pt-2 text-[13px]", k.muted)}>{tx(locale, "Últimos 14 días", "Last 14 days")}</span>}>
          <BarChart data={days} height={220} fill />
        </Panel>
        <Panel title={tx(locale, "Leads sin responder", "Unanswered leads")} action={<Link href={`/${locale}/agency/leads`} className={cn("pt-2 text-[14px]", k.link)}>{tx(locale, "Bandeja", "Inbox")} <ArrowUpRight size={13} className="inline" /></Link>}>
          {newLeads.length === 0 && <p className={cn("text-[15px]", k.muted)}>{tx(locale, "Todos los leads tienen respuesta.", "Every lead has been answered.")}</p>}
          <ul className={cn("divide-y", k.divide)}>
            {newLeads.slice(0, 4).map((ld) => {
              const mins = Math.round((Date.now() - Date.parse(ld.createdAt)) / 60000);
              const l = byId.get(ld.listingId);
              const late = mins > 15;
              return (
                <li key={ld.id} className="flex items-center gap-3.5 py-3.5 first:pt-0">
                  <Initials name={ld.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{ld.name}</div>
                    {/* The zone truncates; the countdown (what matters) gets its own line and never does. */}
                    <div className={cn("truncate text-[13px]", k.muted)}>{l?.zone ?? "—"}</div>
                    {late ? <div className={cn("text-[13px] font-semibold", k.dangerText)} suppressHydrationWarning>{tx(locale, "Sin respuesta a tiempo", "Not answered in time")} · <span className="whitespace-nowrap">{span(mins)}</span></div> : <div className={cn("text-[13px] font-semibold", k.warnText)} suppressHydrationWarning>{tx(locale, `Quedan ${15 - mins}\u00a0min`, `${15 - mins}\u00a0min left`)}</div>}
                  </div>
                  {ld.score != null && <Chip>{tx(locale, "Interés", "Interest")} {ld.score}</Chip>}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6" title={tx(locale, "Rendimiento por inmueble", "Performance by listing")} action={<Link href={`/${locale}/agency/listings`} className={cn("pt-2 text-[14px]", k.link)}>{tx(locale, "Ver todos", "See all")}</Link>}>
        {top.length === 0 && <Empty title={tx(locale, "Aún no hay inmuebles", "No listings yet")} body={tx(locale, "Publica el primero y aquí verás vistas, guardados y leads.", "Publish the first one to see views, saves and leads here.")} />}
        <ul className={cn("divide-y", k.divide)}>
          {top.map((l) => (
            <li key={l.id}>
              <Link href={`/${locale}/agency/listings/${l.id}/edit`} className="group flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5 sm:flex-nowrap">
                <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-[60px] w-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 basis-48">
                  <div className="line-clamp-1 text-[15px] font-semibold group-hover:underline group-hover:decoration-navy/30 group-hover:underline-offset-4">{tx(locale, l.title_es, l.title_en)}</div>
                  <div className={cn("line-clamp-1 text-[13px]", k.muted)}>
                    {l.zone} · {num(l.stats.impressions, locale)} {tx(locale, "vistas", "views")} · {l.stats.leads} leads · {l.stats.saves} {tx(locale, "guardados", "saves")} · {dwell(l.stats.avgTimeSec)}
                    {l.stats.impressions ? ` · ${fmt1((l.stats.leads / l.stats.impressions) * 1000)} ‰` : ""}
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-4 pl-24 sm:w-auto sm:justify-end sm:pl-0">
                  {l.luxury ? <Pill tone="exclusive">{tx(locale, "Exclusiva", "Exclusive")}</Pill> : <StatusPill status={l.status} review={l.review} takedownReason={l.takedownReason} locale={locale} />}
                  <span className={cn(k.num, "text-right text-[15px] tracking-normal sm:min-w-[120px]")}>USD {num(l.priceAmount, locale)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mt-6 grid gap-6 [&>*]:min-w-0 lg:grid-cols-2 2xl:grid-cols-3">
        <Panel title={tx(locale, "Embudo (30 días)", "Funnel (30 days)")}>
          <Funnel steps={[{ label: tx(locale, "Leads", "Leads"), value: stats.funnel.NEW }, { label: tx(locale, "Contactados", "Contacted"), value: stats.funnel.CONTACTED }, { label: tx(locale, "Visitas", "Tours"), value: stats.funnel.TOUR }, { label: tx(locale, "Ofertas", "Offers"), value: stats.funnel.OFFER }, { label: tx(locale, "Ganados", "Won"), value: stats.funnel.WON }]} />
        </Panel>
        <Panel title={isAgent ? tx(locale, "Mis resultados", "My results") : tx(locale, "Ranking de agentes", "Agent ranking")} action={<span className={cn("pt-2 text-[13px]", k.muted)} title={tx(locale, "Cierres: inmuebles vendidos o alquilados en el periodo, igual que en Auditoría e Informes", "Closings: listings sold or rented in the period, same as Audit and Reports")}>{tx(locale, "Últimos 30 días", "Last 30 days")}</span>}>
          {stats.ranking.length === 0 && <p className={cn("text-[15px]", k.muted)}>{tx(locale, "Aún no hay agentes en el equipo.", "No agents on the team yet.")}</p>}
          <ul className="space-y-3.5">
            {stats.ranking.map(({ id, name, leads: n, won, respMin, gmv }, i) => (
              <li key={id} className="flex items-center gap-3">
                <span className={cn("w-4 font-serif text-[18px]", k.muted)}>{i + 1}</span>
                <Initials name={name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{name}</div>
                  <div className={cn("text-[13px]", k.muted)}>{n} leads · {won} {tx(locale, "cierres", "won")} · <span className="whitespace-nowrap">{tx(locale, "resp.", "resp.")} {respMin == null ? "—" : `${respMin}\u00a0min`}</span></div>
                </div>
                <div className={cn(k.num, "text-right text-[14px] tracking-normal")}>{gmv ? money(gmv, locale) : "—"}</div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={tx(locale, "Próximas visitas", "Upcoming tours")} className="lg:col-span-2 2xl:col-span-1">
          {tours.length === 0 && <p className={cn("text-[15px]", k.muted)}>{tx(locale, "Sin visitas próximas.", "No upcoming tours.")}</p>}
          {/* Two lines per tour (date + status / visitor · zone + agent): nothing truncates to "E2…" on a phone. Each row
              opens the calendar on that tour's week. */}
          <ul className={cn("divide-y", k.divide)}>
            {tours.slice(0, 6).map((t) => {
              const l = byId.get(t.listingId);
              const w = weekOffset(t.start);
              return (
                <li key={t.id}>
                  <Link href={`/${locale}/agency/calendar${w ? `?w=${w}` : ""}`} className={cn("-mx-2 block rounded-xl px-2 py-2.5 text-[14px]", k.hover)}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold first-letter:uppercase">{dateTime(t.start, locale)}</span>
                      <Pill tone={t.status === "CONFIRMED" ? "ok" : "warn"}>{t.status === "CONFIRMED" ? tx(locale, "Confirmada", "Confirmed") : tx(locale, "Pendiente", "Pending")}</Pill>
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate">{t.seekerName}{l?.zone && <span className={k.muted}> · {l.zone}</span>}</span>
                      <span title={t.agentName} className="shrink-0"><Initials name={t.agentName} size={24} /></span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {tours.length > 0 && (
            <Link href={`/${locale}/agency/calendar`} className={cn("mt-3 inline-block text-[14px]", k.link)}>
              {tx(locale, "Ver calendario", "Open calendar")} <ArrowUpRight size={13} className="inline" />
            </Link>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
