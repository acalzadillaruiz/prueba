"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, Stat } from "@/components/ui";
import { BarChart } from "./charts";
import { LISTINGS } from "@/mock/listings";
import { ZONES } from "@/mock/zones";
import { money, num, tx } from "@/lib/i18n";

export function ReportsView({ locale }: { locale: Locale }) {
  const mine = LISTINGS.filter((l) => l.agencyId === "ag-andes");
  const exportCsv = () => {
    const head = ["id", "title", "zone", "type", "status", "price_usd", "m2", "impressions", "saves", "leads", "days_on_market", "estimate_mid"];
    const rows = mine.map((l) => [l.id, `"${l.title_es}"`, l.zone, l.listingType, l.status, l.priceAmount, l.areaM2, l.stats.impressions, l.stats.saves, l.stats.leads, l.daysOnMarket, l.estimate.mid].join(","));
    const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "andes-prime-informe-sept-2026.csv";
    a.click();
  };
  const bySource = [
    { label: tx(locale, "Ficha", "Listing"), value: 58 },
    { label: tx(locale, "Visita", "Tour"), value: 41 },
    { label: tx(locale, "Alerta", "Alert"), value: 27 },
    { label: tx(locale, "Referido", "Referral"), value: 19 },
    { label: "WhatsApp", value: 19 },
  ];
  const zones = ZONES.filter((z) => mine.some((l) => l.zone === z.name));
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Informes", "Reports")} actions={<Button size="sm" onClick={exportCsv}><Download size={15} /> {tx(locale, "Exportar CSV", "Export CSV")}</Button>}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat dark label={tx(locale, "Volumen cerrado (sept.)", "Closed volume (Sep)")} value={money(677000, locale)} delta="+22%" />
        <Stat dark label={tx(locale, "Comisiones estimadas", "Est. commissions")} value={money(33850, locale)} delta="+22%" />
        <Stat dark label={tx(locale, "Leads (30 d)", "Leads (30 d)")} value={164} delta="+12%" />
        <Stat dark label={tx(locale, "Días en mercado (mediana)", "Median days on market")} value={48} delta="-9" hint={tx(locale, "menor es mejor", "lower is better")} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Leads por origen (30 d)", "Leads by source (30 d)")}</div>
          <BarChart data={bySource} height={220} />
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Por zona", "By area")}</div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-mist"><tr><th className="pb-2">{tx(locale, "Zona", "Area")}</th><th className="pb-2 text-right">{tx(locale, "Activos", "Active")}</th><th className="pb-2 text-right">Leads</th><th className="pb-2 text-right">USD/m²</th><th className="pb-2 text-right">{tx(locale, "Mercado", "Market")}</th></tr></thead>
            <tbody>
              {zones.map((z) => {
                const ls = mine.filter((l) => l.zone === z.name);
                return (
                  <tr key={z.slug} className="border-t border-navy-line">
                    <td className="py-2 font-semibold">{z.name}</td>
                    <td className="text-right">{ls.length}</td>
                    <td className="text-right">{ls.reduce((s, l) => s + l.stats.leads, 0)}</td>
                    <td className="text-right">{num(z.salePpm, locale)}</td>
                    <td className="text-right text-xs text-mist">{z.daysOnMarket} d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-np border border-dashed border-navy-line p-4 text-sm text-mist">
        <FileSpreadsheet size={18} className="text-coral" /> {tx(locale, "El CSV incluye inmuebles, estado, precio, PlaceEstimate, impresiones, saves y leads. Listo para Excel o Google Sheets.", "The CSV includes listings, status, price, PlaceEstimate, impressions, saves and leads. Ready for Excel or Google Sheets.")}
      </div>
    </AdminShell>
  );
}
