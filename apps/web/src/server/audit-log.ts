import "server-only";
import { prisma, type Prisma } from "@newplace/db";

export type AuditRow = { id: string; at: string; actorId: string | null; actor: string; action: string; target: string; data: Record<string, unknown> | null };
export type AuditPage = { items: AuditRow[]; nextCursor: string | null };

const PAGE = 50;

/** Audit log page, newest first, cursor = id of the last row seen. `action` filters by prefix ("lead" or "lead.stage"). */
export async function auditPage(opts: { cursor?: string | null; action?: string | null; actorId?: string | null; take?: number }): Promise<AuditPage> {
  const take = Math.min(Math.max(opts.take ?? PAGE, 1), 100);
  const action = opts.action?.trim();
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { OR: [{ action }, { action: { startsWith: `${action}.` } }] } : {}),
    ...(opts.actorId ? { actorId: opts.actorId === "system" ? null : opts.actorId } : {}),
  };
  const cursorOk = opts.cursor ? await prisma.auditLog.findUnique({ where: { id: opts.cursor }, select: { id: true } }) : null;
  const rows = await prisma.auditLog.findMany({
    where,
    include: { actor: { select: { name: true, email: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursorOk ? { cursor: { id: cursorOk.id }, skip: 1 } : {}),
  });
  const page = rows.slice(0, take);
  const names = await targetNames(page.map((r) => r.target));
  return {
    items: page.map((a) => ({
      id: a.id,
      at: a.createdAt.toISOString(),
      actorId: a.actorId,
      actor: a.actor ? a.actor.name ?? a.actor.email : "",
      action: a.action,
      target: names.get(a.target) ?? a.target,
      data: a.data && typeof a.data === "object" && !Array.isArray(a.data) ? (a.data as Record<string, unknown>) : null,
    })),
    nextCursor: rows.length > take ? page[page.length - 1].id : null,
  };
}

/** Older entries store ids (user, agency, listing, lead) as target: resolve them to names. */
async function targetNames(targets: string[]) {
  const ids = [...new Set(targets.filter((t) => /^[a-z0-9-]{5,40}$/i.test(t)))];
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const [users, agencies, listings, leads] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }),
    prisma.agency.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.listing.findMany({ where: { id: { in: ids } }, select: { id: true, titleEs: true } }),
    prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);
  for (const u of users) out.set(u.id, u.name ?? u.email);
  for (const a of agencies) out.set(a.id, a.name);
  for (const l of listings) out.set(l.id, l.titleEs);
  for (const l of leads) out.set(l.id, l.name);
  return out;
}

/** Filter options: action families present and every actor that has written to the log. */
export async function auditFilters() {
  const [actions, actors, system] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true } }),
    prisma.user.findMany({ where: { audit: { some: {} } }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.auditLog.count({ where: { actorId: null } }),
  ]);
  const prefixes = [...new Set(actions.map((a) => a.action.split(".")[0]))].sort();
  return { prefixes, actions: actions.map((a) => a.action).sort(), actors: actors.map((a) => ({ id: a.id, name: a.name ?? a.email })), hasSystem: system > 0 };
}
