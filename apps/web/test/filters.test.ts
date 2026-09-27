import { describe, expect, it } from "vitest";
import { filtersFromParams } from "@/server/listings";

describe("filtersFromParams", () => {
  it("parses numeric and boolean filters", () => {
    const f = filtersFromParams(new URLSearchParams("type=SALE&beds=2&max=250000&zone=Chacao&lux=1&am=pool,gym"));
    expect(f).toMatchObject({ type: "SALE", beds: 2, max: 250000, zone: "Chacao", lux: true, amenities: ["pool", "gym"], sort: "new" });
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
    expect(filtersFromParams(new URLSearchParams("sort=DROP TABLE")).sort).toBe("new");
  });
  it("rejects negative or non-numeric numbers", () => {
    const f = filtersFromParams(new URLSearchParams("take=-1&max=abc&beds=2"));
    expect(f.take).toBeUndefined();
    expect(f.max).toBeUndefined();
    expect(f.beds).toBe(2);
  });
});
