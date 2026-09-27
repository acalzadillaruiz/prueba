/** Agency commission for a closed deal. Sale: % of price. Long rent: N months of rent. Vacation: % of one month (30 nights). */
export function commissionAmount(listingType: string, price: number, rule: { salePct: number; rentMonths: number }) {
  if (listingType === "SHORT_RENT") return Math.round((price * 30 * rule.salePct) / 100);
  if (listingType.includes("RENT")) return Math.round(price * rule.rentMonths);
  return Math.round((price * rule.salePct) / 100);
}
