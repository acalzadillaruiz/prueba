import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { caracasWeekday } from "@/lib/caracas-time";
import { onCallSchema, onCallUserId, parseRotation } from "@/lib/on-call";
import type { SessionUser } from "@/server/api";

// Session for the route tests: whoever `as` points to (identity re-read is stubbed, the DB is the seeded one).
let as: SessionUser | null = null;
vi.mock("@/auth", () => ({ auth: async () => (as ? { user: { id: as.id, agencyId: as.agencyId } } : null) }));
vi.mock("@/server/identity", () => ({ liveIdentity: async () => as }));

const { assertOnCallMembers, onCallAdvisors } = await import("@/server/on-call");
const { PATCH } = await import("@/app/api/v1/agency/route");
const { GET } = await import("@/app/api/v1/on-call/route");

const ROTA = { "0": "u-sun", "1": "u-mon", "2": "u-tue", "3": "u-wed", "4": "u-thu", "5": "u-fri", "6": "u-sat" };
const full = (id: string | null) => Object.fromEntries(["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, id])) as Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", string | null>;
const code = (p: Promise<unknown>) => p.then(() => "OK").catch((e: { code?: string }) => e.code ?? "ERR");

describe("today's on-call in Caracas time (UTC−4)", () => {
  it("uses the Caracas weekday, not the UTC one, around midnight UTC", () => {
    // Thu 2026-10-08 02:00 UTC = Wed 22:00 in Caracas.
    expect(caracasWeekday(Date.parse("2026-10-08T02:00:00Z"))).toBe(3);
    expect(onCallUserId(ROTA, Date.parse("2026-10-08T02:00:00Z"))).toBe("u-wed");
    // 03:59:59 UTC is still Wednesday in Caracas; 04:00 UTC is Thursday 00:00.
    expect(onCallUserId(ROTA, Date.parse("2026-10-08T03:59:59Z"))).toBe("u-wed");
    expect(onCallUserId(ROTA, Date.parse("2026-10-08T04:00:00Z"))).toBe("u-thu");
    // Sat 23:30 Caracas = Sun 03:30 UTC → Saturday's advisor; Sunday wraps to "0".
    expect(onCallUserId(ROTA, Date.parse("2026-10-11T03:30:00Z"))).toBe("u-sat");
    expect(onCallUserId(ROTA, Date.parse("2026-10-11T12:00:00Z"))).toBe("u-sun");
  });
  it("tolerates partial or junk stored JSON", () => {
    expect(onCallUserId(null)).toBeNull();
    expect(onCallUserId({ "3": "u-wed" }, Date.parse("2026-10-07T15:00:00Z"))).toBe("u-wed");
    expect(parseRotation({ "1": 42, "2": "", x: "u" })).toEqual(full(null));
  });
  it("the schema needs all seven days and no extra keys", () => {
    expect(onCallSchema.safeParse(ROTA).success).toBe(true);
    expect(onCallSchema.safeParse({ ...ROTA, "7": "u" }).success).toBe(false);
    const { "0": _sun, ...six } = ROTA;
    expect(onCallSchema.safeParse(six).success).toBe(false);
    expect(onCallSchema.safeParse({ ...ROTA, "1": "<script>" }).success).toBe(false);
  });
});

describe("Guardia settings validation (seeded agencies)", () => {
  it("rejects a user who is not an advisor of the agency", async () => {
    expect(await code(assertOnCallMembers("ag-andes", { ...full("u-agent"), "2": "u-agent3" }))).toBe("VALIDATION"); // other agency
    expect(await code(assertOnCallMembers("ag-andes", { ...full("u-agent"), "4": "u-captor" }))).toBe("VALIDATION"); // member, not an advisor
    expect(await code(assertOnCallMembers("ag-andes", { ...full("u-agent"), "6": "u-nope" }))).toBe("VALIDATION");
  });
  it("accepts advisors, the owner and empty days", async () => {
    expect(await code(assertOnCallMembers("ag-andes", { ...full("u-agent"), "1": "u-owner", "3": null }))).toBe("OK");
  });
  it("PATCH /agency: non-member → 422 and nothing stored; back office cannot edit (403)", async () => {
    const before = await prisma.agency.findUnique({ where: { id: "ag-andes" }, select: { onCall: true } });
    const patch = (json: unknown) => PATCH(new NextRequest("http://localhost/api/v1/agency", { method: "PATCH", body: JSON.stringify(json), headers: { "content-type": "application/json" } }), undefined as never);
    as = { id: "u-owner", role: "AGENCY_OWNER", agencyId: "ag-andes" };
    const r = await patch({ onCall: { ...full("u-agent"), "5": "u-agent4" } });
    expect(r.status).toBe(422);
    expect((await r.json()).error.details.onCall).toHaveProperty("5");
    expect((await prisma.agency.findUnique({ where: { id: "ag-andes" }, select: { onCall: true } }))?.onCall).toEqual(before?.onCall);
    as = { id: "u-back", role: "BACKOFFICE", agencyId: "ag-andes" };
    expect((await patch({ onCall: full("u-agent") })).status).toBe(403);
    as = null;
  });
});

describe("public on-call read", () => {
  it("lists verified, active agencies only, only the listing's agency on a listing, without private fields", async () => {
    const all = await onCallAdvisors();
    expect(all.map((a) => a.agency.id).sort()).toEqual(["ag-andes", "ag-night"]); // Orinoco is unverified (TRIAL)
    const json = JSON.stringify(all);
    expect(json).not.toMatch(/@/); // never an email
    expect(json).not.toMatch(/u-agent|u-owner/); // nor internal user ids
    for (const a of all) expect(a.advisor.tel).toMatch(/^tel:\+?\d+$/);
    const night = await prisma.listing.findFirstOrThrow({ where: { agencyId: "ag-night", status: "ACTIVE", review: "APPROVED", privateListing: false }, select: { slug: true } });
    // On a listing only that listing's agency is shown (never advisors of other agencies).
    expect((await onCallAdvisors({ listingSlug: night.slug })).map((a) => a.agency.id)).toEqual(["ag-night"]);
    expect(await onCallAdvisors({ listingSlug: "no-such-listing" })).toEqual([]);
    const r = await GET(new NextRequest(`http://localhost/api/v1/on-call?listing=${night.slug}`), undefined as never);
    expect((await r.json()).advisors.map((a: { agency: { id: string } }) => a.agency.id)).toEqual(["ag-night"]);
  });
  it("follows the Caracas day of the seeded rotation", async () => {
    // Wed 2026-10-07 23:30 Caracas (Thu 03:30 UTC): Andes Prime's Wednesday advisor is Patricia Salas.
    const wed = await onCallAdvisors({ agencyId: "ag-andes", now: Date.parse("2026-10-08T03:30:00Z") });
    expect(wed[0].advisor.name).toBe("Patricia Salas");
    const thu = await onCallAdvisors({ agencyId: "ag-andes", now: Date.parse("2026-10-08T04:30:00Z") });
    expect(thu[0].advisor.name).toBe("Valentina Rojas");
  });
  it("GET /on-call is cacheable and ignores malformed ids", async () => {
    const r = await GET(new NextRequest("http://localhost/api/v1/on-call?agencyId=ag-andes"), undefined as never);
    expect(r.headers.get("cache-control")).toContain("s-maxage");
    expect((await r.json()).advisors).toHaveLength(1);
    const bad = await GET(new NextRequest("http://localhost/api/v1/on-call?agencyId=%27%20OR%201%3D1"), undefined as never);
    expect((await bad.json()).advisors).toEqual([]);
  });
});
