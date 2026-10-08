"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Plus, Trash2, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import {
  DAY_CLOSE_MIN,
  DAY_OPEN_MIN,
  fromMinutes,
  MAX_RANGES_PER_DAY,
  SLOT_MINUTES,
  toMinutes,
  visitHoursIssues,
  type SlotMinutes,
  type VisitHours,
  type VisitHoursIssue,
  type VisitRange,
} from "@/lib/visit-hours";

const DAY_LONG: [string, string][] = [
  ["Lunes", "Monday"],
  ["Martes", "Tuesday"],
  ["Miércoles", "Wednesday"],
  ["Jueves", "Thursday"],
  ["Viernes", "Friday"],
  ["Sábado", "Saturday"],
  ["Domingo", "Sunday"],
];
/** Every quarter hour between 07:00 and 21:00: selects, so an invalid time can't even be typed. */
const TIMES = Array.from({ length: (DAY_CLOSE_MIN - DAY_OPEN_MIN) / 15 + 1 }, (_, i) => fromMinutes(DAY_OPEN_MIN + i * 15));

const ISSUE: Record<VisitHoursIssue, [string, string]> = {
  format: ["Revisa esta franja.", "Check this time range."],
  grid: ["Usa horas en punto, y cuarto, y media o menos cuarto.", "Use quarter-hour times."],
  bounds: ["Las visitas van de 07:00 a 21:00.", "Visits run from 07:00 to 21:00."],
  order: ["La hora de fin tiene que ir después de la de inicio.", "The end time must come after the start."],
  short: ["La franja es más corta que una visita.", "The range is shorter than one visit."],
  overlap: ["Se cruza con otra franja de ese día.", "It overlaps another range that day."],
  too_many: [`Máximo ${MAX_RANGES_PER_DAY} franjas por día.`, `${MAX_RANGES_PER_DAY} ranges per day at most.`],
};

/**
 * "Horario de visitas" of an FSBO listing: the owner picks the visit length and, per weekday, up to 3 time ranges.
 * Saved with PUT /listings/:id/visit-hours; the public page then offers those slots (minus visits already booked).
 */
