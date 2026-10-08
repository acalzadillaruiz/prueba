import { describe, expect, it } from "vitest";
import { completeness, filtersFromParams, listingRank, recommendedOrder, searchListings, type RankFacts } from "@/server/listings";

describe("filtersFromParams", () => {
  it("parses numeric and boolean filters", () => {
    const f = filtersFromParams(new URLSearchParams("type=SALE&beds=2&max=250000&zone=Chacao&lux=1&am=pool,gym"));
    expect(f).toMatchObject({ type: "SALE", beds: 2, max: 250000, zone: "Chacao", lux: true, amenities: ["pool", "gym"], sort: "rec" });
  });
  it("parses a polygon and ignores malformed points", () => {
    const f = filtersFromParams(new URLSearchParams("poly=10.49,-66.86;10.49,-66.84;x,y;10.5,-66.84"));
    expect(f.shape).toEqual({ type: "poly", pts: [{ lat: 10.49, lng: -66.86 }, { lat: 10.49, lng: -66.84 }, { lat: 10.5, lng: -66.84 }] });
  });
  it("parses a radius and rejects an invalid bbox", () => {
    const f = filtersFromParams(new URLSearchParams("radius=10.5,-66.85,2&bbox=1,2,3"));
    expect(f.shape).toEqual({ type: "radius", center: { lat: 10.5, lng: -66.85 }, km: 2 });
    expect(f.bbox).toBeUndefined();
  });
});

describe("filtersFromParams hardening", () => {
  it("drops unknown enums and maps friendly aliases", () => {
    expect(filtersFromParams(new URLSearchParams("type=nonsense")).type).toBeUndefined();
    expect(filtersFromParams(new URLSearchParams("type=rent")).type).toBe("LONG_RENT");
    expect(filtersFromParams(new URLSearchParams("sort=DROP TABLE")).sort).toBe("rec");
    expect(filtersFromParams(new URLSearchParams("sort=new")).sort).toBe("new");
  });
  it("rejects negative or non-numeric numbers", () => {
    const f = filtersFromParams(new URLSearchParams("take=-1&max=abc&beds=2"));
    expect(f.take).toBeUndefined();
    expect(f.max).toBeUndefined();
    expect(f.beds).toBe(2);
  });
});

const facts = (o: Partial<RankFacts> & { id: string }): RankFacts & { id: string } => ({ status: "ACTIVE", photoCount: 3, bodyLength: 400, beds: 2, baths: 2, amenityCount: 4, media: false, essentials: true, ...o });

describe("default order «Recomendados»: photos, then completeness, then recency", () => {
  it("ranks complete homes, then coming soon, then homes without photos", () => {
    expect(listingRank({ status: "ACTIVE", photoCount: 3 })).toBe(0);
    expect(listingRank({ status: "UNDER_OFFER", photoCount: 1 })).toBe(0);
    expect(listingRank({ status: "COMING_SOON", photoCount: 3 })).toBe(1);
    expect(listingRank({ status: "ACTIVE", photoCount: 0 })).toBe(2);
  });
  it("orders by photo tier, photo count (capped), completeness and keeps recency for ties", () => {
    // Input newest first.
    const items = [
      facts({ id: "new-no-photo", photoCount: 0 }),
      facts({ id: "new-one-photo-bare", photoCount: 1, bodyLength: 0, beds: 0, baths: 0, amenityCount: 0, essentials: false }),
      facts({ id: "soon", status: "COMING_SOON" }),
      facts({ id: "three-a" }),
      facts({ id: "nine", photoCount: 9 }),
      facts({ id: "five", photoCount: 5 }),
      facts({ id: "three-bare", bodyLength: 10, amenityCount: 0 }),
      facts({ id: "three-b" }),
    ];
    expect(recommendedOrder(items).map((l) => l.id)).toEqual(["nine", "five", "three-a", "three-b", "three-bare", "new-one-photo-bare", "soon", "new-no-photo"]);
    expect(completeness(facts({ id: "x", media: true }))).toBe(6);
    expect(completeness(facts({ id: "x", bodyLength: 0, beds: 0, baths: 0, amenityCount: 0, essentials: false }))).toBe(0);
  });
  it("search lists photo-less homes last without hiding them, and the cursor walks the same order", async () => {
    const all = await searchListings({ sort: "rec" });
    const ranks = all.items.map((l) => listingRank({ status: l.status, photoCount: l.photos?.length ?? 0 }));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(all.total).toBe(all.items.length);
    const first = await searchListings({ sort: "rec", take: 5 });
    const next = await searchListings({ sort: "rec", take: 5, cursor: first.nextCursor! });
    expect([...first.items, ...next.items].map((l) => l.id)).toEqual(all.items.slice(0, 10).map((l) => l.id));
  });
  it("«Lo más reciente» is plain newest first", async () => {
    const all = await searchListings({ sort: "new" });
    const dates = all.items.map((l) => Date.parse(l.publishedAt));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });
});
