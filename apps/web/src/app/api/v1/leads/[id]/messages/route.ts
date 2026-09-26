import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { queueEmail } from "@/server/data";
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
  await prisma.lead.update({
    where: { id },
    data: { messagesCount: { increment: 1 }, ...(lead.stage === "NEW" ? { stage: "CONTACTED" } : {}), ...(!lead.firstResponseAt ? { firstResponseAt: new Date() } : {}) },
  });
  await prisma.leadEvent.create({ data: { leadId: id, type: "MESSAGE", actorId: u.id } });
  await queueEmail(lead.email, `Respuesta de ${u.name ?? "tu agente"} en New Place`, "LEAD", text);
  return ok({ id: m.id, from: u.name ?? "", body: m.body, at: m.createdAt.toISOString(), mine: true }, 201);
});
