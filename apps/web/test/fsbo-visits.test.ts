import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@newplace/db";
import type { SessionUser } from "@/server/api";
import { isVisitSlot, parseVisitHours, slotMinutesOn, summarizeVisitHours, upcomingVisitDays, visitHoursIssues, visitHoursSchema, type VisitHours } from "@/lib/visit-hours";

// FSBO visit booking: the owner's weekly visit hours (validation, slot generation in Caracas time), owner-only edit,
// public slots and bookings on POST /leads (double-booking → 409), "request a visit" without a calendar, and the
// owner's confirm email. DB-backed parts use temp rows removed in afterAll.

const H = (ranges: VisitHours["ranges"], slotMin: VisitHours["slotMin"] = 60): VisitHours => ({ slotMin, ranges });

describe("visit hours validation", () => {
  it("accepts quarter-hour ranges between 07:00 and 21:00", () => {
    expect(visitHoursSchema.safeParse(H([{ day: 0, from: "09:00", to: "12:00" }, { day: 0, from: "16:15", to: "19:45" }, { day: 6, from: "07:00", to: "21:00" }], 45)).success).toBe(true);
  });
  it("rejects bad times, bounds, reversed, too short, overlapping and too many ranges", () => {
    const issue = (v: unknown) => visitHoursIssues(v as VisitHours).ranges[0] ?? visitHoursIssues(v as VisitHours).ranges[1] ?? visitHoursIssues(v as VisitHours).ranges[3] ?? visitHoursIssues(v as VisitHours).form;
    expect(issue(H([{ day: 0, from: "09:10", to: "12:00" }]))).toBe("grid");
    expect(issue(H([{ day: 0, from: "06:00", to: "09:00" }]))).toBe("bounds");
    expect(issue(H([{ day: 0, from: "20:00", to: "22:00" }]))).toBe("bounds");
    expect(issue(H([{ day: 0, from: "12:00", to: "10:00" }]))).toBe("order");
    expect(issue(H([{ day: 0, from: "10:00", to: "10:30" }], 45))).toBe("short");
    expect(issue(H([{ day: 1, from: "09:00", to: "12:00" }, { day: 1, from: "11:00", to: "13:00" }]))).toBe("overlap");
    expect(issue(H([0, 1, 2, 3].map((k) => ({ day: 2, from: `${String(8 + 3 * k).padStart(2, "0")}:00`, to: `${String(9 + 3 * k).padStart(2, "0")}:00` }))))).toBe("too_many");
    expect(visitHoursSchema.safeParse(H([{ day: 7, from: "09:00", to: "12:00" }])).success).toBe(false);
    expect(visitHoursSchema.safeParse({ slotMin: 20, ranges: [{ day: 0, from: "09:00", to: "12:00" }] }).success).toBe(false);
    expect(visitHoursSchema.safeParse({ slotMin: 60, ranges: [] }).success).toBe(false);
    expect(visitHoursSchema.safeParse({ slotMin: 60, ranges: [{ day: 0, from: "9:00", to: "12:00" }] }).success).toBe(false);
    // Unknown keys are refused (nothing else rides along in the stored JSON).
    expect(visitHoursSchema.safeParse({ ...H([{ day: 0, from: "09:00", to: "12:00" }]), phone: "+58 414" }).success).toBe(false);
  });
  it("an invalid stored value never yields a calendar", () => {
    expect(parseVisitHours(null)).toBeNull();
    expect(parseVisitHours({ slotMin: 60, ranges: [{ day: 0, from: "12:00", to: "09:00" }] })).toBeNull();
    expect(parseVisitHours("junk")).toBeNull();
  });
});

