import type { Listing } from "@/types/domain";

/** Public page for published listings; the authenticated preview for drafts, reviews, private or taken-down ones. */
export function listingHref(locale: string, l: Pick<Listing, "slug" | "status" | "review">) {
  const published = ["COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"].includes(l.status) && (l.review ?? "APPROVED") === "APPROVED";
  return `/${locale}/${published ? "listing" : "preview"}/${l.slug}`;
}
