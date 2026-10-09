import { describe, expect, it } from "vitest";
import { isPriceVerified, priceBadgeLabel } from "@/lib/price-badge";

const comps = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i}` }));
const l = (priceAmount: number, mid: number, n: number) => ({ priceAmount, estimate: { mid, comparables: comps(n) } });

describe("price badge", () => {
  it("is verified within ±10 % of an estimate from ≥ 3 comparables", () => {
    expect(isPriceVerified(l(100_000, 100_000, 3))).toBe(true);
    expect(isPriceVerified(l(110_000, 100_000, 5))).toBe(true);
    expect(isPriceVerified(l(90_000, 100_000, 3))).toBe(true);
  });
  it("is the owner's price outside ±10 %", () => {
    expect(isPriceVerified(l(110_001, 100_000, 5))).toBe(false);
    expect(isPriceVerified(l(89_999, 100_000, 5))).toBe(false);
  });
  it("is the owner's price with fewer than 3 comparables, however close", () => {
    expect(isPriceVerified(l(100_000, 100_000, 2))).toBe(false);
    expect(isPriceVerified(l(100_000, 100_000, 0))).toBe(false);
  });
  it("never verifies against a missing estimate", () => {
    expect(isPriceVerified(l(100_000, 0, 5))).toBe(false);
    expect(isPriceVerified(l(0, 100_000, 5))).toBe(false);
  });
  it("labels in both languages", () => {
    expect(priceBadgeLabel(l(100_000, 100_000, 3), "es")).toBe("Precio verificado");
    expect(priceBadgeLabel(l(100_000, 100_000, 3), "en")).toBe("Price verified");
    expect(priceBadgeLabel(l(200_000, 100_000, 3), "es")).toBe("Precio del propietario");
    expect(priceBadgeLabel(l(200_000, 100_000, 3), "en")).toBe("Owner's price");
  });
});
