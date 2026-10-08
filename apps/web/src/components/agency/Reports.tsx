"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Kpi, Panel, k, tab } from "./kit";
import { ScrollRegion } from "./ScrollRegion";
import { cn } from "@/lib/cn";
import { money, num, tx } from "@/lib/i18n";

export type ReportPeriod = 7 | 30 | 90;
const PERIODS: ReportPeriod[] = [7, 30, 90];

export interface ReportData {
  /** Volume of the period's closings (listings sold/rented, same definition as the dashboard and Auditoría). */
  closedVolume: number;
  closings: number;
  /** Commission entries recorded in the period. */
  commissions: number;
  leads: number;
  medianDom: number | null;
  bySource: { source: string; count: number }[];
  /** Per agent, for the period: leads assigned, tours held or scheduled (not cancelled), closings. */
  byAgent: { id: string; name: string; leads: number; tours: number; closings: number; volume: number }[];
  /** salePpm: USD/m² of SALE listings · rentPpm: USD/m²/month of LONG_RENT listings (short rents excluded). */
  byZone: { zone: string; active: number; leads: number; salePpm: number | null; rentPpm: number | null; dom: number | null }[];
}

const SOURCE: Record<string, [string, string]> = {
  LISTING_FORM: ["Formulario de la ficha", "Listing form"],
  TOUR_REQUEST: ["Pidió visita", "Tour request"],
  ALERT: ["Alerta de búsqueda", "Search alert"],
  REFERRAL: ["Referido", "Referral"],
  WHATSAPP_NOTE: ["WhatsApp", "WhatsApp"],
};

