import { describe, expect, it } from "vitest";
import { prisma } from "@newplace/db";
import { assertBookableSlot, assertFutureTour } from "@/server/tours";
import { bump } from "@/server/counters";

const code = async (p: Promise<unknown> | (() => void)) =>
  typeof p === "function" ? (() => { try { p(); return "OK"; } catch (e) { return (e as { code?: string }).code ?? "ERR"; } })() : p.then(() => "OK").catch((e: { code?: string }) => e.code ?? "ERR");

/** Next Monday 10:00 America/Caracas (UTC-4) = 14:00 UTC; u-agent has Monday 9/10/11 slots in the seed. */
function nextMonday(hourLocal: number, minute = 0) {
  const d = new Date();
  const add = ((8 - d.getUTCDay()) % 7) || 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + add, hourLocal + 4, minute));
}

describe("tour booking rules", () => {
  it("accepts a published slot of the agent's calendar", async () => {
    expect(await code(assertBookableSlot("u-agent", nextMonday(10)))).toBe("OK");
  });
  it("rejects times outside the calendar, off the hour, in the past or too far ahead", async () => {
    expect(await code(assertBookableSlot("u-agent", nextMonday(3)))).toBe("VALIDATION");
    expect(await code(assertBookableSlot("u-agent", nextMonday(10, 30)))).toBe("VALIDATION");
    expect(await code(assertBookableSlot("u-agent", new Date(Date.now() - 864e5)))).toBe("VALIDATION");
    expect(await code(assertBookableSlot("u-agent", new Date(Date.now() + 30 * 864e5)))).toBe("VALIDATION");
  });
  it("staff-proposed tours must be in the future", async () => {
    expect(await code(() => assertFutureTour(new Date(Date.now() - 60e3)))).toBe("VALIDATION");
    expect(await code(() => assertFutureTour(new Date(Date.now() + 864e5)))).toBe("OK");
  });
});

describe("listing counters", () => {
  it("bump() increments without touching updatedAt (freshness badge stays honest)", async () => {
    const before = await prisma.listing.findUniqueOrThrow({ where: { id: "19if9a" }, select: { views: true, updatedAt: true } });
    await bump(["19if9a"], ["views"]);
    const after = await prisma.listing.findUniqueOrThrow({ where: { id: "19if9a" }, select: { views: true, updatedAt: true } });
    expect(after.views).toBe(before.views + 1);
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });
});
