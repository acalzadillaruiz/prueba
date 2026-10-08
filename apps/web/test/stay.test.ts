import { describe, expect, it } from "vitest";
import { leadSchema } from "@newplace/config";
import { addDays, nightsBetween, stayDay, stayEstimate, todayCaracas, validateStay } from "@/lib/stay";

const today = "2026-10-08";

describe("vacation stay dates", () => {
  it("counts nights across months and years", () => {
    expect(nightsBetween("2026-10-08", "2026-10-11")).toBe(3);
    expect(nightsBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(nightsBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(nightsBetween("2026-10-11", "2026-10-08")).toBe(-3);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("validates arrival, departure and minimum nights", () => {
    expect(validateStay(undefined, undefined, { today }).error).toBe("missing-in");
    expect(validateStay("2026-10-10", "", { today }).error).toBe("missing-out");
    expect(validateStay("2026-10-07", "2026-10-09", { today }).error).toBe("past");
    expect(validateStay("2026-10-10", "2026-10-10", { today }).error).toBe("order");
    expect(validateStay("2026-10-12", "2026-10-10", { today }).error).toBe("order");
    expect(validateStay("2026-02-31", "2026-03-04", { today: "2026-01-01" }).error).toBe("bad-date");
    expect(validateStay("2026-10-10", "2026-10-12", { today, minNights: 3 })).toEqual({ nights: 2, error: "min" });
    expect(validateStay("2026-10-10", "2026-10-13", { today, minNights: 3 })).toEqual({ nights: 3, error: null });
    expect(validateStay(today, "2026-10-09", { today })).toEqual({ nights: 1, error: null });
    expect(validateStay(today, addDays(today, 400), { today }).error).toBe("max");
  });

  it("estimates the total from the nightly price plus cleaning", () => {
    expect(stayEstimate(95, 3, 20)).toEqual({ subtotal: 285, cleaning: 20, total: 305 });
    expect(stayEstimate(95, 2)).toEqual({ subtotal: 190, cleaning: 0, total: 190 });
    expect(stayEstimate(0, 3)).toBeNull();
    expect(stayEstimate(95, 0)).toBeNull();
  });

  it("formats days and today's date without a time-zone shift", () => {
    expect(stayDay("2026-10-15", "en")).toMatch(/Oct 15/);
    expect(stayDay("2026-10-15", "es")).toMatch(/15 oct/);
    // 02:00 UTC on the 9th is still the 8th in Caracas (UTC−4).
    expect(todayCaracas(new Date("2026-10-09T02:00:00Z"))).toBe("2026-10-08");
  });

  it("the lead schema accepts the optional structured stay (and old payloads without it)", () => {
    const base = { listingId: "x", name: "Ana", email: "ana@example.com", message: "Hola" };
    expect(leadSchema.safeParse(base).success).toBe(true);
    expect(leadSchema.safeParse({ ...base, checkIn: "2026-10-10", checkOut: "2026-10-13", guests: 2 }).success).toBe(true);
    expect(leadSchema.safeParse({ ...base, checkIn: "10/10/2026" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, guests: 0 }).success).toBe(false);
  });
});
