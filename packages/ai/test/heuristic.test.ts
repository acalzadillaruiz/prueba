import { describe, expect, it } from "vitest";
import { heuristicLeadScore, heuristicSearchParse } from "../src/heuristic";

describe("heuristicSearchParse", () => {
  it("parses the reference query", () => {
    const q = heuristicSearchParse("ático con luz en Los Palos Grandes por menos de 180 mil");
    expect(q.zone).toBe("Los Palos Grandes");
    expect(q.maxPrice).toBe(180000);
    expect(q.propertyKind).toBe("penthouse");
    expect(q.keywords).toContain("light");
  });
  it("parses beds and rent", () => {
    const q = heuristicSearchParse("alquiler 2 habitaciones en Chacao hasta 900");
    expect(q.listingType).toBe("LONG_RENT");
    expect(q.minBeds).toBe(2);
    expect(q.maxPrice).toBe(900);
  });
});

describe("heuristicLeadScore", () => {
  it("tour request -> PROPOSE_TOUR", () => {
    const r = heuristicLeadScore({ createdMinutesAgo: 3, listingPrice: 200000, budget: 210000, source: "TOUR_REQUEST", messages: 1, hasPhone: true, toursRequested: 1 });
    expect(r.nextAction).toBe("PROPOSE_TOUR");
    expect(r.score).toBeGreaterThan(80);
  });
});
