"use client";

import { useState } from "react";
import { CalendarCheck, CalendarPlus, Check, Loader2, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Badge, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { TimeAgo } from "./TimeAgo";

export type OwnerLead = { id: string; listingId: string; name: string; email: string; phone: string | null; message: string; createdAt: string };
export type OwnerTour = { id: string; listingId: string; leadId: string | null; seekerName: string; email: string | null; phone: string | null; start: string; status: "REQUESTED" | "CONFIRMED" | "DONE" | "CANCELLED"; virtual: boolean };

const TOUR_LABEL: Record<OwnerTour["status"], [string, string]> = {
  REQUESTED: ["Por confirmar", "To confirm"],
  CONFIRMED: ["Confirmada", "Confirmed"],
  DONE: ["Hecha", "Done"],
  CANCELLED: ["Cancelada", "Cancelled"],
};

const when = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleString(locale === "es" ? "es-VE" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" });

/** "YYYY-MM-DDTHH:mm" for a datetime-local input, in the browser's time. */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16);

/**
 * FSBO inbox for one listing: who wrote (with how to reach them) and the visits, which the owner confirms, cancels
 * or proposes (POST /leads/:id/tour, PATCH /tours/:id). The owner attends the visits themselves.
 */
export function OwnerInbox({ locale, leads, tours, onChanged, manage = true }: { locale: Locale; leads: OwnerLead[]; tours: OwnerTour[]; onChanged: () => void; /** false on a mandate: the agency schedules. */ manage?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [proposing, setProposing] = useState<string | null>(null);
  const [at, setAt] = useState("");
  const [showAll, setShowAll] = useState(false);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      onChanged();
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };
  const upcoming = tours.filter((t) => t.status === "REQUESTED" || t.status === "CONFIRMED");
  const shown = showAll ? leads : leads.slice(0, 5);
  const minAt = localInput(new Date(Date.now() + 60 * 60e3));

  if (!leads.length && !upcoming.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {err && <div role="alert" className="rounded-lg bg-[#B3261E1A] px-3 py-2 text-xs text-danger">{err}</div>}
      {upcoming.length > 0 && (
        <div className="rounded-lg border border-line" data-testid="owner-tours">
          <div className="border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">{tx(locale, "Visitas", "Visits")} · {upcoming.length}</div>
          <ul className="divide-y divide-line">
            {upcoming.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-sm">
                <CalendarCheck size={15} className="text-muted" aria-hidden />
                <span className="font-display font-semibold">{when(t.start, locale)}</span>
                <span>{t.seekerName}</span>
                {t.phone && <a href={`tel:${t.phone}`} className="font-semibold text-navy underline decoration-navy/30 underline-offset-4">{t.phone}</a>}
                {t.virtual && <Badge tone="mist">{tx(locale, "Por videollamada", "Video call")}</Badge>}
                <Badge tone={t.status === "CONFIRMED" ? "ok" : "warn"} className="ml-auto">{tx(locale, ...TOUR_LABEL[t.status])}</Badge>
                {manage && <span className="flex gap-1">
                  {t.status === "REQUESTED" && (
                    <Button size="sm" variant="navy" disabled={busy === t.id} onClick={() => run(t.id, () => api(`tours/${t.id}`, { method: "PATCH", json: { status: "CONFIRMED" } }))}>
                      {busy === t.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {tx(locale, "Confirmar", "Confirm")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busy === t.id} onClick={() => run(t.id, () => api(`tours/${t.id}`, { method: "PATCH", json: { status: "CANCELLED" } }))}>
                    <X size={13} /> {tx(locale, "Cancelar", "Cancel")}
                  </Button>
                </span>}
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-3 py-2 text-[11px] text-muted">{tx(locale, "Tú atiendes las visitas: avisa a la persona si cambias algo.", "You attend the visits: let the person know if anything changes.")}</div>
        </div>
      )}
      {leads.length > 0 && (
        <div className="rounded-lg border border-line" data-testid="owner-leads">
          <div className="border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">{tx(locale, "Personas interesadas", "Interested people")} · {leads.length}</div>
          <ul className="divide-y divide-line">
            {shown.map((ld) => {
              const booked = upcoming.some((t) => t.leadId === ld.id);
              return (
                <li key={ld.id} className="px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="font-semibold">{ld.name}</span>
                    <a href={`mailto:${ld.email}`} className="font-semibold text-navy underline decoration-navy/30 underline-offset-4">{ld.email}</a>
                    {ld.phone && <a href={`tel:${ld.phone}`} className="font-semibold text-navy underline decoration-navy/30 underline-offset-4">{ld.phone}</a>}
                    <TimeAgo iso={ld.createdAt} locale={locale} className="ml-auto text-xs text-muted" />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-ink/70">{ld.message}</p>
                  {proposing === ld.id ? (
                    <form
                      className="mt-2 flex flex-wrap items-center gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const d = new Date(at);
                        if (!at || Number.isNaN(d.getTime()) || d.getTime() < Date.now()) {
                          setErr(tx(locale, "Elige un día y una hora que aún no hayan pasado.", "Pick a day and time that hasn’t passed yet."));
                          return;
                        }
                        if (await run(`tour-${ld.id}`, () => api(`leads/${ld.id}/tour`, { method: "POST", json: { start: d.toISOString() } }))) setProposing(null);
                      }}
                    >
                      <input type="datetime-local" min={minAt} step={900} value={at} onChange={(e) => setAt(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm" aria-label={tx(locale, `Día y hora de la visita con ${ld.name}`, `Day and time of the visit with ${ld.name}`)} />
                      <Button size="sm" type="submit" variant="navy" disabled={busy === `tour-${ld.id}`}>
                        {busy === `tour-${ld.id}` ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {tx(locale, "Confirmar visita", "Confirm visit")}
                      </Button>
                      <Button size="sm" type="button" variant="ghost" onClick={() => setProposing(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                      <span className="w-full text-[11px] text-muted">{tx(locale, "Le enviamos un email con la confirmación.", "We email them the confirmation.")}</span>
                    </form>
                  ) : (
                    manage && !booked && (
                      <button type="button" className={cn("mt-1.5 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-navy underline decoration-navy/30 underline-offset-4")} onClick={() => { setProposing(ld.id); setAt(""); setErr(null); }}>
                        <CalendarPlus size={13} /> {tx(locale, "Proponer una visita", "Propose a visit")}
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
          {leads.length > 5 && (
            <button type="button" className="w-full border-t border-line px-3 py-2 text-left text-[11px] font-semibold text-navy" onClick={() => setShowAll((v) => !v)}>
              {showAll ? tx(locale, "Ver menos", "Show less") : tx(locale, `Ver ${leads.length - 5} más`, `Show ${leads.length - 5} more`)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
