"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Mail, MapPin, Pencil, Trash2 } from "lucide-react";
import type { EmailOutbox, Locale } from "@/types/domain";
import { Badge, Button, Card } from "@/components/ui";
import { Empty, k } from "@/components/agency/kit";
import { api } from "@/lib/api";
import { EMAIL_STATUS_LABEL, ago, lbl, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Search = { id: string; name: string; query: string; polygon: unknown; frequency: "INSTANT" | "DAILY" | "WEEKLY"; newCount: number; lastSentAt: string | null };

export function AlertsView({ locale, searches, emails }: { locale: Locale; searches: Search[]; emails: EmailOutbox[] }) {
  const [items, setItems] = useState(searches);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Optimistic edits roll back to the previous list when the API refuses them.
  const changeFrequency = async (s: Search, frequency: Search["frequency"]) => {
    const prev = items;
    setError(null);
    setItems((xs) => xs.map((x) => (x.id === s.id ? { ...x, frequency } : x)));
    try {
      await api(`me/searches/${s.id}`, { method: "PATCH", json: { frequency } });
    } catch (e) {
      setItems(prev);
      setError(`${tx(locale, "No se pudo cambiar la frecuencia", "Couldn’t change the frequency")}: ${(e as Error).message}`);
    }
  };
  const remove = async (s: Search) => {
    const prev = items;
    setError(null);
    setBusyId(s.id);
    setItems((xs) => xs.filter((x) => x.id !== s.id));
    try {
      await api(`me/searches/${s.id}`, { method: "DELETE" });
      setConfirmId(null);
      router.refresh();
    } catch (e) {
      setItems(prev);
      setError(`${tx(locale, "No se pudo eliminar la alerta", "Couldn’t delete the alert")}: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };
  const freq = { INSTANT: tx(locale, "Al instante", "Instant"), DAILY: tx(locale, "Diaria", "Daily"), WEEKLY: tx(locale, "Semanal", "Weekly") };
  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1fr_380px]">
      <div>
        <div className={k.eyebrow}>{tx(locale, "Avisos a su medida", "Tailored notices")}</div>
        <h1 className="mt-1 font-serif text-[40px] font-medium leading-[1.05] md:text-[48px]">{tx(locale, "Alertas de búsqueda", "Search alerts")}</h1>
        <p className="mt-1 text-muted">{tx(locale, "Te avisamos cuando entra algo nuevo o baja de precio.", "We’ll tell you when something new lands or drops in price.")}</p>
        {error && <div role="alert" className="mt-4 rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <div className="mt-6 space-y-3">
          {items.map((s) => (
            <Card key={s.id} className={cn(k.card, "border-0 flex flex-wrap items-center gap-4 p-4")}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-egeo/40 text-navy dark:bg-white/10 dark:text-ivory">{s.polygon || /(^|&)(poly|radius)=/.test(s.query) ? <MapPin size={20} strokeWidth={1.6} /> : <Bell size={20} strokeWidth={1.6} />}</span>
              <div className="min-w-0 flex-1 basis-[calc(100%-4rem)] sm:basis-auto">
                <div className="font-serif text-[22px] font-medium leading-tight">{s.name}</div>
                <div className="text-sm text-muted">
                  {freq[s.frequency]} · {s.lastSentAt ? `${tx(locale, "último envío", "last sent")} ${ago(s.lastSentAt, locale)}` : tx(locale, "sin envíos aún", "nothing sent yet")}
                </div>
              </div>
              {s.newCount > 0 && <Badge className="bg-[#E6EBF1] text-navy dark:bg-white/10">{s.newCount} {tx(locale, "nuevos", "new")}</Badge>}
              <select
                value={s.frequency}
                aria-label={`${tx(locale, "Frecuencia", "Frequency")} · ${s.name}`}
                onChange={(e) => void changeFrequency(s, e.target.value as Search["frequency"])}
                className="h-10 rounded-full border border-[#D9D2C4] bg-white px-3 text-sm text-navy focus:border-navy focus:outline-none"
              >
                <option value="INSTANT">{freq.INSTANT}</option>
                <option value="DAILY">{freq.DAILY}</option>
                <option value="WEEKLY">{freq.WEEKLY}</option>
              </select>
              <Link href={`/${locale}/search?${s.query}`} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-black/5" aria-label={`${tx(locale, "Abrir", "Open")} · ${s.name}`}><Pencil size={16} /></Link>
              {confirmId === s.id ? (
                <div className="flex w-full items-center justify-end gap-2 sm:w-auto" role="group" aria-label={tx(locale, "Confirmar eliminación", "Confirm deletion")}>
                  <span className="text-sm font-semibold">{tx(locale, "¿Eliminar esta alerta?", "Delete this alert?")}</span>
                  <Button size="sm" variant="outline" className={k.outline} onClick={() => setConfirmId(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                  <Button size="sm" className="bg-danger hover:bg-danger" disabled={busyId === s.id} onClick={() => void remove(s)}>{tx(locale, "Eliminar", "Delete")}</Button>
                </div>
              ) : (
                <button className="flex h-11 w-11 items-center justify-center rounded-lg text-danger hover:bg-black/5" aria-label={`${tx(locale, "Eliminar", "Delete")} · ${s.name}`} onClick={() => setConfirmId(s.id)}>
                  <Trash2 size={16} />
                </button>
              )}
            </Card>
          ))}
          {items.length === 0 && <Empty title={tx(locale, "Sin alertas", "No alerts")} body={tx(locale, "Guarda una búsqueda desde el mapa y te avisamos.", "Save a search from the map and we’ll let you know.")} />}
        </div>
        <Button href={`/${locale}/search`} className="mt-5">{tx(locale, "Crear alerta desde el mapa", "Create alert from the map")}</Button>
      </div>
      <aside>
        <Card className={cn(k.card, "border-0 p-5")}>
          <div className="flex items-center gap-2 font-serif text-[24px] font-medium leading-tight"><Mail size={18} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" /> {tx(locale, "Enviados", "Sent")}</div>
          <p className="mt-1 text-xs text-muted">{tx(locale, "Correos de tu cuenta («Simulado» = sin proveedor de email configurado)", "Your account’s emails (“Simulated” = no email provider configured)")}</p>
          <ul className="mt-4 divide-y divide-line">
            {emails.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={e.kind === "TOUR" ? "ok" : "mist"} className={e.kind === "ALERT" ? "bg-[#E6EBF1] text-navy dark:bg-white/10" : undefined}>{e.kind}</Badge>
                  <span className="text-xs text-muted">{ago(e.at, locale)}</span>
                </div>
                <div className="mt-1.5 text-sm font-semibold">{e.subject}</div>
                <div className="text-xs text-muted">{e.to} · {EMAIL_STATUS_LABEL[e.status as keyof typeof EMAIL_STATUS_LABEL] ? lbl(EMAIL_STATUS_LABEL[e.status as keyof typeof EMAIL_STATUS_LABEL], locale) : e.status}</div>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
