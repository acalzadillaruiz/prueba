"use client";

import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Kpi, Panel, k, tab } from "./kit";
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

export function ReportsView({ locale, data, days }: { locale: Locale; data: ReportData; days: ReportPeriod }) {
  const d = `${days} d`;
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
        <Kpi label={tx(locale, `Volumen cerrado (${d})`, `Closed volume (${d})`)} value={money(data.closedVolume, locale)} hint={tx(locale, `${data.closings} ${data.closings === 1 ? "cierre" : "cierres"} · vendidos o alquilados`, `${data.closings} ${data.closings === 1 ? "closing" : "closings"} · sold or rented`)} />
        <Kpi label={tx(locale, `Comisiones estimadas (${d})`, `Est. commissions (${d})`)} value={money(data.commissions, locale)} hint={tx(locale, "según reglas de la agencia", "per agency rules")} />
        <Kpi label={tx(locale, `Leads (${d})`, `Leads (${d})`)} value={num(data.leads, locale)} hint={tx(locale, "todas las fuentes", "all sources")} />
        <Kpi label={tx(locale, "Días en mercado (mediana)", "Median days on market")} value={data.medianDom ?? "—"} hint={tx(locale, "inmuebles activos hoy", "listings active today")} />
      </div>
      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_1.15fr]">
        <div className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title={tx(locale, `Leads por origen (${d})`, `Leads by source (${d})`)}>
            {data.bySource.length ? <SourceBars locale={locale} rows={data.bySource} /> : <p className={cn("text-[14px]", k.muted)}>{tx(locale, "Sin leads en este periodo.", "No leads in this period.")}</p>}
          </Panel>
          <Panel title={tx(locale, `Por agente (${d})`, `By agent (${d})`)} bodyClass="overflow-x-auto">
            {data.byAgent.length ? (
              <table className="w-full text-[14px]" data-testid="report-agents">
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
            ) : (
              <p className={cn("text-[14px]", k.muted)}>{tx(locale, "Aún no hay agentes en el equipo.", "No agents on the team yet.")}</p>
            )}
            <p className={cn("mt-3 text-[13px]", k.muted)}>{tx(locale, "Los cierres se cuentan igual que en el panel y en Auditoría.", "Closings are counted the same way as on the dashboard and in Audit.")}</p>
          </Panel>
        </div>
        <Panel title={tx(locale, "Por zona", "By area")} bodyClass="overflow-x-auto">
          <table className="w-full text-[14px] [&_td+td]:whitespace-nowrap [&_td+td]:pl-3 [&_th+th]:pl-3">
            <thead className={cn("text-left", k.th, "text-[12px]")}><tr><th className="pb-2">{tx(locale, "Zona", "Area")}</th><th className="pb-2 text-right">{tx(locale, "Activos", "Active")}</th><th className="pb-2 text-right" title={tx(locale, "Leads acumulados de los inmuebles de la zona", "All-time leads of the area's listings")}>Leads</th><th className="pb-2 text-right" title={tx(locale, "Media de venta", "Sale average")}>{tx(locale, "Venta USD/m²", "Sale USD/m²")}</th><th className="pb-2 text-right" title={tx(locale, "Alquiler de larga estancia", "Long-term rent")}>{tx(locale, "Alquiler USD/m²/mes", "Rent USD/m²/mo")}</th><th className="pb-2 text-right">{tx(locale, "Días", "Days")}</th></tr></thead>
            <tbody>
              {data.byZone.map((z) => (
                <tr key={z.zone} className={cn("border-t", k.line)}>
                  <td className="py-2 font-semibold">{z.zone}</td>
                  <td className="text-right">{z.active}</td>
                  <td className="text-right">{z.leads}</td>
                  <td className="text-right">{z.salePpm != null ? num(Math.round(z.salePpm), locale) : "—"}</td>
                  <td className="text-right">{z.rentPpm != null ? num(z.rentPpm, locale) : "—"}</td>
                  <td className={cn("text-right", k.muted)}>{z.dom ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={cn("mt-3 text-[13px]", k.muted)}>{tx(locale, "Foto de hoy (no depende del periodo). Vacacional (precio por noche) y comercial no se promedian por m².", "Today's snapshot (not tied to the period). Vacation rentals (nightly price) and commercial listings are not averaged per m².")}</p>
        </Panel>
      </div>
      <div className={cn("mt-6 flex items-center gap-3 rounded-[18px] border border-dashed p-4 text-sm", k.line, k.muted)}>
        <FileSpreadsheet size={18} strokeWidth={1.6} className="shrink-0 text-navy dark:text-ivory" /> {tx(locale, "El CSV incluye inmuebles, estado, precio, PlaceEstimate, impresiones, guardados, leads y calidad. Listo para Excel o Google Sheets.", "The CSV includes listings, status, price, PlaceEstimate, impressions, saves, leads and quality. Ready for Excel or Google Sheets.")}
      </div>
    </AdminShell>
  );
}
