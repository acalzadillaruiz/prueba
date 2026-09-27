import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@newplace/db";
import { listingsByIds, searchListings } from "@/server/listings";
import { recordDwell, unbump } from "@/server/counters";
import { acceptOffer } from "@/server/offers";
import { loginAttempt } from "@/server/rate-limit";
import { readVerifyToken, signVerifyToken, VERIFY_TTL_MS } from "@/server/email-verify";
import { inShape } from "@/lib/geo";
import { needsModeration } from "@/server/listing-service";

// DB-backed (seeded database, like access.test.ts). Every row created here is removed in afterAll.
const stamp = `t${Date.now().toString(36)}`;
const listingIds: string[] = [];
const userIds: string[] = [];
const rlPrefix = `login-fail:${stamp}`;

async function tempListing(extra: Record<string, unknown> = {}) {
  const id = `${stamp}-${listingIds.length}`;
  listingIds.push(id);
  return prisma.listing.create({
    data: {
      id,
      slug: id,
      titleEs: "Test",
      titleEn: "Test",
      bodyEs: "",
      bodyEn: "",
      address: `Calle Test ${id}`,
      zone: "Test",
      city: "Test",
      state: "",
      lat: 1,
      lng: 1,
      kind: "apartment",
      listingType: "SALE",
      category: "RESIDENTIAL",
      priceAmount: 100000,
      areaM2: 80,
      yearBuilt: 2000,
      amenities: [],
      scenes: [],
      fingerprint: id,
      status: "ACTIVE",
      review: "APPROVED",
      privateListing: true, // never shows up in public search while the test runs
      ...extra,
    },
  });
}

afterAll(async () => {
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: rlPrefix } } });
});

describe("1 · saved listings only render what the public can see", () => {
  it("listingsByIds drops pending listings unless a staff caller opts out", async () => {
    const pub = await tempListing();
    const pending = await tempListing({ review: "PENDING" });
    const draft = await tempListing({ status: "DRAFT" });
    expect((await listingsByIds([pub.id, pending.id, draft.id])).map((l) => l.id)).toEqual([pub.id]);
    expect((await listingsByIds([pub.id, pending.id, draft.id], { publicOnly: false })).map((l) => l.id)).toEqual([pub.id, pending.id, draft.id]);
  });
});

describe("2 · unbump", () => {
  it("decrements without touching updatedAt and never below 0", async () => {
    const l = await tempListing({ saves: 1 });
    await unbump([l.id], ["saves"]);
    await unbump([l.id], ["saves"]);
    const after = await prisma.listing.findUniqueOrThrow({ where: { id: l.id }, select: { saves: true, updatedAt: true } });
    expect(after.saves).toBe(0);
    expect(after.updatedAt.getTime()).toBe(l.updatedAt.getTime());
  });
});

