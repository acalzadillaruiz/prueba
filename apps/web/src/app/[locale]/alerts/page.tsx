import Link from "next/link";
import { Bell, Mail, MapPin, Pencil, Trash2 } from "lucide-react";
import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { Badge, Button, Card } from "@/components/ui";
import { EMAILS, SAVED_SEARCHES } from "@/mock/ops";
import { ago, tx } from "@/lib/i18n";

export default async function AlertsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const freq = { instant: tx(locale, "Al instante", "Instant"), daily: tx(locale, "Diaria", "Daily"), weekly: tx(locale, "Semanal", "Weekly") };
  return (
    <PublicPage locale={locale}>
      <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="font-display text-3xl font-semibold">{tx(locale, "Alertas de búsqueda", "Search alerts")}</h1>
          <p className="mt-1 text-ink/60">{tx(locale, "Te avisamos cuando entra algo nuevo o baja de precio.", "We’ll tell you when something new lands or drops in price.")}</p>
          <div className="mt-6 space-y-3">
            {SAVED_SEARCHES.map((s) => (
              <Card key={s.id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F26B4D1A] text-coral">{s.id === "ss-3" ? <MapPin size={20} /> : <Bell size={20} />}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{tx(locale, s.name.es, s.name.en)}</div>
                  <div className="text-sm text-ink/55">{freq[s.frequency]} · {tx(locale, "último envío", "last sent")} {ago(s.lastSent, locale)}</div>
                </div>
                {s.newCount > 0 && <Badge tone="coral">{s.newCount} {tx(locale, "nuevos", "new")}</Badge>}
                <select defaultValue={s.frequency} className="h-9 rounded-lg border border-line bg-white px-2 text-sm">
                  <option value="instant">{freq.instant}</option>
                  <option value="daily">{freq.daily}</option>
                  <option value="weekly">{freq.weekly}</option>
                </select>
                <Link href={`/${locale}/search?${s.query}`} className="rounded-lg p-2 hover:bg-black/5" aria-label="Edit"><Pencil size={16} /></Link>
                <button className="rounded-lg p-2 text-danger hover:bg-black/5" aria-label="Delete"><Trash2 size={16} /></button>
              </Card>
            ))}
          </div>
          <Button href={`/${locale}/search`} className="mt-5">{tx(locale, "Crear alerta desde el mapa", "Create alert from the map")}</Button>
        </div>
        <aside>
          <Card className="p-5">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Mail size={18} className="text-coral" /> {tx(locale, "Enviados", "Sent")}</div>
            <p className="mt-1 text-xs text-ink/50">{tx(locale, "Bandeja email_outbox (sin SMTP en v1)", "email_outbox table (no SMTP in v1)")}</p>
            <ul className="mt-4 divide-y divide-line">
              {EMAILS.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={e.kind === "ALERT" ? "coral" : e.kind === "TOUR" ? "ok" : "mist"}>{e.kind}</Badge>
                    <span className="text-xs text-ink/50">{ago(e.at, locale)}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold">{e.subject}</div>
                  <div className="text-xs text-ink/50">{e.to} · {e.status}</div>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </PublicPage>
  );
}
