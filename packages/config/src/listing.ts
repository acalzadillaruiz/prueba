import { z } from "zod";

/** Property kinds accepted by the listings, estimate and capture-conversion APIs (single source of truth). */
export const PROPERTY_KINDS = ["apartment", "penthouse", "house", "townhouse", "studio", "office", "retail", "warehouse", "land", "villa", "chalet"] as const;
export type PropertyKind = (typeof PROPERTY_KINDS)[number];
export const propertyKindSchema = z.enum(PROPERTY_KINDS);

export interface QualityInput {
  /** Real uploaded photos only — brand scene illustrations never count. */
  photos: number;
  titleEn?: string | null;
  bodyEn?: string | null;
  /** Has a located address (coordinates). */
  located: boolean;
  hasFloorplan?: boolean;
  hasVirtualTour?: boolean;
}

/**
 * Listing quality score 0–100, shared by the server (stored `Listing.quality`) and the publishing wizards so the
 * number a publisher sees is the number that gets stored: 4 points per real photo (35 at 8+), 20 for the English
 * copy, 20 for the location, 15 floor plan, 10 virtual tour.
 */
export function listingQuality(q: QualityInput): number {
  const photos = Math.max(0, Math.floor(q.photos));
  return Math.min(100, (photos >= 8 ? 35 : photos * 4) + (q.titleEn && q.bodyEn ? 20 : 0) + (q.located ? 20 : 0) + (q.hasFloorplan ? 15 : 0) + (q.hasVirtualTour ? 10 : 0));
}
