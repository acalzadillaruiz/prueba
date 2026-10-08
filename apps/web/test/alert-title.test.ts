import { describe, expect, it } from "vitest";
import { alertTitle, isMachineName } from "@/components/seeker/alertTitle";

describe("alertTitle: a saved search in words", () => {
  it("reads the seeded alerts like a person would say them", () => {
    expect(alertTitle("type=SALE&zone=Chacao&beds=2&max=250000", false, "es")).toBe("Compra en Chacao · 2+ hab · hasta $250k");
    expect(alertTitle("type=LONG_RENT&zone=Altamira&furnished=1", false, "es")).toBe("Alquiler amoblado en Altamira");
    expect(alertTitle("type=LONG_RENT&zone=Altamira&furnished=1", false, "en")).toBe("Furnished rental in Altamira");
    expect(alertTitle("poly=1", true, "es")).toBe("Compra en tu zona dibujada");
  });
  it("covers radius, kind, price range and recency", () => {
    expect(alertTitle("type=LONG_RENT&furnished=1&radius=10.5,-66.8,3&pub=7d", false, "es")).toBe("Alquiler amoblado cerca de ti · últimos 7 días");
    expect(alertTitle("type=SALE&kind=penthouse&min=100000&max=1500000&lux=1", false, "en")).toBe("Penthouses for sale · Private Collection · $100k–$1.5M");
  });
  it("tells machine names from names the person typed", () => {
    expect(isMachineName("Comprar · Chacao · 2+ hab · < 250k")).toBe(true);
    expect(isMachineName("Polígono · Los Palos Grandes + Altamira")).toBe(true);
    expect(isMachineName("Casa para mamá")).toBe(false);
  });
});