export function OwnerVisitHours({ listingId, locale, initial, onDone }: { listingId: string; locale: Locale; initial: VisitHours | null; onDone: (saved: boolean) => void }) {
  const [slotMin, setSlotMin] = useState<SlotMinutes>(initial?.slotMin ?? 60);
  const [ranges, setRanges] = useState<VisitRange[]>(initial?.ranges ?? []);
  const [showErr, setShowErr] = useState(false);
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const v: VisitHours = { slotMin, ranges };
  const issues = ranges.length ? visitHoursIssues(v) : { form: null, ranges: {} };
  const hasIssues = !!issues.form || Object.keys(issues.ranges).length > 0;
  const update = (i: number, p: Partial<VisitRange>) => setRanges((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const addRange = (day: number) =>
    setRanges((rs) => {
      const last = rs.filter((r) => r.day === day).sort((a, b) => toMinutes(b.to) - toMinutes(a.to))[0];
      const start = last ? Math.min(toMinutes(last.to) + 60, DAY_CLOSE_MIN - 120) : 9 * 60;
      return [...rs, { day, from: fromMinutes(start), to: fromMinutes(Math.min(start + 180, DAY_CLOSE_MIN)) }];
    });
  // The usual case: the same hours every weekday.
  const copyMondayToWeekdays = () => setRanges((rs) => [...rs.filter((r) => r.day === 0 || r.day > 4), ...[1, 2, 3, 4].flatMap((day) => rs.filter((r) => r.day === 0).map((r) => ({ ...r, day })))]);

  const save = async (value: VisitHours | null) => {
    setErr(null);
    setBusy(value ? "save" : "clear");
    try {
      await api(`listings/${listingId}/visit-hours`, { method: "PUT", json: { visitHours: value } });
      onDone(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const sel = "h-10 rounded-lg border border-line bg-white px-2 text-sm aria-[invalid=true]:border-danger dark:bg-white/5";

  return (
    <form
      noValidate
      data-testid="visit-hours-form"
      className="mt-4 space-y-4 rounded-[18px] border border-line bg-[#FBF8F3] p-4 dark:bg-white/[.03]"
      aria-label={tx(locale, "Horario de visitas", "Visit hours")}
      onSubmit={(e) => {
        e.preventDefault();
        setShowErr(true);
        if (!ranges.length) {
          setErr(tx(locale, "Añade al menos una franja, o quita el horario si prefieres que te pidan la visita.", "Add at least one range, or remove the hours if you’d rather people ask for a visit."));
          return;
        }
        if (hasIssues) return;
        void save(v);
      }}
    >
      <div>
        <div className="font-serif text-[22px] font-medium leading-tight">{tx(locale, "Horario de visitas", "Visit hours")}</div>
        <p className="mt-1 text-sm text-muted">
          {tx(locale, "Elige cuándo puedes enseñar tu casa. Quien la vea en New Place podrá reservar una de esas horas y tú la confirmas desde aquí.", "Choose when you can show your home. People on New Place can book one of those times and you confirm it from here.")}
        </p>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">{tx(locale, "Cuánto dura cada visita", "How long each visit lasts")}</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tx(locale, "Duración de cada visita", "Length of each visit")}>
          {SLOT_MINUTES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={slotMin === m} onClick={() => setSlotMin(m)} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold", slotMin === m ? "border-navy bg-navy text-ivory" : "border-line bg-white dark:bg-transparent")}>
              {slotMin === m && <Check size={14} aria-hidden />} {m} min
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-line rounded-lg border border-line bg-white dark:bg-transparent">
        {DAY_LONG.map((name, day) => {
          const mine = ranges.map((r, i) => [r, i] as const).filter(([r]) => r.day === day);
          return (
            <li key={day} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5">
              <span className="w-24 shrink-0 pt-2 text-sm font-semibold">{tx(locale, ...name)}</span>
              <div className="min-w-0 flex-1 space-y-2">
                {mine.length === 0 && <div className="pt-2 text-sm text-muted">{tx(locale, "Sin visitas", "No visits")}</div>}
                {mine.map(([r, i]) => {
                  const issue = showErr ? issues.ranges[i] : undefined;
                  const label = `${tx(locale, ...name)} ${r.from}–${r.to}`;
                  return (
                    <div key={i}>
                      <div className="flex flex-wrap items-center gap-2">
                        <select className={sel} value={r.from} aria-invalid={!!issue} aria-label={tx(locale, `Desde (${tx(locale, ...name)})`, `From (${tx(locale, ...name)})`)} onChange={(e) => update(i, { from: e.target.value })}>
                          {TIMES.slice(0, -1).map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span aria-hidden>–</span>
                        <select className={sel} value={r.to} aria-invalid={!!issue} aria-label={tx(locale, `Hasta (${tx(locale, ...name)})`, `Until (${tx(locale, ...name)})`)} onChange={(e) => update(i, { to: e.target.value })}>
                          {TIMES.slice(1).map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-danger" aria-label={tx(locale, `Quitar ${label}`, `Remove ${label}`)} onClick={() => setRanges((rs) => rs.filter((_, k) => k !== i))}>
                          <X size={16} />
                        </button>
                      </div>
                      {issue && <p role="alert" className="mt-1 text-xs font-semibold text-danger">{tx(locale, ...ISSUE[issue])}</p>}
                    </div>
                  );
                })}
              </div>
              {mine.length < MAX_RANGES_PER_DAY && (
                <button type="button" className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-navy underline decoration-navy/30 underline-offset-4 dark:text-ivory" onClick={() => addRange(day)} aria-label={tx(locale, `Añadir franja el ${tx(locale, ...name).toLowerCase()}`, `Add a range on ${tx(locale, ...name)}`)}>
                  <Plus size={13} aria-hidden /> {tx(locale, "Franja", "Range")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {ranges.some((r) => r.day === 0) && (
        <button type="button" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-navy underline decoration-navy/30 underline-offset-4 dark:text-ivory" onClick={copyMondayToWeekdays}>
          <Copy size={14} aria-hidden /> {tx(locale, "Copiar el lunes de martes a viernes", "Copy Monday to Tuesday–Friday")}
        </button>
      )}
      <p className="text-xs text-muted">{tx(locale, "Hora de Caracas. Se reserva con al menos 2 horas de antelación y hasta 8 días antes. Tus datos de contacto no se muestran: te llega cada pedido aquí y por email.", "Caracas time. Bookings need at least 2 hours’ notice, up to 8 days ahead. Your contact details aren’t shown: each request reaches you here and by email.")}</p>
      {err && <div role="alert" className="rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger">{err}</div>}
      {showErr && hasIssues && <p role="alert" className="text-sm font-semibold text-danger">{tx(locale, "Revisa las franjas marcadas.", "Check the highlighted ranges.")}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="navy" size="sm" disabled={!!busy}>{busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {tx(locale, "Guardar horario", "Save hours")}</Button>
        {initial && (
          <Button type="button" variant="ghost" size="sm" className="text-danger" disabled={!!busy} onClick={() => save(null)}>
            {busy === "clear" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {tx(locale, "Quitar horario", "Remove hours")}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone(false)}>{tx(locale, "Cancelar", "Cancel")}</Button>
      </div>
    </form>
  );
}
