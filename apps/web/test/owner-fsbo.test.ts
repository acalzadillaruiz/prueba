import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@newplace/db";
import type { SessionUser } from "@/server/api";

// DB-backed (seeded database): a private owner manages their own FSBO listing — edit, pause/resume, delete, leads,
// visits and takedown appeals — and nobody else can. Every row created here is removed in afterAll.
let current: SessionUser | null = null;
vi.mock("@/server/api", async (orig) => ({ ...(await orig<typeof import("@/server/api")>()), currentUser: async () => current }));

const stamp = `fsbo${Date.now().toString(36)}`;
const listingIds: string[] = [];
const userIds: string[] = [];
let owner: SessionUser;
let stranger: SessionUser;

async function tempListing(extra: Record<string, unknown> = {}) {
  const id = `${stamp}-${listingIds.length}`;
  listingIds.push(id);
  return prisma.listing.create({
    data: {
      id, slug: id, titleEs: "Casa de prueba", titleEn: "Test home", bodyEs: "", bodyEn: "", address: `Calle ${id}`, zone: "Altamira", city: "Caracas", state: "",
      lat: 10.5, lng: -66.85, kind: "apartment", listingType: "SALE", category: "RESIDENTIAL", priceAmount: 100000, areaM2: 80, yearBuilt: 2000,
      amenities: [], scenes: [], fingerprint: id, status: "ACTIVE", review: "APPROVED", privateListing: true, ownerUserId: owner.id,
      ...extra,
    },
  });
}

