import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit, queueEmail } from "@/server/data";
import { leadForUser } from "@/server/access";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const lead = await leadForUser(id, u);
  const { body: text } = await body(req, z.object({ body: z.string().min(1).max(2000) }));
  let thread = await prisma.messageThread.findFirst({ where: { leadId: id } });
  if (!thread) thread = await prisma.messageThread.create({ data: { leadId: id, listingId: lead.listingId, participants: { create: [{ userId: u.id }] } } });
  const m = await prisma.message.create({ data: { threadId: thread.id, senderId: u.id, body: text } });
  await prisma.messageThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
  await prisma.lead.update({ where: { id }, data: { messagesCount: { increment: 1 }, ...(!lead.firstResponseAt ? { firstResponseAt: new Date() } : {}) } });
  // First reply moves NEW → CONTACTED. Guarded update so two replies racing record the stage change once.
  const moved = await prisma.lead.updateMany({ where: { id, stage: "NEW" }, data: { stage: "CONTACTED" } });
  if (moved.count) {
    await prisma.leadEvent.create({ data: { leadId: id, type: "STAGE", data: { from: "NEW", to: "CONTACTED", auto: true }, actorId: u.id } });
    await audit(u.id, "lead.stage", lead.name, { from: "NEW", to: "CONTACTED", auto: true });
  }
  await prisma.leadEvent.create({ data: { leadId: id, type: "MESSAGE", actorId: u.id } });
  await queueEmail(lead.email, `${u.name ?? "Tu asesor"} te respondió en New Place`, "LEAD", text);
  return ok({ id: m.id, from: u.name ?? "", body: m.body, at: m.createdAt.toISOString(), mine: true }, 201);
});
