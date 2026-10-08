import { z } from "zod";

/**
 * Weekly visit hours of an owner-published (FSBO) listing, stored in Listing.visitHours.
 * Everything is America/Caracas wall time (UTC−4, no DST); `day` follows TourSlot: 0 = Monday … 6 = Sunday.
 * Pure module (client + server): validation, slot generation and the "is this a real slot?" check share one source.
 */
export const SLOT_MINUTES = [30, 45, 60, 90] as const;
export type SlotMinutes = (typeof SLOT_MINUTES)[number];
/** Visits between 07:00 and 21:00, on a 15-minute grid, at most 3 ranges per day. */
export const DAY_OPEN_MIN = 7 * 60;
export const DAY_CLOSE_MIN = 21 * 60;
export const MAX_RANGES_PER_DAY = 3;
/** Bookable from 2 h ahead up to 8 days ahead (same window as agent calendars, server/tours.ts). */
export const MIN_LEAD_MS = 2 * 3600e3;
export const HORIZON_MS = 8 * 864e5;

const CARACAS_OFFSET_MIN = -4 * 60;

export type VisitRange = { day: number; from: string; to: string };
export type VisitHours = { slotMin: SlotMinutes; ranges: VisitRange[] };
export type VisitHoursIssue = "format" | "grid" | "bounds" | "order" | "short" | "overlap" | "too_many";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "format");
export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const visitHoursSchema = z
  .object({
    slotMin: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
    ranges: z.array(z.object({ day: z.number().int().min(0).max(6), from: hhmm, to: hhmm }).strict()).min(1).max(7 * MAX_RANGES_PER_DAY),
  })
  .strict()
  .superRefine((v, ctx) => {
    const issue = (i: number, message: VisitHoursIssue) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ranges", i], message });
    v.ranges.forEach((r, i) => {
      const a = toMinutes(r.from);
      const b = toMinutes(r.to);
      if (a % 15 || b % 15) issue(i, "grid");
      else if (a < DAY_OPEN_MIN || b > DAY_CLOSE_MIN) issue(i, "bounds");
      else if (b <= a) issue(i, "order");
      else if (b - a < v.slotMin) issue(i, "short");
    });
    for (let d = 0; d < 7; d++) {
      const idx = v.ranges.map((r, i) => [r, i] as const).filter(([r]) => r.day === d);
      if (idx.length > MAX_RANGES_PER_DAY) issue(idx[MAX_RANGES_PER_DAY][1], "too_many");
      const sorted = [...idx].sort((x, y) => toMinutes(x[0].from) - toMinutes(y[0].from));
      for (let k = 1; k < sorted.length; k++) if (toMinutes(sorted[k][0].from) < toMinutes(sorted[k - 1][0].to)) issue(sorted[k][1], "overlap");
    }
  });

/** Stored JSON → hours, or null when absent/invalid (an invalid value never produces bookable slots). */
export function parseVisitHours(json: unknown): VisitHours | null {
  const r = visitHoursSchema.safeParse(json);
  return r.success ? (r.data as VisitHours) : null;
}

/** Issues per range index (first one wins), for the owner's form. */
export function visitHoursIssues(v: VisitHours): { form: VisitHoursIssue | null; ranges: Record<number, VisitHoursIssue> } {
  const r = visitHoursSchema.safeParse(v);
  const out: { form: VisitHoursIssue | null; ranges: Record<number, VisitHoursIssue> } = { form: null, ranges: {} };
  if (r.success) return out;
  for (const i of r.error.issues) {
    const msg = (["format", "grid", "bounds", "order", "short", "overlap", "too_many"] as const).find((m) => m === i.message) ?? "format";
    if (i.path[0] === "ranges" && typeof i.path[1] === "number") out.ranges[i.path[1]] ??= msg;
    else out.form ??= msg;
  }
  return out;
}

