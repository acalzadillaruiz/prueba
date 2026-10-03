import type { Listing } from "@/types/domain";

/** Public page for published listings; the authenticated preview for drafts, reviews, private or taken-down ones. */
export function listingHref(locale: string, l: Pick<Listing, "slug" | "status" | "review">) {
  const published = ["COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"].includes(l.status) && (l.review ?? "APPROVED") === "APPROVED";
  return `/${locale}/${published ? "listing" : "preview"}/${l.slug}`;
}

/**
 * wa.me link to the listing's agency WhatsApp (the only real number source), with a prefilled message naming the
 * property. null when there is no number: callers then fall back to the tour / message form.
 */
export function whatsappHref(l: Pick<Listing, "slug" | "title_es" | "title_en" | "agency">, locale: string): string | null {
  const digits = (l.agency?.whatsapp ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const title = locale === "en" ? l.title_en : l.title_es;
  const text = locale === "en" ? `Hi, I’m interested in “${title}” on New Place.` : `Hola, me interesa «${title}» en New Place.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
