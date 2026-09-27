import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { aiProvider } from "@/server/ai";
import { limit } from "@/server/rate-limit";

const Brief = z.object({
  kind: z.string().max(40),
  zone: z.string().max(80),
  city: z.string().max(80),
  areaM2: z.number().nonnegative().max(1_000_000),
  beds: z.number().min(0).max(100),
  baths: z.number().min(0).max(100),
  parking: z.number().min(0).max(100),
  amenities: z.array(z.string().max(40)).max(50),
  highlights: z.string().max(400).optional(),
});

export const POST = handler(async (req: NextRequest) => {
  requireUser(await currentUser());
  // The provider may be a paid LLM: cap per IP like the other AI endpoints.
  await limit(req, "ai-write", 20, 60);
  const b = await body(req, Brief);
  const p = await aiProvider();
  return ok({ provider: p.id, copy: await p.writeListing(b) });
});
