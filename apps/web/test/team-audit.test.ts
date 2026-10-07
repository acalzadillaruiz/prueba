import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import type { SessionUser } from "@/server/api";
import { AGENCY_PAGE_ROLES } from "@/lib/agency-pages";
import { dash, formatMinutes, mean, median, pct, responseMinutes, slaPct, toPeriod } from "@/lib/team-metrics";

// Route handlers read the session through currentUser(): swap it per test, keep the rest of the real module.
const session = vi.hoisted(() => ({ user: null as SessionUser | null }));
vi.mock("@/server/api", async (orig) => ({ ...(await orig<typeof import("@/server/api")>()), currentUser: async () => session.user }));

const { advisorPerformance, openTeamThread, requireAuditor, teamThreads } = await import("@/server/team-audit");
const metricsRoute = await import("@/app/api/v1/agency/audit/metrics/route");
const threadsRoute = await import("@/app/api/v1/agency/audit/threads/route");
const threadRoute = await import("@/app/api/v1/agency/audit/threads/[id]/route");

// Seed: Andes Prime (ag-andes: u-owner, u-agent, u-agent2, u-agent5) and Caracas Night (ag-night: u-owner2, u-agent3…).
// Team threads th-team-1..3 belong to Andes Prime, th-team-4 to Caracas Night (packages/db/prisma/seed-data/ops.ts).
const u = (id: string, role: SessionUser["role"], agencyId: string | null): SessionUser => ({ id, role, agencyId });
const owner = u("u-owner", "AGENCY_OWNER", "ag-andes");
const owner2 = u("u-owner2", "AGENCY_OWNER", "ag-night");
const agent = u("u-agent", "AGENT", "ag-andes");
const back = u("u-back", "BACKOFFICE", "ag-andes");
const code = (fn: () => unknown) => Promise.resolve().then(fn).then(() => "OK").catch((e: { code?: string }) => e.code ?? "ERR");

const t0 = new Date("2026-01-10T12:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const NOW = at(24 * 60).getTime();

const startedAt = new Date();
afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { action: "chat.audit.view", actorId: { in: ["u-owner", "u-owner2"] }, createdAt: { gte: startedAt } } });
});

describe("team metrics (pure)", () => {
  it("median first response: odd and even counts, nothing → null", () => {
    const leads = [5, 30, 12].map((m) => ({ createdAt: t0, firstResponseAt: at(m) }));
    expect(median(responseMinutes(leads))).toBe(12);
    expect(median([4, 10, 20, 60])).toBe(15);
    expect(mean([4, 10, 20, 60])).toBe(23.5);
    expect(median(responseMinutes([{ createdAt: t0, firstResponseAt: null }]))).toBeNull();
    expect(mean([])).toBeNull();
  });
  it("SLA %: answered ≤15 min pass, late or unanswered-past-15-min fail, young unanswered are not judged", () => {
    const leads = [
      { createdAt: t0, firstResponseAt: at(10) }, // pass
      { createdAt: t0, firstResponseAt: at(15) }, // pass (limit)
      { createdAt: t0, firstResponseAt: at(40) }, // late
      { createdAt: t0, firstResponseAt: null }, // unanswered for a day → breached
      { createdAt: new Date(NOW - 5 * 60_000), firstResponseAt: null }, // 5 min old → still in time, ignored
    ];
    expect(slaPct(leads, NOW)).toBe(50);
    expect(slaPct([{ createdAt: new Date(NOW - 60_000), firstResponseAt: null }], NOW)).toBeNull();
    expect(slaPct([], NOW)).toBeNull();
  });
  it("formats durations and shows — for no data (never 0)", () => {
    expect(formatMinutes(12)).toBe("12 min");
    expect(formatMinutes(180)).toBe("3 h");
    expect(formatMinutes(90, "en")).toBe("1.5 h");
    expect(formatMinutes(0.5)).toBe("30 s");
    expect(formatMinutes(2 * 1440)).toBe("2 d");
    expect(formatMinutes(null)).toBe("—");
    expect(dash(null, " %")).toBe("—");
    expect(dash(0, " %")).toBe("0 %");
    expect(pct(0, 0)).toBeNull();
    expect(pct(1, 4)).toBe(25);
  });
  it("period is one of 30 / 90 / 365 (anything else → 30)", () => {
    expect(toPeriod("90")).toBe(90);
    expect(toPeriod("365")).toBe(365);
    expect(toPeriod("7")).toBe(30);
    expect(toPeriod(null)).toBe(30);
  });
});

