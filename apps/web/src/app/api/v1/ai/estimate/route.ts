import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, handler, ok } from "@/server/api";
import { estimateFor } from "@/server/estimate";
import { limit } from "@/server/rate-limit";

const Input = z.object({
  kind: z.enum(["apartment", "penthouse", "house", "townhouse", "studio", "office", "retail", "warehouse", "land", "villa", "chalet"]).default("apartment"),
  // Public endpoint: every field bounded like the listings API (no megabyte arrays / absurd numbers into the provider).
  zone: z.string().min(1).max(80),
  listingType: z.enum(["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL_SALE", "COMMERCIAL_RENT"]).default("SALE"),
  areaM2: z.number().positive().max(1_000_000),
  beds: z.number().int().min(0).max(30).default(0),
  baths: z.number().int().min(0).max(30).default(0),
  parking: z.number().int().min(0).max(50).default(0),
  yearBuilt: z.number().int().min(1800).max(2100).default(2005),
  amenities: z.array(z.string().max(40)).max(50).default([]),
  luxury: z.boolean().default(false),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

/** Live PlaceEstimate for the owner wizard (no listing yet). */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "ai-estimate", 60, 60);
  const b = await body(req, Input);
  const r = await estimateFor({ ...b, lat: b.lat ?? null, lng: b.lng ?? null });
  return ok({ provider: r.provider, estimate: r.estimate });
});
