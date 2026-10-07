import type { Locale } from "@/types/domain";

/** Pure lead / advisor metrics shared by the Dashboard and the owner's audit page (no DB access: unit-testable). */

export const SLA_MINUTES = 15;
const MIN = 60_000;

type LeadTimes = { createdAt: Date; firstResponseAt: Date | null };

/**
 * % of leads answered within the 15-minute SLA, over every lead old enough to judge: unanswered leads past 15 min count
 * as breached (not ignored); unanswered leads younger than 15 min are still in time and left out. null = nothing to judge.
 */
export function slaPct(leads: LeadTimes[], now: number = Date.now()): number | null {
  const judged = leads.filter((l) => l.firstResponseAt || now - l.createdAt.getTime() > SLA_MINUTES * MIN);
  if (!judged.length) return null;
  const met = judged.filter((l) => l.firstResponseAt && l.firstResponseAt.getTime() - l.createdAt.getTime() <= SLA_MINUTES * MIN).length;
  return Math.round((met / judged.length) * 100);
}

/** Minutes from lead creation to first response, for answered leads only (negative gaps from bad data are dropped). */
export const responseMinutes = (leads: LeadTimes[]) =>
  leads.filter((l) => l.firstResponseAt).map((l) => (l.firstResponseAt!.getTime() - l.createdAt.getTime()) / MIN).filter((m) => m >= 0);

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Ratio as a whole percentage, or null when the denominator is 0 (no data, not 0 %). */
export const pct = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** "45 s" · "12 min" · "3 h" · "2,5 d" — "—" when there is no data. */
export function formatMinutes(mins: number | null | undefined, locale: Locale = "es"): string {
  if (mins == null || !Number.isFinite(mins)) return "—";
  const f = (n: number) => new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", { maximumFractionDigits: 1 }).format(n);
  if (mins < 1) return `${Math.max(1, Math.round(mins * 60))} s`;
  if (mins < 60) return `${Math.round(mins)} min`;
  if (mins < 1440) return `${f(Math.round((mins / 60) * 10) / 10)} h`;
  return `${f(Math.round((mins / 1440) * 10) / 10)} d`;
}

/** A metric value or "—" when it has no data (never "0" for "no data"). */
export const dash = (v: number | null | undefined, suffix = ""): string => (v == null || !Number.isFinite(v) ? "—" : `${v}${suffix}`);

export const AUDIT_PERIODS = [30, 90, 365] as const;
export type AuditPeriod = (typeof AUDIT_PERIODS)[number];
export const toPeriod = (v: unknown): AuditPeriod => {
  const n = Number(v);
  return (AUDIT_PERIODS as readonly number[]).includes(n) ? (n as AuditPeriod) : 30;
};
