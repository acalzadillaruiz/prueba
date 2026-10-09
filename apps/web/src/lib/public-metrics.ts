import type { Locale } from "@/types/domain";
import { num, tx } from "@/lib/i18n";

/** Public engagement metrics only count real, recorded events of the last 7 days. */
export const WEEK_MS = 7 * 864e5;
/** Below this, a weekly count says nothing (and reads as fake precision): it is hidden. */
export const MIN_PUBLIC_COUNT = 5;

/** "12 personas la guardaron esta semana", or null when there are fewer than 5 real saves this week. */
export function weeklySavesLabel(count: number, locale: Locale): string | null {
  if (!Number.isFinite(count) || count < MIN_PUBLIC_COUNT) return null;
  const n = num(Math.floor(count), locale);
  return tx(locale, `${n} personas la guardaron esta semana`, `${n} people saved it this week`);
}