const { NextRequest } = await import("next/server");
const req = (method: string, json?: unknown) => new NextRequest("http://localhost/api/v1/x", { method, ...(json !== undefined ? { body: JSON.stringify(json), headers: { "content-type": "application/json" } } : {}) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const listingRoute = await import("@/app/api/v1/listings/[id]/route");
const appealRoute = await import("@/app/api/v1/listings/[id]/appeal/route");
const tourRoute = await import("@/app/api/v1/tours/[id]/route");
const leadTourRoute = await import("@/app/api/v1/leads/[id]/tour/route");
const { leadForUser } = await import("@/server/access");
const code = (p: Promise<unknown>) => p.then(() => "OK").catch((e: { code?: string }) => e.code ?? "ERR");

beforeAll(async () => {
  const a = await prisma.user.create({ data: { email: `${stamp}-owner@owner.test`, name: "Dueña Test", role: "OWNER_PRIVATE" } });
  const b = await prisma.user.create({ data: { email: `${stamp}-other@owner.test`, name: "Otro", role: "OWNER_PRIVATE" } });
  userIds.push(a.id, b.id);
  owner = { id: a.id, role: "OWNER_PRIVATE", agencyId: null, name: a.name, email: a.email };
  stranger = { id: b.id, role: "OWNER_PRIVATE", agencyId: null, name: b.name, email: b.email };
});

afterAll(async () => {
  await prisma.moderationReport.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.emailOutbox.deleteMany({ where: { to: { contains: stamp } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("owner edits their FSBO listing (PATCH /listings/:id)", () => {
  it("edits texts, figures, year and essentials; agency-only fields stay protected", async () => {
    const l = await tempListing();
    current = owner;
    const r = await listingRoute.PATCH(req("PATCH", { title_es: "Casa renovada en Altamira", body_en: "Renovated", beds: 3, baths: 2, parking: 1, yearBuilt: 2010, amenities: ["pool"], ownWell: true }), ctx(l.id));
    expect(r.status).toBe(200);
    const row = await prisma.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect([row.titleEs, row.bodyEn, row.beds, row.baths, row.parking, row.yearBuilt, row.amenities, row.ownWell]).toEqual(["Casa renovada en Altamira", "Renovated", 3, 2, 1, 2010, ["pool"], true]);
    expect((await listingRoute.PATCH(req("PATCH", { agentId: "u-agent" }), ctx(l.id))).status).toBe(403);
    expect((await listingRoute.PATCH(req("PATCH", { review: "APPROVED" }), ctx(l.id))).status).toBe(403);
    expect((await listingRoute.PATCH(req("PATCH", { status: "EXPIRED" }), ctx(l.id))).status).toBe(403);
    current = stranger;
    expect((await listingRoute.PATCH(req("PATCH", { title_es: "Ajeno" }), ctx(l.id))).status).toBe(403);
  });

  it("pauses (WITHDRAWN) and resumes (ACTIVE)", async () => {
    const l = await tempListing();
    current = owner;
    expect((await listingRoute.PATCH(req("PATCH", { status: "WITHDRAWN" }), ctx(l.id))).status).toBe(200);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("WITHDRAWN");
    expect((await listingRoute.PATCH(req("PATCH", { status: "ACTIVE" }), ctx(l.id))).status).toBe(200);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("ACTIVE");
  });

  it("deletes it for good, but not someone else's nor a taken-down one", async () => {
    const l = await tempListing();
    const down = await tempListing({ status: "WITHDRAWN", takedownReason: "Fotos engañosas", statusBeforeTakedown: "ACTIVE" });
    current = stranger;
    expect((await listingRoute.DELETE(req("DELETE"), ctx(l.id))).status).toBe(403);
    current = owner;
    expect((await listingRoute.DELETE(req("DELETE"), ctx(down.id))).status).toBe(403);
    expect((await listingRoute.DELETE(req("DELETE"), ctx(l.id))).status).toBe(200);
    expect(await prisma.listing.count({ where: { id: l.id } })).toBe(0);
    // A taken-down listing can't be put back online by its owner either.
    expect((await listingRoute.PATCH(req("PATCH", { status: "ACTIVE" }), ctx(down.id))).status).toBe(403);
  });
});

describe("owner answers leads and visits of their FSBO listing", () => {
  it("opens their FSBO leads, not other people's nor an agency's", async () => {
    const l = await tempListing();
    const lead = await prisma.lead.create({ data: { listingId: l.id, name: "Comprador", email: `${stamp}-buyer@example.com`, message: "¿Sigue disponible?" } });
    expect(await code(leadForUser(lead.id, owner))).toBe("OK");
    expect(await code(leadForUser(lead.id, stranger))).toBe("FORBIDDEN");
    const agencyLead = await prisma.lead.create({ data: { listingId: l.id, agencyId: "ag-andes", name: "Otro", email: `${stamp}-b2@example.com`, message: "Hola" } });
    expect(await code(leadForUser(agencyLead.id, owner))).toBe("FORBIDDEN");
  });

  it("proposes a visit (the owner attends it) and confirms / cancels tours; strangers can't", async () => {
    const l = await tempListing();
    const lead = await prisma.lead.create({ data: { listingId: l.id, name: "Visitante", email: `${stamp}-visit@example.com`, message: "Quiero verla" } });
    current = owner;
    const start = new Date(Date.now() + 3 * 864e5);
    start.setUTCMinutes(0, 0, 0);
    const proposed = await leadTourRoute.POST(req("POST", { start: start.toISOString() }), ctx(lead.id));
    expect(proposed.status).toBe(200);
    const tour = await prisma.tour.findFirstOrThrow({ where: { leadId: lead.id } });
    expect([tour.agentId, tour.status]).toEqual([owner.id, "CONFIRMED"]);

    // A tour requested on the listing (e.g. by a visitor) is confirmed by the owner.
    const requested = await prisma.tour.create({ data: { listingId: l.id, agentId: owner.id, seekerName: "Ana", start: new Date(start.getTime() + 864e5) } });
    current = stranger;
    expect((await tourRoute.PATCH(req("PATCH", { status: "CONFIRMED" }), ctx(requested.id))).status).toBe(403);
    current = owner;
    expect((await tourRoute.PATCH(req("PATCH", { status: "CONFIRMED" }), ctx(requested.id))).status).toBe(200);
    expect((await tourRoute.PATCH(req("PATCH", { status: "CANCELLED" }), ctx(tour.id))).status).toBe(200);
    expect((await prisma.tour.findUniqueOrThrow({ where: { id: tour.id } })).status).toBe("CANCELLED");
  });
});

describe("takedown appeal (POST /listings/:id/appeal)", () => {
  it("lands in the moderation queue once; only for taken-down listings of the owner", async () => {
    const live = await tempListing();
    const down = await tempListing({ status: "WITHDRAWN", takedownReason: "Precio engañoso", statusBeforeTakedown: "ACTIVE" });
    current = owner;
    expect((await appealRoute.POST(req("POST", { message: "El precio es el real, puedo mostrarlo." }), ctx(live.id))).status).toBe(422);
    expect((await appealRoute.POST(req("POST", { message: "corto" }), ctx(down.id))).status).toBe(422);
    current = stranger;
    expect((await appealRoute.POST(req("POST", { message: "El precio es el real, puedo mostrarlo." }), ctx(down.id))).status).toBe(403);
    current = owner;
    expect((await appealRoute.POST(req("POST", { message: "El precio es el real, puedo mostrarlo." }), ctx(down.id))).status).toBe(201);
    const rep = await prisma.moderationReport.findFirstOrThrow({ where: { listingId: down.id } });
    expect(rep.resolved).toBe(false);
    expect(rep.reasonEs).toContain("Precio engañoso");
    expect((await appealRoute.POST(req("POST", { message: "Otra vez, por favor revisadlo." }), ctx(down.id))).status).toBe(409);
  });
});
