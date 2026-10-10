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
import { alertTitle, isMachineName } from "./alertTitle";
import { localizeEmailSubject } from "@/lib/emailSubject";

type Search = { id: string; name: string; query: string; polygon: unknown; frequency: "INSTANT" | "DAILY" | "WEEKLY"; newCount: number; lastSentAt: string | null };

/** What each email was about, in words (never the internal code). */
const EMAIL_KIND_LABEL: Record<string, [string, string]> = {
  ALERT: ["Alerta", "Alert"],
  TOUR: ["Visita", "Viewing"],
  VERIFY: ["Tu cuenta", "Your account"],
  RESET: ["Tu contraseña", "Your password"],
  LEAD: ["Mensaje", "Message"],
  OFFER: ["Oferta", "Offer"],
  PRICE_DROP: ["Bajó de precio", "Price drop"],
};

export function AlertsView({ locale, searches, emails }: { locale: Locale; searches: Search[]; emails: EmailOutbox[] }) {
  const [items, setItems] = useState(searches);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
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
      setError(`${tx(locale, "No pudimos cambiar la frecuencia. Inténtalo otra vez en un momento", "We couldn’t change the frequency. Please try again in a moment")}: ${(e as Error).message}`);
    }
  };
  // Rename: an empty name goes back to the automatic summary (the stored name is then the summary itself).
  const save = async (s: Search) => {
    const typed = draft.trim();
    const name = typed.length >= 2 ? typed : alertTitle(s.query, !!s.polygon, locale).slice(0, 120);
    if (name === s.name) return setEditId(null);
    const prev = items;
    setError(null);
    setBusyId(s.id);
    setItems((xs) => xs.map((x) => (x.id === s.id ? { ...x, name } : x)));
    try {
      await api(`me/searches/${s.id}`, { method: "PATCH", json: { name } });
      setEditId(null);
    } catch (e) {
      setItems(prev);
      setError(`${tx(locale, "No pudimos guardar el nombre. Inténtalo otra vez en un momento", "We couldn’t save the name. Please try again in a moment")}: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
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
      setError(`${tx(locale, "No pudimos eliminar la alerta. Inténtalo otra vez en un momento", "We couldn’t delete the alert. Please try again in a moment")}: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };
  const freq = { INSTANT: tx(locale, "Al instante", "Instant"), DAILY: tx(locale, "Diaria", "Daily"), WEEKLY: tx(locale, "Semanal", "Weekly") };
  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1fr_380px]">
      <div>
        <div className={k.eyebrow}>{tx(locale, "Avisos a tu medida", "Made for you")}</div>
        <h1 className="mt-1 font-serif text-[40px] font-light leading-[1.05] md:text-[48px]">{tx(locale, "Alertas de búsqueda", "Search alerts")}</h1>
        <p className="mt-1 text-muted">{tx(locale, "Te escribimos cuando llega una casa que encaja contigo o cuando alguna baja de precio.", "We’ll write when a home that fits you comes along, or when one drops in price.")}</p>
        {error && <div role="alert" className="mt-4 rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <div className="mt-6 space-y-3">
          {items.map((s) => {
            const summary = alertTitle(s.query, !!s.polygon, locale);
            const custom = !isMachineName(s.name) && s.name !== summary;
            const title = custom ? s.name : summary;
            const editing = editId === s.id;
            return (
              <Card key={s.id} data-alert className={cn(k.card, "relative border-0 p-4 transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(28,29,29,.45)]")}>
                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-egeo/40 text-navy dark:bg-white/10 dark:text-ivory">{s.polygon || /(^|&)(poly|radius)=/.test(s.query) ? <MapPin size={18} strokeWidth={1.6} aria-hidden /> : <Bell size={18} strokeWidth={1.6} aria-hidden />}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[16px] font-semibold leading-snug text-ink">{title}</h2>
                    {custom && <div className="mt-0.5 text-[13px] leading-snug text-muted">{summary}</div>}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                      <span>{freq[s.frequency]} · {s.lastSentAt ? `${tx(locale, "último aviso", "last sent")} ${ago(s.lastSentAt, locale)}` : tx(locale, "aún sin avisos", "nothing sent yet")}</span>
                      {s.newCount > 0 && <Badge className="bg-[#DED5C7] text-navy dark:bg-white/10">{s.newCount} {tx(locale, "nuevos", "new")}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-[54px]">
                  {/* Stretched link: the whole card opens the results; the edit / delete controls sit above it (z-10). */}
                  <Link
                    href={`/${locale}/search?${s.query}`}
                    aria-label={`${tx(locale, "Ver casas", "See homes")} · ${title}`}
                    className="font-display text-[14px] font-semibold text-navy underline-offset-4 after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink dark:text-ivory"
                  >
                    {tx(locale, "Ver casas", "See homes")} <span aria-hidden>→</span>
                  </Link>
                  {!editing && confirmId !== s.id && (
                    <div className="relative z-10 flex items-center gap-1">
                      <button type="button" aria-label={`${tx(locale, "Editar", "Edit")} · ${title}`} onClick={() => { setConfirmId(null); setEditId(s.id); setDraft(custom ? s.name : ""); }} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/10">
                        <Pencil size={15} aria-hidden /> {tx(locale, "Editar", "Edit")}
                      </button>
                      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-danger hover:bg-black/5 dark:hover:bg-white/10" aria-label={`${tx(locale, "Eliminar", "Delete")} · ${title}`} onClick={() => setConfirmId(s.id)}>
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
                {confirmId === s.id && (
                  <div className="relative z-10 mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3" role="group" aria-label={tx(locale, "Confirmar eliminación", "Confirm deletion")}>
                    <span className="mr-auto text-sm font-semibold">{tx(locale, "¿Eliminar esta alerta?", "Delete this alert?")}</span>
                    <Button size="sm" variant="outline" className={k.outline} onClick={() => setConfirmId(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                    <Button size="sm" className="bg-danger hover:bg-danger" disabled={busyId === s.id} onClick={() => void remove(s)}>{tx(locale, "Eliminar", "Delete")}</Button>
                  </div>
                )}
                {editing && (
                  <form
                    className="relative z-10 mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-[1fr_auto]"
                    aria-label={`${tx(locale, "Editar alerta", "Edit alert")} · ${title}`}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save(s);
                    }}
                  >
                    <label className="grid gap-1 text-[13px] font-semibold">
                      {tx(locale, "Nombre (opcional)", "Name (optional)")}
                      <input
                        value={draft}
                        maxLength={120}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={summary}
                        className="h-11 rounded-xl border border-[#CDBFAC] bg-white px-3 text-[16px] font-normal text-navy focus:border-navy focus:outline-none dark:bg-white/5 dark:text-ivory sm:text-[15px]"
                      />
                    </label>
                    <label className="grid gap-1 text-[13px] font-semibold">
                      {tx(locale, "Te avisamos", "How often")}
                      <select
                        value={s.frequency}
                        onChange={(e) => void changeFrequency(s, e.target.value as Search["frequency"])}
                        className="h-11 rounded-xl border border-[#CDBFAC] bg-white px-3 text-[15px] font-normal text-navy focus:border-navy focus:outline-none dark:bg-white/5 dark:text-ivory"
                      >
                        <option value="INSTANT">{freq.INSTANT}</option>
                        <option value="DAILY">{freq.DAILY}</option>
                        <option value="WEEKLY">{freq.WEEKLY}</option>
                      </select>
                    </label>
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                      <Link href={`/${locale}/search?${s.query}`} className="mr-auto text-[13px] font-semibold text-navy underline underline-offset-4 dark:text-ivory">
                        {tx(locale, "Cambiar filtros en el mapa", "Change filters on the map")}
                      </Link>
                      <Button size="sm" variant="outline" type="button" className={k.outline} onClick={() => setEditId(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                      <Button size="sm" type="submit" disabled={busyId === s.id}>{tx(locale, "Guardar", "Save")}</Button>
                    </div>
                  </form>
                )}
              </Card>
            );
          })}
          {items.length === 0 && <Empty title={tx(locale, "Aún no tienes alertas", "No alerts yet")} body={tx(locale, "Guarda una búsqueda en el mapa y te avisaremos en cuanto aparezca algo para ti.", "Save a search on the map and we’ll let you know as soon as something fits.")} />}
        </div>
        <Button href={`/${locale}/search`} className="mt-5">{tx(locale, "Crear una alerta", "Create an alert")}</Button>
      </div>
      <aside>
        <Card className={cn(k.card, "border-0 p-5")}>
          <div className="flex items-center gap-2 font-serif text-[24px] font-light leading-tight"><Mail size={18} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" /> {tx(locale, "Avisos enviados", "Sent to you")}</div>
          <p className="mt-1 text-xs text-muted">{tx(locale, "Lo último que te hemos escrito.", "The latest we’ve written to you.")}</p>
          <ul className="mt-4 divide-y divide-line">
            {emails.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={e.kind === "TOUR" ? "ok" : "mist"} className={e.kind === "ALERT" ? "bg-[#DED5C7] text-navy dark:bg-white/10" : undefined}>{lbl(EMAIL_KIND_LABEL[e.kind] ?? [e.kind, e.kind], locale)}</Badge>
                  <span className="text-xs text-muted">{ago(e.at, locale)}</span>
                </div>
                <div className="mt-1.5 text-sm font-semibold">{localizeEmailSubject(e.subject, locale)}</div>
                <div className="text-xs text-muted">{e.to}{e.status !== "SIMULATED" && EMAIL_STATUS_LABEL[e.status as keyof typeof EMAIL_STATUS_LABEL] ? ` · ${lbl(EMAIL_STATUS_LABEL[e.status as keyof typeof EMAIL_STATUS_LABEL], locale)}` : ""}</div>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