describe("slot generation (America/Caracas, UTC−4)", () => {
  const hours = H([{ day: 0, from: "09:00", to: "11:15" }, { day: 0, from: "17:00", to: "18:00" }, { day: 5, from: "10:00", to: "12:00" }], 45);
  // Monday 2026-10-05 08:00 Caracas = 12:00 UTC.
  const now = Date.UTC(2026, 9, 5, 12, 0);

  it("splits each range into whole visits", () => {
    expect(slotMinutesOn(hours, 0)).toEqual([9 * 60, 9 * 60 + 45, 10 * 60 + 30, 17 * 60]);
    expect(slotMinutesOn(hours, 5)).toEqual([10 * 60, 10 * 60 + 45]);
    expect(slotMinutesOn(hours, 2)).toEqual([]);
  });
  it("lists upcoming days with local labels and UTC instants; 2 h notice and booked visits make slots unavailable", () => {
    const busy = [new Date(Date.UTC(2026, 9, 5, 21, 20))]; // 17:20 Caracas clashes with the 17:00 slot (|Δ| < 45 min)
    const days = upcomingVisitDays(hours, now, busy);
    expect(days.map((d) => d.date.slice(0, 10))).toEqual(["2026-10-05", "2026-10-10", "2026-10-12"]);
    const mon = days[0].hours;
    expect(mon.map((h) => h.label)).toEqual(["09:00", "09:45", "10:30", "17:00"]);
    expect(mon[0].iso).toBe("2026-10-05T13:00:00.000Z");
    // 09:00 is only 1 h away → not bookable; 10:30 is; 17:00 is taken.
    expect(mon.map((h) => h.available)).toEqual([false, false, true, false]);
    expect(days[1].hours.every((h) => h.available)).toBe(true);
    expect(days[2].hours.length).toBe(4);
  });
  it("recognises only exact slot starts", () => {
    expect(isVisitSlot(hours, new Date("2026-10-05T14:30:00.000Z"))).toBe(true); // Mon 10:30 Caracas
    expect(isVisitSlot(hours, new Date("2026-10-05T14:00:00.000Z"))).toBe(false); // 10:00: not on the 45-min grid
    expect(isVisitSlot(hours, new Date("2026-10-05T15:15:00.000Z"))).toBe(false); // 11:15: the range ends there
    expect(isVisitSlot(hours, new Date("2026-10-07T14:30:00.000Z"))).toBe(false); // Wednesday: no hours
    expect(isVisitSlot(hours, new Date("2026-10-05T14:30:01.000Z"))).toBe(false);
  });
  it("summarises for the owner, merging days with the same hours", () => {
    const week = H([0, 1, 2, 3, 4].map((day) => ({ day, from: "17:00", to: "19:00" })).concat([{ day: 5, from: "09:00", to: "12:00" }]));
    expect(summarizeVisitHours(week, "es")).toBe("lun–vie 17:00–19:00 · sáb 09:00–12:00");
    expect(summarizeVisitHours(H([{ day: 0, from: "09:00", to: "10:00" }, { day: 2, from: "09:00", to: "10:00" }]), "en")).toBe("Mon 09:00–10:00 · Wed 09:00–10:00");
  });
});

// ---------------------------------------------------------------------------------------------------------------
let current: SessionUser | null = null;
vi.mock("@/server/api", async (orig) => ({ ...(await orig<typeof import("@/server/api")>()), currentUser: async () => current }));

const stamp = `vh${Date.now().toString(36)}`;
const listingIds: string[] = [];
const userIds: string[] = [];
let owner: SessionUser;
let stranger: SessionUser;
const everyDay = H([0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, from: "07:00", to: "21:00" })), 60);

async function tempListing(extra: Record<string, unknown> = {}) {
  const id = `${stamp}-${listingIds.length}`;
  listingIds.push(id);
  return prisma.listing.create({
    data: {
      id, slug: id, titleEs: "Casa de prueba", titleEn: "Test home", bodyEs: "", bodyEn: "", address: `Calle ${id}`, zone: "Altamira", city: "Caracas", state: "",
      lat: 10.5, lng: -66.85, kind: "apartment", listingType: "SALE", category: "RESIDENTIAL", priceAmount: 100000, areaM2: 80, yearBuilt: 2000,
      amenities: [], scenes: [], fingerprint: id, status: "ACTIVE", review: "APPROVED", privateListing: false, ownerUserId: owner.id, publishedAt: new Date(),
      ...extra,
    },
  });
}

