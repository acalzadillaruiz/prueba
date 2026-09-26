import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { getSlots } from "@/server/data";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  return ok({ days: await getSlots(u.id) });
});

const Put = z.object({ days: z.array(z.object({ day: z.number().int().min(0).max(6), hours: z.array(z.number().int().min(6).max(21)) })) });

export const PUT = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "AGENT" && u.role !== "AGENCY_OWNER") throw new ApiError("FORBIDDEN");
  const { days } = await body(req, Put);
  await prisma.$transaction([
    prisma.tourSlot.deleteMany({ where: { agentId: u.id } }),
    prisma.tourSlot.createMany({ data: days.flatMap((d) => [...new Set(d.hours)].map((hour) => ({ agentId: u.id, weekday: d.day, hour }))) }),
  ]);
  return ok({ days: await getSlots(u.id) });
});
