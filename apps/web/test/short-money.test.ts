import { describe, expect, it } from "vitest";
import { compactMoney, money, shortMoney } from "@/lib/i18n";

describe("shortMoney: one currency style per locale, like money()", () => {
  it("es: «USD» prefix, also in compact forms", () => {
    expect(money(300000, "es")).toBe("USD 300.000");
    expect(shortMoney(150000, "es")).toBe("USD 150k");
    expect(shortMoney(1500000, "es")).toBe("USD 1,5M");
    expect(shortMoney(1800, "es")).toBe("USD 1.800");
  });
  it("en: «$», compact and full alike", () => {
    expect(money(1100, "en")).toBe("$1,100");
    expect(shortMoney(150000, "en")).toBe("$150k");
    expect(shortMoney(1500000, "en")).toBe("$1.5M");
    expect(shortMoney(1800, "en")).toBe("$1,800");
  });
  it("leaves compactMoney (map pins) as it was", () => {
    expect(compactMoney(150000, "es")).toBe("$150k");
  });
});