/** Compact horizontal bars (HTML, 13–14 px labels): one row per source, sized to the data instead of a fixed-height chart. */
function SourceBars({ locale, rows }: { locale: Locale; rows: ReportData["bySource"] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2.5" aria-label={tx(locale, "Leads por origen", "Leads by source")}>
      {rows.map((r) => {
        const label = tx(locale, SOURCE[r.source]?.[0] ?? r.source, SOURCE[r.source]?.[1] ?? r.source);
        const share = total ? Math.round((r.count / total) * 100) : 0;
        return (
          <li key={r.source} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-[14px]">
            <span className="truncate">{label}</span>
            <span className="h-2.5 rounded-full bg-[#F1ECE3] dark:bg-white/[.06]" aria-hidden>
              <span className="block h-full rounded-full bg-[#81776F] dark:bg-[#8C817A]" style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
            <span className="min-w-[4.5rem] text-right font-display font-semibold [font-feature-settings:'lnum','tnum']">
              {num(r.count, locale)} <span className={cn("text-[13px] font-normal", k.muted)}>· {share} %</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Phone card cell: small uppercase label (may wrap to two lines) over the figure. */
function Cell({ label, children, muted, className }: { label: ReactNode; children: ReactNode; muted?: boolean; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] font-semibold uppercase leading-tight tracking-[.1em] text-muted dark:text-mist">{label}</dt>
      <dd className={cn("mt-0.5 font-display text-[15px] font-semibold [font-feature-settings:'lnum','tnum']", muted && k.muted)}>{children}</dd>
    </div>
  );
}

export function ReportsView({ locale, data, days }: { locale: Locale; data: ReportData; days: ReportPeriod }) {
  const d = `${days} d`;
  const period = tx(locale, `Últimos ${days} días`, `Last ${days} days`);
  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={tx(locale, "Informes", "Reports")}
      actions={
        <a href="/api/v1/agency/report" download className={cn("inline-flex h-11 items-center gap-2 rounded-np bg-coral-cta px-4 font-display text-[15px] font-medium text-white shadow-sm transition-colors duration-np hover:bg-coral-cta-hover md:h-10", k.primary)}>
          <Download size={16} /> {tx(locale, "Exportar CSV", "Export CSV")}
        </a>
      }
    >
      <nav className="mb-5 flex flex-wrap items-center gap-2" aria-label={tx(locale, "Periodo del informe", "Report period")}>
        <span className={cn("mr-1 text-[14px]", k.muted)}>{tx(locale, "Periodo", "Period")}</span>
        {PERIODS.map((p) => (
          <Link key={p} href={`/${locale}/agency/reports?d=${p}`} aria-current={p === days ? "page" : undefined} className={tab(p === days)} scroll={false}>
            {tx(locale, `${p} días`, `${p} days`)}
          </Link>
        ))}
      </nav>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 [&>*]:min-w-0">
        {/* Short one-line labels: the period goes in the line under the figure (it read "(30 D)" alone on a 2nd line). */}
        <Kpi label={tx(locale, "Volumen cerrado", "Closed volume")} value={money(data.closedVolume, locale)} hint={tx(locale, `${period} · ${data.closings} ${data.closings === 1 ? "cierre" : "cierres"} (vendidos o alquilados)`, `${period} · ${data.closings} ${data.closings === 1 ? "closing" : "closings"} (sold or rented)`)} />
        <Kpi label={tx(locale, "Comisiones", "Commissions")} value={money(data.commissions, locale)} hint={tx(locale, `${period} · estimadas según reglas de la agencia`, `${period} · estimated per agency rules`)} />
        <Kpi label="Leads" value={num(data.leads, locale)} hint={tx(locale, `${period} · todas las fuentes`, `${period} · all sources`)} />
        <Kpi label={tx(locale, "Días en mercado", "Days on market")} value={data.medianDom ?? "—"} hint={tx(locale, "mediana · inmuebles activos hoy", "median · listings active today")} />
      </div>
      {/* Source + agent side by side from xl; the 6-column zone table gets the full width below, so nothing is clipped at 1024–1440. */}
      <div className="mt-6 grid gap-6 [&>*]:min-w-0">
        <div className="grid content-start gap-6 [&>*]:min-w-0 xl:grid-cols-2">
          <Panel title={tx(locale, `Leads por origen (${d})`, `Leads by source (${d})`)}>
            {data.bySource.length ? <SourceBars locale={locale} rows={data.bySource} /> : <p className={cn("text-[14px]", k.muted)}>{tx(locale, "Sin leads en este periodo.", "No leads in this period.")}</p>}
          </Panel>
          <Panel title={tx(locale, `Por agente (${d})`, `By agent (${d})`)}>
            {data.byAgent.length ? (
              <>
              {/* Phones: one 2-row card per agent; tablets and up keep the table. */}
              <ul className="space-y-2.5 md:hidden" aria-label={tx(locale, "Por agente", "By agent")} data-testid="report-agent-cards">
                {data.byAgent.map((a) => (
                  <li key={a.id} className={cn("rounded-xl border px-3.5 py-3", k.line)}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 font-semibold leading-snug">{a.name}</span>
                      <span className={cn("shrink-0 font-display text-[15px] font-semibold [font-feature-settings:'lnum','tnum']", !a.volume && k.muted)} title={tx(locale, "Volumen", "Volume")}>
                        <span className="sr-only">{tx(locale, "Volumen", "Volume")}: </span>{a.volume ? money(a.volume, locale) : "—"}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-2">
                      <Cell label="Leads">{num(a.leads, locale)}</Cell>
                      <Cell label={tx(locale, "Visitas", "Tours")}>{num(a.tours, locale)}</Cell>
                      <Cell label={tx(locale, "Cierres", "Closings")}>{num(a.closings, locale)}</Cell>
                    </dl>
                  </li>
                ))}
              </ul>
              <ScrollRegion label={tx(locale, "Por agente", "By agent")} className="hidden md:block">
              <table className="w-full min-w-[26rem] text-[14px]" data-testid="report-agents">
                <thead className={cn("text-left", k.th, "text-[12px]")}>
                  <tr>
                    <th className="pb-2">{tx(locale, "Agente", "Agent")}</th>
                    <th className="pb-2 text-right">Leads</th>
                    <th className="pb-2 text-right" title={tx(locale, "Visitas agendadas o hechas en el periodo (sin las canceladas)", "Tours scheduled or held in the period (cancelled excluded)")}>{tx(locale, "Visitas", "Tours")}</th>
                    <th className="pb-2 text-right" title={tx(locale, "Inmuebles vendidos o alquilados en el periodo", "Listings sold or rented in the period")}>{tx(locale, "Cierres", "Closings")}</th>
                    <th className="pb-2 text-right">{tx(locale, "Volumen", "Volume")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byAgent.map((a) => (
                    <tr key={a.id} className={cn("border-t", k.line)}>
                      <td className="py-2 pr-3 font-semibold">{a.name}</td>
                      <td className="text-right">{num(a.leads, locale)}</td>
                      <td className="text-right">{num(a.tours, locale)}</td>
                      <td className="text-right">{num(a.closings, locale)}</td>
                      <td className={cn("whitespace-nowrap pl-3 text-right", a.volume ? "" : k.muted)}>{a.volume ? money(a.volume, locale) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </ScrollRegion>
              </>
            ) : (
              <p className={cn("text-[14px]", k.muted)}>{tx(locale, "Aún no hay agentes en el equipo.", "No agents on the team yet.")}</p>
            )}
            <p className={cn("mt-3 text-[13px]", k.muted)}>{tx(locale, "Los cierres se cuentan igual que en el panel y en Auditoría.", "Closings are counted the same way as on the dashboard and in Audit.")}</p>
          </Panel>
        </div>
        <Panel title={tx(locale, "Por zona", "By area")}>
          {/* Phones: one 2-row card per area; tablets and up keep the 6-column table. */}
          <ul className="space-y-2.5 md:hidden" aria-label={tx(locale, "Por zona", "By area")} data-testid="report-zone-cards">
            {data.byZone.map((z) => (
              <li key={z.zone} className={cn("rounded-xl border px-3.5 py-3", k.line)}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 font-semibold leading-snug">{z.zone}</span>
                  <span className={cn("shrink-0 text-[13px]", k.muted)}>{tx(locale, `${z.active} ${z.active === 1 ? "activo" : "activos"}`, `${z.active} active`)}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 min-[420px]:grid-cols-4">
                  <Cell label="Leads">{z.leads}</Cell>
                  <Cell label={<>{tx(locale, "Venta", "Sale")} <span className="normal-case tracking-normal">$/m²</span></>}>{z.salePpm != null ? num(Math.round(z.salePpm), locale) : "—"}</Cell>
                  <Cell label={<>{tx(locale, "Alquiler", "Rent")} <span className="normal-case tracking-normal">$/m²·{tx(locale, "mes", "mo")}</span></>}>{z.rentPpm != null ? num(z.rentPpm, locale) : "—"}</Cell>
                  <Cell label={tx(locale, "Días", "Days")} muted>{z.dom ?? "—"}</Cell>
                </dl>
              </li>
            ))}
          </ul>
          <ScrollRegion label={tx(locale, "Por zona", "By area")} className="hidden md:block">
          <table className="w-full min-w-[34rem] text-[14px] [&_td+td]:whitespace-nowrap [&_td+td]:pl-4 [&_th+th]:pl-4">
            <thead className={cn("text-left", k.th, "text-[12px]")}>
              <tr>
                <th className="w-[34%] pb-2">{tx(locale, "Zona", "Area")}</th>
                <th className="pb-2 text-right">{tx(locale, "Activos", "Active")}</th>
                <th className="pb-2 text-right" title={tx(locale, "Leads acumulados de los inmuebles de la zona", "All-time leads of the area's listings")}>Leads</th>
                <th className="pb-2 text-right" title={tx(locale, "Media de venta, USD por m²", "Sale average, USD per m²")}>{tx(locale, "Venta", "Sale")} <span className="normal-case tracking-normal">USD/m²</span></th>
                <th className="pb-2 text-right" title={tx(locale, "Alquiler de larga estancia, USD por m² al mes", "Long-term rent, USD per m² per month")}>{tx(locale, "Alquiler", "Rent")} <span className="normal-case tracking-normal">USD/m²·{tx(locale, "mes", "mo")}</span></th>
                <th className="pb-2 text-right" title={tx(locale, "Mediana de días en mercado", "Median days on market")}>{tx(locale, "Días", "Days")}</th>
              </tr>
            </thead>
            <tbody>
              {data.byZone.map((z) => (
                <tr key={z.zone} className={cn("border-t", k.line)}>
                  <td className="py-2 pr-2 font-semibold">{z.zone}</td>
                  <td className="text-right">{z.active}</td>
                  <td className="text-right">{z.leads}</td>
                  <td className="text-right">{z.salePpm != null ? num(Math.round(z.salePpm), locale) : "—"}</td>
                  <td className="text-right">{z.rentPpm != null ? num(z.rentPpm, locale) : "—"}</td>
                  <td className={cn("pr-1 text-right", k.muted)}>{z.dom ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </ScrollRegion>
          <p className={cn("mt-3 text-[13px]", k.muted)}>{tx(locale, "Foto de hoy (no depende del periodo). Vacacional (precio por noche) y comercial no se promedian por m².", "Today's snapshot (not tied to the period). Vacation rentals (nightly price) and commercial listings are not averaged per m².")}</p>
        </Panel>
      </div>
      <div className={cn("mt-6 flex items-center gap-3 rounded-[18px] border border-dashed p-4 text-sm", k.line, k.muted)}>
        <FileSpreadsheet size={18} strokeWidth={1.6} className="shrink-0 text-navy dark:text-ivory" /> {tx(locale, "El CSV incluye inmuebles, estado, precio, PlaceEstimate, impresiones, guardados, leads y calidad. Listo para Excel o Google Sheets.", "The CSV includes listings, status, price, PlaceEstimate, impressions, saves, leads and quality. Ready for Excel or Google Sheets.")}
      </div>
    </AdminShell>
  );
}