/** Slot starts (minutes after midnight) of one weekday: each range split in slotMin steps that fit entirely. */
export function slotMinutesOn(h: VisitHours, weekday: number): number[] {
  const out = new Set<number>();
  for (const r of h.ranges) {
    if (r.day !== weekday) continue;
    const end = toMinutes(r.to);
    for (let m = toMinutes(r.from); m + h.slotMin <= end; m += h.slotMin) out.add(m);
  }
  return [...out].sort((a, b) => a - b);
}

/** Caracas wall clock of an instant: weekday (0 = Monday) and minutes after midnight. */
export function caracasClock(at: Date | number) {
  const local = new Date(new Date(at).getTime() + CARACAS_OFFSET_MIN * 60e3);
  return { y: local.getUTCFullYear(), m: local.getUTCMonth(), d: local.getUTCDate(), weekday: (local.getUTCDay() + 6) % 7, minutes: local.getUTCHours() * 60 + local.getUTCMinutes(), seconds: local.getUTCSeconds() * 1000 + local.getUTCMilliseconds() };
}

/** True when `start` is exactly one of the published slots (any week; the booking window is checked separately). */
export function isVisitSlot(h: VisitHours, start: Date): boolean {
  if (Number.isNaN(start.getTime())) return false;
  const c = caracasClock(start);
  return c.seconds === 0 && slotMinutesOn(h, c.weekday).includes(c.minutes);
}

export type SlotDay = { date: string; hours: { hour: number; minute: number; label: string; iso: string; available: boolean }[] };

/**
 * The next days with published slots (up to `maxDays`), as the booking UI shows them. A slot is unavailable when it
 * starts less than 2 h from now or clashes with a visit already booked with the same person (|Δ| < slotMin).
 */
export function upcomingVisitDays(h: VisitHours, now: number, busy: Date[], maxDays = 5): SlotDay[] {
  const days: SlotDay[] = [];
  const busyAt = (t: number) => busy.some((b) => Math.abs(b.getTime() - t) < h.slotMin * 60e3);
  for (let i = 0; i < 8 && days.length < maxDays; i++) {
    const c = caracasClock(now + i * 864e5);
    const list = slotMinutesOn(h, c.weekday)
      .map((min) => {
        const t = Date.UTC(c.y, c.m, c.d, 0, min - CARACAS_OFFSET_MIN);
        return { hour: Math.floor(min / 60), minute: min % 60, label: fromMinutes(min), iso: new Date(t).toISOString(), available: t >= now + MIN_LEAD_MS && t <= now + HORIZON_MS && !busyAt(t) };
      })
      .filter((s) => new Date(s.iso).getTime() > now);
    if (list.length) days.push({ date: new Date(Date.UTC(c.y, c.m, c.d, 12)).toISOString(), hours: list });
  }
  return days;
}

/** Preferred times a visitor can give when the owner has no calendar (or it is full). */
export const VISIT_PREFS = ["WEEKDAY_AM", "WEEKDAY_PM", "WEEKEND"] as const;
export type VisitPref = (typeof VISIT_PREFS)[number];
export const VISIT_PREF_LABEL: Record<VisitPref, [string, string]> = {
  WEEKDAY_AM: ["Entre semana, por la mañana", "Weekdays, morning"],
  WEEKDAY_PM: ["Entre semana, por la tarde", "Weekdays, afternoon"],
  WEEKEND: ["El fin de semana", "At the weekend"],
};

/** Who can take visit bookings on the public page: an agent's calendar, or the owner of an FSBO listing. */
export const OPEN_FOR_TOURS = ["ACTIVE", "COMING_SOON", "UNDER_OFFER"];
export const isFsbo = (l: { agentId?: string | null; agencyId?: string | null; ownerUserId?: string | null }) => !l.agentId && !l.agencyId && !!l.ownerUserId;
export const takesTours = (l: { status: string; agentId?: string | null; agencyId?: string | null; ownerUserId?: string | null }) => OPEN_FOR_TOURS.includes(l.status) && (!!l.agentId || isFsbo(l));
