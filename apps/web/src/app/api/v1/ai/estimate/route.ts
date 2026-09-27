import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, handler, ok } from "@/server/api";
import { estimateFor } from "@/server/estimate";
import { limit } from "@/server/rate-limit";

const Input = z.object({
  kind: z.enum(["apartment", "penthouse", "house", "townhouse", "studio", "office", "retail", "warehouse", "land", "villa", "chalet"]).default("apartment"),
  zone: z.string(),
  listingType: z.enum(["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL_SALE", "COMMERCIAL_RENT"]).default("SALE"),
  areaM2: z.number().positive(),
  beds: z.number().int().min(0).default(0),
  baths: z.number().int().min(0).default(0),
  parking: z.number().int().min(0).default(0),
  yearBuilt: z.number().int().default(2005),
  amenities: z.array(z.string()).default([]),
  luxury: z.boolean().default(false),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

/** Live PlaceEstimate for the owner wizard (no listing yet). */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "ai-estimate", 60, 60);
  const b = await body(req, Input);
  const r = await estimateFor({ ...b, lat: b.lat ?? null, lng: b.lng ?? null });
  return ok({ provider: r.provider, estimate: r.estimate });
});
