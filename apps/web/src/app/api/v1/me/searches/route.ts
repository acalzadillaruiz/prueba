import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  return ok({ items: await prisma.savedSearch.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } }) });
});

const Create = z.object({
  name: z.string().min(2).max(120),
  query: z.string().max(1000),
  polygon: z.array(z.object({ lat: z.number(), lng: z.number() })).min(3).optional(),
  frequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]).default("DAILY"),
});

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const b = await body(req, Create);
  const s = await prisma.savedSearch.create({ data: { userId: u.id, name: b.name, query: b.query, polygon: b.polygon, frequency: b.frequency } });
  return ok(s, 201);
});
