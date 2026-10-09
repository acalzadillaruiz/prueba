import { describe, expect, it } from "vitest";
import { toCard } from "@/server/listings";
import type { Listing } from "@/types/domain";

const base = {
  id: "x1",
  body_es: "Descripción larga ".repeat(50),
  body_en: "Long description ".repeat(50),
  priceHistory: [
    { date: "2026-01-01", amount: 200000, kind: "LISTED" },
    { date: "2026-02-01", amount: 190000, kind: "DROP" },
    { date: "2026-03-01", amount: 180000, kind: "DROP" },
  ],
  estimate: { mid: 185000, low: 170000, high: 200000, confidence: 0.8, comparables: [{ id: "c1" }, { id: "c2" }], method: "h" },
  photos: ["a", "b", "c", "d", "e", "f", "g"],
  agent: { id: "a", name: "Ana", hue: 1, verified: true, phone: "+58" },
  agency: { id: "g", name: "G", verified: true, color: "#000", initials: "G", phone: "1", whatsapp: "2" },
} as unknown as Listing;

describe("toCard", () => {
  it("drops heavy fields but keeps what cards render", () => {
    const c = toCard(base);
    expect(c.body_es).toBe("");
    // At most 3 comparables survive: enough for the "Precio verificado" rule (lib/price-badge).
    expect(c.estimate.comparables).toEqual([{ id: "c1" }, { id: "c2" }]);
    expect(toCard({ ...base, estimate: { ...base.estimate, comparables: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}` })) } } as unknown as Listing).estimate.comparables).toHaveLength(3);
    expect(c.estimate.mid).toBe(185000);
    expect(c.priceHistory).toEqual([{ date: "2026-03-01", amount: 180000, kind: "DROP" }]);
    expect(c.photos).toHaveLength(5);
    expect(c.agent?.phone).toBeUndefined();
    expect(c.agency?.whatsapp).toBe("");
    expect(JSON.stringify(c).length).toBeLessThan(JSON.stringify(base).length / 2);
  });
});
