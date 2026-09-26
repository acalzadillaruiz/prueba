import { describe, expect, it } from "vitest";
import { inShape, pointInPolygon } from "@/lib/geo";

const chacao = [
  { lat: 10.49, lng: -66.86 },
  { lat: 10.49, lng: -66.84 },
  { lat: 10.5, lng: -66.84 },
  { lat: 10.5, lng: -66.86 },
];

describe("geo", () => {
  it("detects points inside and outside a polygon", () => {
    expect(pointInPolygon({ lat: 10.495, lng: -66.85 }, chacao)).toBe(true);
    expect(pointInPolygon({ lat: 10.48, lng: -66.85 }, chacao)).toBe(false);
  });
  it("treats an empty shape or a degenerate polygon as no filter", () => {
    expect(inShape({ lat: 0, lng: 0 }, null)).toBe(true);
    expect(inShape({ lat: 0, lng: 0 }, { type: "poly", pts: chacao.slice(0, 2) })).toBe(true);
  });
  it("filters by radius in km", () => {
    const center = { lat: 10.4961, lng: -66.8531 };
    expect(inShape({ lat: 10.5, lng: -66.85 }, { type: "radius", center, km: 1 })).toBe(true);
    expect(inShape({ lat: 10.06, lng: -69.32 }, { type: "radius", center, km: 50 })).toBe(false);
  });
});
