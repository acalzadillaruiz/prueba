import { describe, expect, it } from "vitest";
import { weeklySavesLabel } from "@/lib/public-metrics";

describe("weekly saves", () => {
  it("is hidden below 5 real saves this week", () => {
    expect(weeklySavesLabel(0, "es")).toBeNull();
    expect(weeklySavesLabel(4, "en")).toBeNull();
    expect(weeklySavesLabel(Number.NaN, "es")).toBeNull();
  });
  it("is phrased weekly from 5 on", () => {
    expect(weeklySavesLabel(5, "es")).toBe("5 personas la guardaron esta semana");
    expect(weeklySavesLabel(12, "en")).toBe("12 people saved it this week");
  });
});
