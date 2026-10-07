import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import type { SessionUser } from "@/server/api";

let as: SessionUser | null = null;
vi.mock("@/auth", () => ({ auth: async () => (as ? { user: { id: as.id, agencyId: as.agencyId } } : null) }));
vi.mock("@/server/identity", () => ({ liveIdentity: async () => as }));

const { findOrCreateListingThread } = await import("@/server/threads");
const { POST } = await import("@/app/api/v1/threads/route");

const seeker: SessionUser = { id: "u-seeker", role: "SEEKER", agencyId: null };
const code = (p: Promise<unknown>) => p.then(() => "OK").catch((e: { code?: string }) => e.code ?? "ERR");
const created: string[] = [];

// Seeded fixtures: a public listing with an advisor, a draft, one without an advisor.
// `pub` has no conversation with the seeker yet (seeded threads are left untouched).
const pub = () =>
  prisma.listing.findFirstOrThrow({
    where: { agentId: "u-agent", status: "ACTIVE", review: "APPROVED", privateListing: false, threads: { none: { participants: { some: { userId: "u-seeker" } } } } },
    orderBy: { id: "asc" },
    select: { id: true, titleEs: true },
  });

afterAll(async () => {
  await prisma.messageThread.deleteMany({ where: { id: { in: created } } });
});

describe("thread find-or-create from a listing (Contactar)", () => {
  it("creates one thread between the seeker and the listing's advisor, then reuses it", async () => {
    const l = await pub();
    const a = await findOrCreateListingThread(seeker, l.id);
    created.push(a.id);
    expect(a.created).toBe(true);
    const t = await prisma.messageThread.findUniqueOrThrow({ where: { id: a.id }, include: { participants: true } });
    expect(t.participants.map((p) => p.userId).sort()).toEqual(["u-agent", "u-seeker"]);
    expect(t.subject).toBe(l.titleEs);
    expect(t.listingId).toBe(l.id);
    const b = await findOrCreateListingThread(seeker, l.id);
    expect(b).toEqual({ id: a.id, created: false });
    // Two concurrent clicks never produce two threads.
    const [c, d] = await Promise.all([findOrCreateListingThread(seeker, l.id), findOrCreateListingThread(seeker, l.id)]);
    expect(c.id).toBe(a.id);
    expect(d.id).toBe(a.id);
  });
  it("reuses an existing conversation about the listing (seeded th-team-1)", async () => {
    const t = await prisma.messageThread.findUnique({ where: { id: "th-team-1" }, select: { listingId: true } });
    if (!t?.listingId) return; // seed without that thread
    expect(await findOrCreateListingThread(seeker, t.listingId)).toEqual({ id: "th-team-1", created: false });
  });
  it("hidden listings are 404 for outsiders; no advisor or contacting yourself is rejected", async () => {
    const draft = await prisma.listing.findFirstOrThrow({ where: { status: "DRAFT" }, select: { id: true } });
    expect(await code(findOrCreateListingThread(seeker, draft.id))).toBe("NOT_FOUND");
    expect(await code(findOrCreateListingThread(seeker, "nope"))).toBe("NOT_FOUND");
    const noAgent = await prisma.listing.findFirstOrThrow({ where: { agentId: null, status: "ACTIVE", review: "APPROVED" }, select: { id: true } });
    expect(await code(findOrCreateListingThread(seeker, noAgent.id))).toBe("VALIDATION");
    const l = await pub();
    expect(await code(findOrCreateListingThread({ id: "u-agent", role: "AGENT", agencyId: "ag-andes" }, l.id))).toBe("VALIDATION");
  });
  it("POST /threads: login required, participants cannot be chosen, cross-origin blocked", async () => {
    const l = await pub();
    const post = (json: unknown, headers: Record<string, string> = {}) =>
      POST(new NextRequest("http://localhost/api/v1/threads", { method: "POST", body: JSON.stringify(json), headers: { "content-type": "application/json", host: "localhost", ...headers } }), undefined as never);
    as = null;
    expect((await post({ listingId: l.id })).status).toBe(401);
    as = seeker;
    expect((await post({ listingId: l.id, agentId: "u-agent3" })).status).toBe(422);
    expect((await post({ listingId: l.id }, { origin: "https://evil.example" })).status).toBe(403);
    const ok = await post({ listingId: l.id });
    expect([200, 201]).toContain(ok.status);
    const { id } = await ok.json();
    created.push(id);
    expect(await prisma.threadParticipant.count({ where: { threadId: id } })).toBe(2);
    as = null;
  });
});
