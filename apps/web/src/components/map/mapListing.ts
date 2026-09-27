import type { Listing } from "@/types/domain";

const MAP_FIELDS = ["id", "slug", "lat", "lng", "priceAmount", "priceCurrency", "pricePeriod", "luxury", "title_es", "title_en", "scenes", "photos", "beds", "baths", "areaM2", "status", "listingType"] as const;

/**
 * Only what the map pins and the map preview card read. Server pages pass map listings to client components,
 * so every field is serialized into the HTML (RSC payload): full listings (texts, estimate, comparables, price
 * history…) made the home page carry ~33 complete listings just for its pins.
 */
export function mapListing(l: Listing): Listing {
  const out: Partial<Listing> = {};
  for (const k of MAP_FIELDS) (out as Record<string, unknown>)[k] = l[k];
  return out as Listing;
}