describe("4 · offer acceptance is atomic", () => {
  it("two concurrent accepts on one listing: exactly one wins, the other is a CONFLICT", async () => {
    const l = await tempListing();
    const [a, b] = await Promise.all([1, 2].map((n) => prisma.offer.create({ data: { listingId: l.id, bidderName: `B${n}`, amount: 90000 + n } })));
    const res = await Promise.allSettled([acceptOffer(a.id, l.id), acceptOffer(b.id, l.id)]);
    expect(res.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((res.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.code).toBe("CONFLICT");
    expect(await prisma.offer.count({ where: { listingId: l.id, status: "ACCEPTED" } })).toBe(1);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("UNDER_OFFER");
  });
});

describe("6 · dwell time", () => {
  it("keeps a bounded running average without touching updatedAt; hidden listings don't count", async () => {
    const l = await tempListing();
    expect(await recordDwell(l.id, 30)).toBe(true);
    expect(await recordDwell(l.id, 90)).toBe(true);
    expect(await recordDwell(l.id, 99999)).toBe(true); // clamped to 1800
    const r = await prisma.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect(r.dwellCount).toBe(3);
    expect(r.avgTimeSec).toBe(Math.round((30 + 90 + 1800) / 3));
    expect(r.updatedAt.getTime()).toBe(l.updatedAt.getTime());
    const hidden = await tempListing({ review: "PENDING" });
    expect(await recordDwell(hidden.id, 60)).toBe(false);
  });
});

describe("13 · who publishes immediately", () => {
  it("unverified agencies and brand-new unverified owners go to review; established ones don't", async () => {
    expect(await needsModeration("AGENCY", "u-agent6", "ag-orinoco")).toBe(true); // seed: verified=false
    expect(await needsModeration("AGENCY", "u-owner", "ag-andes")).toBe(false);
    expect(await needsModeration("FSBO", "u-priv", null)).toBe(false); // seeded owner: email verified
    const fresh = await prisma.user.create({ data: { email: `${stamp}-new@owner.test`, role: "OWNER_PRIVATE" } });
    const old = await prisma.user.create({ data: { email: `${stamp}-old@owner.test`, role: "OWNER_PRIVATE", createdAt: new Date(Date.now() - 8 * 864e5) } });
    userIds.push(fresh.id, old.id);
    expect(await needsModeration("FSBO", fresh.id, null)).toBe(true);
    expect(await needsModeration("FSBO", old.id, null)).toBe(false);
    await prisma.user.update({ where: { id: fresh.id }, data: { emailVerified: new Date() } });
    expect(await needsModeration("FSBO", fresh.id, null)).toBe(false);
  });
});

describe("15 · login lockout is per account + IP", () => {
  const req = (ip: string) => new Request("http://localhost/api/auth/callback/credentials", { headers: { "x-real-ip": ip } });
  it("10 failures from one IP don't lock the account for another IP; a global ceiling still applies", async () => {
    vi.stubEnv("TRUSTED_IP_HEADER", "x-real-ip");
    try {
      const email = `${stamp}@example.com`;
      for (let i = 0; i < 10; i++) expect((await loginAttempt(req("198.51.100.1"), email)).ok).toBe(true);
      expect((await loginAttempt(req("198.51.100.1"), email)).ok).toBe(false);
      expect((await loginAttempt(req("198.51.100.2"), email)).ok).toBe(true);
      // Spread over more IPs the per-account ceiling (50) stops distributed guessing.
      for (let ip = 3; ip <= 6; ip++) for (let i = 0; i < 10; i++) await loginAttempt(req(`198.51.100.${ip}`), email);
      expect((await loginAttempt(req("198.51.100.99"), email)).ok).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("17 · polygon / radius search", () => {
  it("filters in the database by bounding box, paginates the exact set and reports a consistent total", async () => {
    const seed = await prisma.listing.findUniqueOrThrow({ where: { id: "19if9a" }, select: { lat: true, lng: true } });
    const shape = { type: "radius" as const, center: { lat: seed.lat, lng: seed.lng }, km: 3 };
    const all = await searchListings({ shape, sort: "new" });
    expect(all.total).toBe(all.items.length);
    expect(all.items.length).toBeGreaterThan(1);
    expect(all.items.every((l) => inShape(l, shape))).toBe(true);
    // Walking pages of 1 visits exactly the same listings, and every page reports the same total.
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 100; i++) {
      const page = await searchListings({ shape, sort: "new", take: 1, cursor });
      expect(page.total).toBe(all.total);
      seen.push(...page.items.map((l) => l.id));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(seen).toEqual(all.items.map((l) => l.id));
  });
});

describe("19 · email verification tokens", () => {
  it("round-trips, rejects tampering and expiry", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-for-verify");
    try {
      const t = signVerifyToken("u-1", "A@Example.com", 1_000);
      expect(readVerifyToken(t, 2_000)).toEqual({ userId: "u-1", email: "a@example.com" });
      expect(readVerifyToken(t, 1_000 + VERIFY_TTL_MS + 1)).toBeNull();
      const [p, s] = t.split(".");
      const forged = Buffer.from(JSON.stringify({ u: "u-admin", e: "a@example.com", x: 9e15 })).toString("base64url");
      expect(readVerifyToken(`${forged}.${s}`, 2_000)).toBeNull();
      expect(readVerifyToken(`${p}.${s}x`, 2_000)).toBeNull();
      expect(readVerifyToken("garbage", 2_000)).toBeNull();
      vi.stubEnv("AUTH_SECRET", "another-secret");
      expect(readVerifyToken(t, 2_000)).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("GET /api/v1/auth/verify sets emailVerified and redirects to the account page", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-for-verify");
    try {
      const u = await prisma.user.create({ data: { email: `${stamp}@verify.test`, locale: "en" } });
      userIds.push(u.id);
      const { GET } = await import("@/app/api/v1/auth/verify/route");
      const { NextRequest } = await import("next/server");
      const call = (token: string) => GET(new NextRequest(`http://localhost/api/v1/auth/verify?token=${token}`), { params: Promise.resolve({}) } as never);
      const bad = await call("nope.nope");
      expect(bad.headers.get("location")).toMatch(/\/es\/account\?verified=0$|\/en\/account\?verified=0$/);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerified).toBeNull();
      const res = await call(signVerifyToken(u.id, u.email));
      expect(res.status).toBeGreaterThanOrEqual(300);
      expect(res.headers.get("location")).toBe("http://localhost/en/account?verified=1");
      expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerified).not.toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