const { NextRequest } = await import("next/server");
const req = (method: string, json?: unknown) => new NextRequest("http://localhost/api/v1/x", { method, ...(json !== undefined ? { body: JSON.stringify(json), headers: { "content-type": "application/json" } } : {}) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const noCtx = undefined as never;
const hoursRoute = await import("@/app/api/v1/listings/[id]/visit-hours/route");
const slotsRoute = await import("@/app/api/v1/listings/[id]/slots/route");
const leadsRoute = await import("@/app/api/v1/leads/route");
const tourRoute = await import("@/app/api/v1/tours/[id]/route");
type SlotsBody = { data?: { owner?: boolean; hasCalendar?: boolean; agentId: string | null; days: { hours: { iso: string; label: string; available: boolean }[] }[] } } & Record<string, unknown>;
const slotsOf = async (id: string) => {
  const r = await slotsRoute.GET(req("GET") as never, ctx(id));
  const j = (await r.json()) as SlotsBody;
  return (j.data ?? j) as NonNullable<SlotsBody["data"]>;
};

beforeAll(async () => {
  const a = await prisma.user.create({ data: { email: `${stamp}-owner@owner.test`, name: "Dueña Test", role: "OWNER_PRIVATE", phone: "+58 414 000 9999" } });
  const b = await prisma.user.create({ data: { email: `${stamp}-other@owner.test`, name: "Otro", role: "OWNER_PRIVATE" } });
  userIds.push(a.id, b.id);
  owner = { id: a.id, role: "OWNER_PRIVATE", agencyId: null, name: a.name, email: a.email };
  stranger = { id: b.id, role: "OWNER_PRIVATE", agencyId: null, name: b.name, email: b.email };
});

afterAll(async () => {
  await prisma.messageThread.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.emailOutbox.deleteMany({ where: { to: { contains: stamp } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("owner sets visit hours (PUT /listings/:id/visit-hours)", () => {
  it("only the FSBO listing's owner can read or edit them; ranges are validated", async () => {
    const l = await tempListing();
    const before = (await prisma.listing.findUniqueOrThrow({ where: { id: l.id } })).updatedAt;
    current = owner;
    expect((await hoursRoute.PUT(req("PUT", { visitHours: everyDay }), ctx(l.id))).status).toBe(200);
    const row = await prisma.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect(parseVisitHours(row.visitHours)?.ranges.length).toBe(7);
    expect(row.updatedAt.getTime()).toBe(before.getTime()); // the freshness badge doesn't move
    expect((await hoursRoute.GET(req("GET"), ctx(l.id))).status).toBe(200);
    // Invalid ranges → 422, nothing stored.
    expect((await hoursRoute.PUT(req("PUT", { visitHours: H([{ day: 0, from: "12:00", to: "09:00" }]) }), ctx(l.id))).status).toBe(422);
    expect(parseVisitHours((await prisma.listing.findUniqueOrThrow({ where: { id: l.id } })).visitHours)?.ranges.length).toBe(7);
    // Someone else (another owner, an agent, anonymous) can't.
    current = stranger;
    expect((await hoursRoute.PUT(req("PUT", { visitHours: null }), ctx(l.id))).status).toBe(403);
    expect((await hoursRoute.GET(req("GET"), ctx(l.id))).status).toBe(403);
    current = { id: "u-agent", role: "AGENT", agencyId: "ag-andes", name: "Agent", email: "agent@test" };
    expect((await hoursRoute.PUT(req("PUT", { visitHours: null }), ctx(l.id))).status).toBe(403);
    current = null;
    expect((await hoursRoute.PUT(req("PUT", { visitHours: null }), ctx(l.id))).status).toBe(401);
    // Clearing works for the owner.
    current = owner;
    expect((await hoursRoute.PUT(req("PUT", { visitHours: null }), ctx(l.id))).status).toBe(200);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: l.id } })).visitHours).toBeNull();
  });

  it("a listing an agency took over (mandate) is not the owner's to schedule", async () => {
    const l = await tempListing({ agencyId: "ag-andes", agentId: "u-agent" });
    current = owner;
    expect((await hoursRoute.PUT(req("PUT", { visitHours: everyDay }), ctx(l.id))).status).toBe(403);
  });
});

describe("public FSBO booking", () => {
  it("offers the owner's free slots without exposing the owner, books one, and refuses a double booking", async () => {
    const l = await tempListing({ visitHours: everyDay });
    current = null;
    const s = await slotsOf(l.id);
    expect([s.owner, s.hasCalendar, s.agentId]).toEqual([true, true, null]);
    expect(JSON.stringify(s)).not.toContain(owner.id);
    expect(JSON.stringify(s)).not.toContain("+58 414 000 9999");
    const free = s.days.flatMap((d) => d.hours).find((h) => h.available)!;
    expect(free).toBeTruthy();

    const lead = { listingId: l.id, name: "Ana Visita", email: `${stamp}-ana@seeker.test`, message: "Hola, quiero verla", tourStart: free.iso };
    const r = await leadsRoute.POST(req("POST", lead), noCtx);
    expect(r.status).toBe(201);
    const tour = await prisma.tour.findFirstOrThrow({ where: { listingId: l.id } });
    expect([tour.agentId, tour.status, tour.start.toISOString()]).toEqual([owner.id, "REQUESTED", free.iso]);
    const created = await prisma.lead.findFirstOrThrow({ where: { listingId: l.id } });
    expect([created.agentId, created.agencyId, created.source]).toEqual([null, null, "TOUR_REQUEST"]);
    // The owner hears about it (email), and the slot is now taken.
    expect(await prisma.emailOutbox.count({ where: { to: owner.email!, subject: { contains: "Visita por confirmar" } } })).toBe(1);
    expect((await slotsOf(l.id)).days.flatMap((d) => d.hours).find((h) => h.iso === free.iso)?.available).toBe(false);
    // Same slot again → 409; a time that isn't a slot → 422.
    expect((await leadsRoute.POST(req("POST", { ...lead, email: `${stamp}-ben@seeker.test`, name: "Ben" }), noCtx)).status).toBe(409);
    expect((await leadsRoute.POST(req("POST", { ...lead, tourStart: new Date(new Date(free.iso).getTime() + 30 * 60e3).toISOString() }), noCtx)).status).toBe(422);
    expect((await leadsRoute.POST(req("POST", { ...lead, tourStart: new Date(Date.now() + 30 * 864e5).toISOString() }), noCtx)).status).toBe(422);

    // The owner confirms from their inbox → the visitor gets an email.
    current = owner;
    expect((await tourRoute.PATCH(req("PATCH", { status: "CONFIRMED" }), ctx(tour.id))).status).toBe(200);
    expect(await prisma.emailOutbox.count({ where: { to: lead.email, subject: { contains: "confirmada" } } })).toBe(1);
  });

  it("the owner's visits across listings block each other (they can't be in two places)", async () => {
    const a = await tempListing({ visitHours: everyDay });
    const b = await tempListing({ visitHours: everyDay });
    current = null;
    const free = (await slotsOf(a.id)).days.flatMap((d) => d.hours).find((h) => h.available)!;
    expect((await leadsRoute.POST(req("POST", { listingId: a.id, name: "Ana", email: `${stamp}-a2@seeker.test`, message: "Hola", tourStart: free.iso }), noCtx)).status).toBe(201);
    expect((await leadsRoute.POST(req("POST", { listingId: b.id, name: "Ben", email: `${stamp}-b2@seeker.test`, message: "Hola", tourStart: free.iso }), noCtx)).status).toBe(409);
  });

  it("without hours: no calendar, no bookings — a visit request with preferred times reaches the owner instead", async () => {
    const l = await tempListing();
    current = null;
    const s = await slotsOf(l.id);
    expect([s.owner, s.hasCalendar, s.days.length]).toEqual([true, false, 0]);
    const soon = new Date(Date.now() + 3 * 864e5);
    soon.setUTCMinutes(0, 0, 0);
    expect((await leadsRoute.POST(req("POST", { listingId: l.id, name: "Ana", email: `${stamp}-c@seeker.test`, message: "Hola", tourStart: soon.toISOString() }), noCtx)).status).toBe(422);
    const r = await leadsRoute.POST(req("POST", { listingId: l.id, name: "Carla", email: `${stamp}-c@seeker.test`, message: "Me encanta", visitPrefs: ["WEEKEND", "WEEKDAY_PM"], visitNote: "mejor el sábado" }), noCtx);
    expect(r.status).toBe(201);
    const lead = await prisma.lead.findFirstOrThrow({ where: { listingId: l.id } });
    expect(lead.source).toBe("TOUR_REQUEST");
    expect(lead.message).toContain("El fin de semana");
    expect(lead.message).toContain("mejor el sábado");
    expect(lead.message).toContain("Me encanta");
    expect(await prisma.tour.count({ where: { listingId: l.id } })).toBe(0);
    expect(await prisma.emailOutbox.count({ where: { to: owner.email!, subject: { contains: "quiere visitar" } } })).toBe(1);
    // Bad preferences are refused.
    expect((await leadsRoute.POST(req("POST", { listingId: l.id, name: "Carla", email: `${stamp}-c@seeker.test`, message: "Hola", visitPrefs: ["MIDNIGHT"] }), noCtx)).status).toBe(422);
  });
});
