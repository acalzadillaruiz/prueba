import { describe, expect, it } from "vitest";
import { money, shortMoney } from "@/lib/i18n";

describe("shortMoney: one short currency style per locale, like money()", () => {
  it("es: «USD» prefix, also in compact forms", () => {
    expect(money(300000, "es")).toBe("USD 300.000");
    expect(shortMoney(150000, "es")).toBe("USD 150k");
    expect(shortMoney(139000, "es")).toBe("USD 139k");
    expect(shortMoney(1500000, "es")).toBe("USD 1,5M");
    expect(shortMoney(1250000, "es")).toBe("USD 1,3M");
    expect(shortMoney(2000000, "es")).toBe("USD 2M");
    expect(shortMoney(12_400_000, "es")).toBe("USD 12M");
    expect(shortMoney(1800, "es")).toBe("USD 1.800");
  });
  it("en: «$», compact and full alike", () => {
    expect(money(1100, "en")).toBe("$1,100");
    expect(shortMoney(150000, "en")).toBe("$150k");
    expect(shortMoney(1500000, "en")).toBe("$1.5M");
    expect(shortMoney(1800, "en")).toBe("$1,800");
  });
  it("never a space before M, never «1000k»", () => {
    expect(shortMoney(2_300_000, "es")).toBe("USD 2,3M");
    expect(shortMoney(999_700, "es")).toBe("USD 1M");
    expect(shortMoney(999_700, "en")).toBe("$1M");
  });
});
