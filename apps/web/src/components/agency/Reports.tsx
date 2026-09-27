"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Stat } from "@/components/ui";
import { BarChart } from "./charts";
import { money, num, tx } from "@/lib/i18n";

export interface ReportData {
  closedVolume: number;
  commissions: number;
  leads30: number;
  medianDom: number | null;
  bySource: { source: string; count: number }[];
  byZone: { zone: string; active: number; leads: number; ppm: number | null; dom: number | null }[];
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
        <a href="/api/v1/agency/report" download className="inline-flex h-8 items-center gap-2 rounded-np bg-coral-cta px-3 font-display text-sm font-medium text-white hover:bg-coral-cta-hover">
          <Download size={15} /> {tx(locale, "Exportar CSV", "Export CSV")}
        </a>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat dark label={tx(locale, "Volumen cerrado", "Closed volume")} value={money(data.closedVolume, locale)} hint={tx(locale, "operaciones ganadas", "won deals")} />
        <Stat dark label={tx(locale, "Comisiones estimadas", "Est. commissions")} value={money(data.commissions, locale)} />
        <Stat dark label={tx(locale, "Leads (30 d)", "Leads (30 d)")} value={num(data.leads30, locale)} />
        <Stat dark label={tx(locale, "Días en mercado (mediana)", "Median days on market")} value={data.medianDom ?? "—"} hint={tx(locale, "inmuebles activos", "active listings")} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Leads por origen (30 d)", "Leads by source (30 d)")}</div>
          {data.bySource.length ? <BarChart data={data.bySource.map((s) => ({ label: tx(locale, SOURCE[s.source]?.[0] ?? s.source, SOURCE[s.source]?.[1] ?? s.source), value: s.count }))} height={220} /> : <div className="text-sm text-mist">—</div>}
        </div>
        <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Por zona", "By area")}</div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-mist"><tr><th className="pb-2">{tx(locale, "Zona", "Area")}</th><th className="pb-2 text-right">{tx(locale, "Activos", "Active")}</th><th className="pb-2 text-right">Leads</th><th className="pb-2 text-right">USD/m²</th><th className="pb-2 text-right">{tx(locale, "Días", "Days")}</th></tr></thead>
            <tbody>
              {data.byZone.map((z) => (
                <tr key={z.zone} className="border-t border-navy-line">
                  <td className="py-2 font-semibold">{z.zone}</td>
                  <td className="text-right">{z.active}</td>
                  <td className="text-right">{z.leads}</td>
                  <td className="text-right">{z.ppm ? num(z.ppm, locale) : "—"}</td>
                  <td className="text-right text-xs text-mist">{z.dom ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-np border border-dashed border-navy-line p-4 text-sm text-mist">
        <FileSpreadsheet size={18} className="text-coral" /> {tx(locale, "El CSV incluye inmuebles, estado, precio, PlaceEstimate, impresiones, guardados, leads y calidad. Listo para Excel o Google Sheets.", "The CSV includes listings, status, price, PlaceEstimate, impressions, saves, leads and quality. Ready for Excel or Google Sheets.")}
      </div>
    </AdminShell>
  );
}
