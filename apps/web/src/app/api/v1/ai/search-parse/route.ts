import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, handler, ok } from "@/server/api";
import { aiProvider } from "@/server/ai";

export const POST = handler(async (req: NextRequest) => {
  const b = await body(req, z.object({ q: z.string().min(1).max(300), locale: z.enum(["es", "en"]).default("es") }));
  const p = await aiProvider();
  return ok({ provider: p.id, query: await p.searchParse(b.q, b.locale) });
});