describe("advisor performance (seeded DB)", () => {
  it("one row per agent of the agency only, with metrics recomputed from the leads table", async () => {
    const rows = await advisorPerformance("ag-andes", 30);
    const ids = rows.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["u-agent", "u-agent2", "u-agent5"]));
    expect(ids).not.toContain("u-agent3");
    expect(ids).not.toContain("u-captor");
    const v = rows.find((r) => r.id === "u-agent")!;
    const leads = await prisma.lead.findMany({ where: { agencyId: "ag-andes", agentId: "u-agent", createdAt: { gte: new Date(Date.now() - 30 * 864e5) } }, select: { createdAt: true, firstResponseAt: true } });
    expect(v.leads).toBe(leads.length);
    expect(v.answered).toBe(leads.filter((l) => l.firstResponseAt).length);
    const med = median(responseMinutes(leads));
    expect(v.respMedianMin).toBeCloseTo(med!, 0);
    expect(v.slaPct).toBe(slaPct(leads));
  });
  it("an advisor without leads shows no data (null → —), not zeros", async () => {
    const p = (await advisorPerformance("ag-andes", 30)).find((r) => r.id === "u-agent5")!;
    expect(p.leads).toBe(0);
    expect(p.respMedianMin).toBeNull();
    expect(p.slaPct).toBeNull();
    expect(p.leadToTourPct).toBeNull();
    // Quality is "—" only for an advisor without listings (the seed may assign some to her).
    if (p.listings === 0) expect(p.quality).toBeNull();
    else expect(typeof p.quality).toBe("number");
    expect(p.verified).toBe(false);
  });
});

describe("authorization", () => {
  it("only the owner (or an impersonating superadmin) is an auditor", async () => {
    expect(await code(() => requireAuditor(owner))).toBe("OK");
    expect(await code(() => requireAuditor(u("u-super", "SUPERADMIN", "ag-andes")))).toBe("OK");
    expect(await code(() => requireAuditor(u("u-super", "SUPERADMIN", null)))).toBe("FORBIDDEN");
    expect(await code(() => requireAuditor(agent))).toBe("FORBIDDEN");
    expect(await code(() => requireAuditor(back))).toBe("FORBIDDEN");
    expect(await code(() => requireAuditor(null))).toBe("UNAUTHORIZED");
    expect(AGENCY_PAGE_ROLES.auditoria).not.toContain("AGENT");
    expect(AGENCY_PAGE_ROLES.auditoria).not.toContain("BACKOFFICE");
  });
  it("an owner of agency A never sees agency B threads", async () => {
    const mine = (await teamThreads("ag-andes")).map((t) => t.id);
    expect(mine).toEqual(expect.arrayContaining(["th-team-1", "th-team-2", "th-team-3"]));
    expect(mine).not.toContain("th-team-4");
    expect(await code(() => openTeamThread("ag-andes", "th-team-4", owner))).toBe("NOT_FOUND");
    expect(await code(() => teamThreads("ag-andes", { agentId: "u-agent3" }))).toBe("VALIDATION");
    const theirs = (await teamThreads("ag-night")).map((t) => t.id);
    expect(theirs).toContain("th-team-4");
    expect(theirs).not.toContain("th-team-1");
  });
  it("opening a thread is audit-logged and does not touch the participants' read state", async () => {
    const before = await prisma.threadParticipant.findMany({ where: { threadId: "th-team-1" }, orderBy: { userId: "asc" } });
    const t = await openTeamThread("ag-andes", "th-team-1", owner);
    expect(t.messages.length).toBeGreaterThan(0);
    const after = await prisma.threadParticipant.findMany({ where: { threadId: "th-team-1" }, orderBy: { userId: "asc" } });
    expect(after.map((p) => p.lastRead.getTime())).toEqual(before.map((p) => p.lastRead.getTime()));
    const log = await prisma.auditLog.findFirst({ where: { action: "chat.audit.view", actorId: "u-owner" }, orderBy: { createdAt: "desc" } });
    expect((log?.data as { threadId?: string } | null)?.threadId).toBe("th-team-1");
  });
});

describe("API routes", () => {
  const get = (path: string) => new NextRequest(`http://localhost/api/v1/agency/audit/${path}`);
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  it("an AGENT gets 403 on metrics, thread list and thread detail", async () => {
    session.user = agent;
    expect((await metricsRoute.GET(get("metrics"), undefined)).status).toBe(403);
    expect((await threadsRoute.GET(get("threads"), undefined)).status).toBe(403);
    expect((await threadRoute.GET(get("threads/th-team-1"), ctx("th-team-1"))).status).toBe(403);
    session.user = null;
    expect((await metricsRoute.GET(get("metrics"), undefined)).status).toBe(401);
  });
  it("owner A: own metrics only; agency B's thread is a 404", async () => {
    session.user = owner;
    const m = (await (await metricsRoute.GET(get("metrics?days=90"), undefined)).json()) as { days: number; items: { id: string }[] };
    expect(m.days).toBe(90);
    expect(m.items.map((i) => i.id)).not.toContain("u-agent3");
    expect((await threadRoute.GET(get("threads/th-team-4"), ctx("th-team-4"))).status).toBe(404);
    expect((await threadRoute.GET(get("threads/th-team-1"), ctx("th-team-1"))).status).toBe(200);
    session.user = owner2;
    expect((await threadRoute.GET(get("threads/th-team-1"), ctx("th-team-1"))).status).toBe(404);
    const theirs = (await (await metricsRoute.GET(get("metrics"), undefined)).json()) as { items: { id: string }[] };
    expect(theirs.items.map((i) => i.id)).not.toContain("u-agent");
  });
});
