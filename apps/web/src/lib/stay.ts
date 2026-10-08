/**
 * Vacation rentals (SHORT_RENT): the availability request's dates. Pure helpers shared by the contact panel and the
 * leads API, so both apply the same rules. Dates are calendar days ("YYYY-MM-DD", as <input type="date"> gives them).
 */
export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const utc = (d: string) => {
  if (!ISO_DAY.test(d)) return NaN;
  const [y, m, day] = d.split("-").map(Number);
  const t = Date.UTC(y, m - 1, day);
  // Rejects impossible days ("2026-02-31" would roll over to March).
  return new Date(t).getUTCDate() === day ? t : NaN;
};

/** Today in Venezuela (the listings' time zone), as "YYYY-MM-DD". */
export function todayCaracas(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "2026-10-08" + 3 → "2026-10-11". */
export function addDays(d: string, n: number) {
  const t = utc(d);
  return Number.isNaN(t) ? "" : new Date(t + n * DAY_MS).toISOString().slice(0, 10);
}

/** Nights between arrival and departure (0 or negative when departure isn't after arrival; NaN for a bad date). */
export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((utc(checkOut) - utc(checkIn)) / DAY_MS);
}

export type StayError = "missing-in" | "missing-out" | "bad-date" | "past" | "order" | "min" | "max";
export const MAX_STAY_NIGHTS = 365;

/** Checks an arrival/departure pair: arrival today or later, departure after arrival, at least `minNights`. */
export function validateStay(checkIn: string | undefined, checkOut: string | undefined, opts: { today: string; minNights?: number }): { nights: number; error: StayError | null } {
  if (!checkIn) return { nights: 0, error: "missing-in" };
  if (!checkOut) return { nights: 0, error: "missing-out" };
  if (Number.isNaN(utc(checkIn)) || Number.isNaN(utc(checkOut))) return { nights: 0, error: "bad-date" };
  if (utc(checkIn) < utc(opts.today)) return { nights: 0, error: "past" };
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return { nights: 0, error: "order" };
  if (opts.minNights && nights < opts.minNights) return { nights, error: "min" };
  if (nights > MAX_STAY_NIGHTS) return { nights, error: "max" };
  return { nights, error: null };
}

/** Estimated stay price: nightly price × nights + the one-off cleaning fee (null without a nightly price). */
export function stayEstimate(nightly: number | null | undefined, nights: number, cleaningFee = 0) {
  if (!nightly || nightly <= 0 || nights < 1) return null;
  const subtotal = nightly * nights;
  return { subtotal, cleaning: cleaningFee, total: subtotal + cleaningFee };
}

/** "jue 15 oct" / "Thu, Oct 15" for a calendar day (no time-zone shift). */
export function stayDay(d: string, locale: "es" | "en") {
  const t = utc(d);
  if (Number.isNaN(t)) return d;
  return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(t)).replace(/\./g, "");
}
