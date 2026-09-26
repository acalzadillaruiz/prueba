import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { aiKeyConfigured } from "@/server/ai";
import { audit, getSetting } from "@/server/data";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  return ok({ aiProvider: await getSetting("aiProvider", "heuristic"), aiKeyConfigured: aiKeyConfigured(), aiModel: process.env.AI_MODEL ?? null, aiBaseUrl: process.env.AI_BASE_URL ?? null });
});

export const PUT = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ aiProvider: z.enum(["heuristic", "openai-compatible"]) }));
  await prisma.platformSetting.upsert({ where: { key: "aiProvider" }, create: { key: "aiProvider", value: b.aiProvider }, update: { value: b.aiProvider } });
  await audit(u.id, "ai.provider", b.aiProvider);
  return ok({ aiProvider: b.aiProvider, aiKeyConfigured: aiKeyConfigured() });
});
