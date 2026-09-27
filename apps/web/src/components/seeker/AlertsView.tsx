"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Mail, MapPin, Pencil, Trash2 } from "lucide-react";
import type { EmailOutbox, Locale } from "@/types/domain";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { ago, tx } from "@/lib/i18n";

type Search = { id: string; name: string; query: string; polygon: unknown; frequency: "INSTANT" | "DAILY" | "WEEKLY"; newCount: number; lastSentAt: string | null };

export function AlertsView({ locale, searches, emails }: { locale: Locale; searches: Search[]; emails: EmailOutbox[] }) {
  const [items, setItems] = useState(searches);
  const router = useRouter();
  const freq = { INSTANT: tx(locale, "Al instante", "Instant"), DAILY: tx(locale, "Diaria", "Daily"), WEEKLY: tx(locale, "Semanal", "Weekly") };
  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="font-display text-3xl font-semibold">{tx(locale, "Alertas de búsqueda", "Search alerts")}</h1>
        <p className="mt-1 text-ink/60">{tx(locale, "Te avisamos cuando entra algo nuevo o baja de precio.", "We’ll tell you when something new lands or drops in price.")}</p>
        <div className="mt-6 space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center gap-4 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F26B4D1A] text-coral">{s.polygon ? <MapPin size={20} /> : <Bell size={20} />}</span>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold">{s.name}</div>
                <div className="text-sm text-ink/65">
                  {freq[s.frequency]} · {s.lastSentAt ? `${tx(locale, "último envío", "last sent")} ${ago(s.lastSentAt, locale)}` : tx(locale, "sin envíos aún", "nothing sent yet")}
                </div>
              </div>
              {s.newCount > 0 && <Badge tone="coral">{s.newCount} {tx(locale, "nuevos", "new")}</Badge>}
              <select
                value={s.frequency}
                aria-label={tx(locale, "Frecuencia", "Frequency")}
                onChange={async (e) => {
                  const frequency = e.target.value as Search["frequency"];
                  setItems(items.map((x) => (x.id === s.id ? { ...x, frequency } : x)));
                  await api(`me/searches/${s.id}`, { method: "PATCH", json: { frequency } });
                }}
                className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
              >
                <option value="INSTANT">{freq.INSTANT}</option>
                <option value="DAILY">{freq.DAILY}</option>
                <option value="WEEKLY">{freq.WEEKLY}</option>
              </select>
              <Link href={`/${locale}/search?${s.query}`} className="rounded-lg p-2 hover:bg-black/5" aria-label={tx(locale, "Abrir", "Open")}><Pencil size={16} /></Link>
              <button
                className="rounded-lg p-2 text-danger hover:bg-black/5"
                aria-label={tx(locale, "Eliminar", "Delete")}
                onClick={async () => {
                  setItems(items.filter((x) => x.id !== s.id));
                  await api(`me/searches/${s.id}`, { method: "DELETE" });
                  router.refresh();
                }}
              >
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
          {items.length === 0 && <EmptyState icon={<Bell size={20} />} title={tx(locale, "Sin alertas", "No alerts")} body={tx(locale, "Guarda una búsqueda desde el mapa y te avisamos.", "Save a search from the map and we’ll let you know.")} />}
        </div>
        <Button href={`/${locale}/search`} className="mt-5">{tx(locale, "Crear alerta desde el mapa", "Create alert from the map")}</Button>
      </div>
      <aside>
        <Card className="p-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold"><Mail size={18} className="text-coral" /> {tx(locale, "Enviados", "Sent")}</div>
          <p className="mt-1 text-xs text-ink/65">{tx(locale, "Bandeja email_outbox (sin SMTP en v1)", "email_outbox table (no SMTP in v1)")}</p>
          <ul className="mt-4 divide-y divide-line">
            {emails.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={e.kind === "ALERT" ? "coral" : e.kind === "TOUR" ? "ok" : "mist"}>{e.kind}</Badge>
                  <span className="text-xs text-ink/65">{ago(e.at, locale)}</span>
                </div>
                <div className="mt-1.5 text-sm font-semibold">{e.subject}</div>
                <div className="text-xs text-ink/65">{e.to} · {e.status}</div>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
