import { describe, expect, it } from "vitest";
import { autoMapRegion, onRegionMap } from "@/components/search/mapRegion";

const homes = (caracas: number, other: number) => [...Array.from({ length: caracas }, () => ({ city: "Caracas" })), ...Array.from({ length: other }, () => ({ city: "Lechería" }))];

describe("search map region: follows where most results are", () => {
  it("one Caracas home among eight doesn't pull the map to Caracas", () => {
    expect(autoMapRegion(homes(1, 7))).toBe("venezuela");
    expect(autoMapRegion(homes(5, 5))).toBe("venezuela");
  });
  it("Caracas when it holds at least 60 % of the results", () => {
    expect(autoMapRegion(homes(6, 4))).toBe("caracas");
    expect(autoMapRegion(homes(3, 0))).toBe("caracas");
    expect(autoMapRegion([])).toBe("caracas");
  });
  it("the Caracas map only draws Caracas homes; Venezuela draws them all", () => {
    expect(onRegionMap(homes(1, 7), "caracas")).toHaveLength(1);
    expect(onRegionMap(homes(1, 7), "venezuela")).toHaveLength(8);
  });
});
