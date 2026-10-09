import type { Listing, Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";

/** "Precio verificado" needs an estimate backed by at least this many comparables (same listing type and kind class). */
export const MIN_VERIFY_COMPARABLES = 3;
/** …and an asking price within ±10 % of that estimate. */
export const VERIFY_TOLERANCE = 0.1;

type Priced = Pick<Listing, "priceAmount"> & { estimate: { mid: number; comparables: readonly unknown[] } };

/**
 * THE rule for the price badge (cards, hero spotlight, detail): the price is "verified" only when the asking price is
 * within ±10 % of PlaceEstimate's value AND that value comes from ≥ 3 comparables of the same type (the estimate pool
 * only takes listings of the same listing type and kind class). Anything else is just the owner's price.
 */
export function isPriceVerified(l: Priced): boolean {
  const { mid, comparables } = l.estimate;
  if (!(mid > 0) || !(l.priceAmount > 0) || comparables.length < MIN_VERIFY_COMPARABLES) return false;
  return Math.abs(l.priceAmount - mid) / mid <= VERIFY_TOLERANCE;
}

/** Badge text: "Precio verificado" or "Precio del propietario" (cards may show no badge at all for the latter). */
export function priceBadgeLabel(l: Priced, locale: Locale): string {
  return isPriceVerified(l) ? tx(locale, "Precio verificado", "Price verified") : tx(locale, "Precio del propietario", "Owner's price");
}
