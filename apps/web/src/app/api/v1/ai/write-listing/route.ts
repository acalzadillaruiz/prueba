import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { aiProvider } from "@/server/ai";

const Brief = z.object({
  kind: z.string(),
  zone: z.string(),
  city: z.string(),
  areaM2: z.number(),
  beds: z.number(),
  baths: z.number(),
  parking: z.number(),
  amenities: z.array(z.string()),
  highlights: z.string().max(400).optional(),
});

export const POST = handler(async (req: NextRequest) => {
  requireUser(await currentUser());
  const b = await body(req, Brief);
  const p = await aiProvider();
  return ok({ provider: p.id, copy: await p.writeListing(b) });
});
