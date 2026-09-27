import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, handler, ok } from "@/server/api";
import { aiProvider } from "@/server/ai";
import { limit } from "@/server/rate-limit";

export const POST = handler(async (req: NextRequest) => {
  await limit(req, "ai-search", 30, 60);
  const b = await body(req, z.object({ q: z.string().min(1).max(300), locale: z.enum(["es", "en"]).default("es") }));
  const p = await aiProvider();
  return ok({ provider: p.id, query: await p.searchParse(b.q, b.locale) });
});
