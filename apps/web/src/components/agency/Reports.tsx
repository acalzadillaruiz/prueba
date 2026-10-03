"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Kpi, Panel, k } from "./kit";
import { cn } from "@/lib/cn";
import { BarChart } from "./charts";
import { money, num, tx } from "@/lib/i18n";

export interface ReportData {
  closedVolume: number;
  commissions: number;
  leads30: number;
  medianDom: number | null;
  bySource: { source: string; count: number }[];
  /** salePpm: USD/m² of SALE listings · rentPpm: USD/m²/month of LONG_RENT listings (short rents excluded). */
  byZone: { zone: string; active: number; leads: number; salePpm: number | null; rentPpm: number | null; dom: number | null }[];
}

const SOURCE: Record<string, [string, string]> = {
  LISTING_FORM: ["Ficha", "Listing"],
  TOUR_REQUEST: ["Visita", "Tour"],
  ALERT: ["Alerta", "Alert"],
  REFERRAL: ["Referido", "Referral"],
  WHATSAPP_NOTE: ["WhatsApp", "WhatsApp"],
};

export function ReportsView({ locale, data }: { locale: Locale; data: ReportData }) {
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
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 [&>*]:min-w-0">
        <Kpi label={tx(locale, "Volumen cerrado", "Closed volume")} value={money(data.closedVolume, locale)} hint={tx(locale, "operaciones ganadas", "won deals")} />
        <Kpi label={tx(locale, "Comisiones estimadas", "Est. commissions")} value={money(data.commissions, locale)} hint={tx(locale, "según reglas de la agencia", "per agency rules")} />
        <Kpi label={tx(locale, "Leads (30 d)", "Leads (30 d)")} value={num(data.leads30, locale)} hint={tx(locale, "todas las fuentes", "all sources")} />
        <Kpi label={tx(locale, "Días en mercado (mediana)", "Median days on market")} value={data.medianDom ?? "—"} hint={tx(locale, "inmuebles activos", "active listings")} />
      </div>
      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-2">
        <Panel title={tx(locale, "Leads por origen (30 d)", "Leads by source (30 d)")}>
          {data.bySource.length ? <BarChart highlight="none" data={data.bySource.map((s) => ({ label: tx(locale, SOURCE[s.source]?.[0] ?? s.source, SOURCE[s.source]?.[1] ?? s.source), value: s.count }))} height={220} /> : <div className={cn("text-sm", k.muted)}>—</div>}
        </Panel>
        <Panel title={tx(locale, "Por zona", "By area")} bodyClass="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={cn("text-left", k.th)}><tr><th className="pb-2">{tx(locale, "Zona", "Area")}</th><th className="pb-2 text-right">{tx(locale, "Activos", "Active")}</th><th className="pb-2 text-right">Leads</th><th className="pb-2 text-right" title={tx(locale, "Media de venta", "Sale average")}>{tx(locale, "Venta USD/m²", "Sale USD/m²")}</th><th className="pb-2 text-right" title={tx(locale, "Alquiler de larga estancia", "Long-term rent")}>{tx(locale, "Alquiler USD/m²/mes", "Rent USD/m²/mo")}</th><th className="pb-2 text-right">{tx(locale, "Días", "Days")}</th></tr></thead>
            <tbody>
              {data.byZone.map((z) => (
                <tr key={z.zone} className={cn("border-t", k.line)}>
                  <td className="py-2 font-semibold">{z.zone}</td>
                  <td className="text-right">{z.active}</td>
                  <td className="text-right">{z.leads}</td>
                  <td className="text-right">{z.salePpm != null ? num(Math.round(z.salePpm), locale) : "—"}</td>
                  <td className="text-right">{z.rentPpm != null ? num(z.rentPpm, locale) : "—"}</td>
                  <td className={cn("text-right text-xs", k.muted)}>{z.dom ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={cn("mt-3 text-xs", k.muted)}>{tx(locale, "Vacacional (precio por noche) y comercial no se promedian por m².", "Vacation rentals (nightly price) and commercial listings are not averaged per m².")}</p>
        </Panel>
      </div>
      <div className={cn("mt-6 flex items-center gap-3 rounded-[18px] border border-dashed p-4 text-sm", k.line, k.muted)}>
        <FileSpreadsheet size={18} strokeWidth={1.6} className="shrink-0 text-navy dark:text-ivory" /> {tx(locale, "El CSV incluye inmuebles, estado, precio, PlaceEstimate, impresiones, guardados, leads y calidad. Listo para Excel o Google Sheets.", "The CSV includes listings, status, price, PlaceEstimate, impressions, saves, leads and quality. Ready for Excel or Google Sheets.")}
      </div>
    </AdminShell>
  );
}
