import { describe, expect, it } from "vitest";
import { PROPERTY_KINDS, listingQuality, propertyKindSchema } from "../src/listing";

describe("listingQuality", () => {
  it("counts only real photos (4 each, 35 from 8 on) plus copy, location and extras", () => {
    expect(listingQuality({ photos: 0, located: false })).toBe(0);
    expect(listingQuality({ photos: 3, located: true })).toBe(32);
    expect(listingQuality({ photos: 8, titleEn: "t", bodyEn: "b", located: true, hasFloorplan: true, hasVirtualTour: true })).toBe(100);
    expect(listingQuality({ photos: 20, titleEn: "t", bodyEn: "", located: true })).toBe(55);
  });
});

describe("property kinds", () => {
  it("one enum for every API", () => {
    expect(PROPERTY_KINDS).toContain("penthouse");
    expect(propertyKindSchema.safeParse("castle").success).toBe(false);
  });
});
