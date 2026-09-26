import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";

export const PUT = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ rates: z.array(z.object({ code: z.string().length(3), perUsd: z.number().positive() })) }));
  for (const r of b.rates) await prisma.fxRate.upsert({ where: { code: r.code }, create: { code: r.code, perUsd: r.perUsd, source: "manual" }, update: { perUsd: r.perUsd, source: "manual" } });
  await audit(u.id, "fx.update", b.rates.map((r) => `${r.code}=${r.perUsd}`).join(" "));
  return ok({ rates: await prisma.fxRate.findMany() });
});
