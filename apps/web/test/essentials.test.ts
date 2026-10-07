import { describe, expect, it } from "vitest";
import { filtersFromParams, whereFromFilters } from "@/server/listings";
import { essentialChips, essentialLabels, essentialsFromParams, matchesEssentials } from "@/lib/essentials";
import { essentialsSchema } from "@/lib/essentials-schema";

describe("essentials filters (URL → SearchFilters)", () => {
  it("parses every essentials param", () => {
    const f = filtersFromParams(new URLSearchParams("power=full&well=1&tank=5000&dock=1&avila=1&sea=1"));
    expect(f).toMatchObject({ power: "full", well: true, tank: 5000, dock: true, avila: true, sea: true });
  });
  it("drops invalid values", () => {
    const f = essentialsFromParams(new URLSearchParams("power=ALL&tank=-5&well=yes&dock=0&avila=true"));
    expect(f).toEqual({ power: undefined, well: false, tank: undefined, dock: false, avila: false, sea: false });
    expect(essentialsFromParams(new URLSearchParams("tank=1e4")).tank).toBeUndefined();
    expect(essentialsFromParams(new URLSearchParams("tank=5000.5")).tank).toBeUndefined();
    expect(essentialsFromParams(new URLSearchParams("tank=99999999")).tank).toBeUndefined();
    expect(essentialsFromParams(new URLSearchParams("power=partial")).power).toBe("partial");
  });
  it("builds the Prisma where clause from the structured columns", () => {
    const and = (whereFromFilters(filtersFromParams(new URLSearchParams("power=partial&tank=1000&dock=1&sea=1"))).AND ?? []) as object[];
    expect(and).toContainEqual({ powerBackup: { in: ["FULL", "PARTIAL"] } });
    expect(and).toContainEqual({ waterTankLiters: { gte: 1000 } });
    expect(and).toContainEqual({ dockFeet: { gt: 0 } });
    expect(and).toContainEqual({ viewSea: true });
    const full = (whereFromFilters(filtersFromParams(new URLSearchParams("power=full&well=1&avila=1"))).AND ?? []) as object[];
    expect(full).toEqual(expect.arrayContaining([{ powerBackup: "FULL" }, { ownWell: true }, { viewAvila: true }]));
  });
  it("matches listings with the same rule", () => {
    const l = { powerBackup: "PARTIAL" as const, ownWell: false, waterTankLiters: 5000, dockFeet: null, viewAvila: true, viewSea: false };
    expect(matchesEssentials(l, { power: "partial", tank: 5000, avila: true })).toBe(true);
    expect(matchesEssentials(l, { power: "full" })).toBe(false);
    expect(matchesEssentials(l, { tank: 10000 })).toBe(false);
    expect(matchesEssentials(l, { dock: true })).toBe(false);
  });
});

describe("essentials labels", () => {
  it("formats only known values, with lining-number thousands separators", () => {
    const l = { powerBackup: "FULL" as const, ownWell: true, waterTankLiters: 5000, dockFeet: 40, viewAvila: true, viewSea: true };
    expect(essentialLabels(l, "es").map((x) => x.label)).toEqual(["Planta eléctrica 100 %", "Pozo propio", "Tanque de 5.000 L", "Muelle de 40 pies", "Vista al Ávila", "Vista al mar"]);
    expect(essentialLabels(l, "en").map((x) => x.label)).toEqual(["Full backup generator", "Private water well", "5,000 L water tank", "40 ft private dock", "Ávila mountain view", "Sea view"]);
  });
  it("omits unknown values", () => {
    expect(essentialLabels({ powerBackup: null, ownWell: false, waterTankLiters: null, dockFeet: null, viewAvila: false, viewSea: false }, "es")).toEqual([]);
    expect(essentialLabels({ powerBackup: "NONE" }, "es").map((x) => x.label)).toEqual(["Sin planta eléctrica"]);
  });
  it("names alert chips", () => {
    expect(essentialChips({ power: "partial", tank: 10000, well: true }, "es").map(([, label]) => label)).toEqual(["Planta (al menos parcial)", "Pozo propio", "Tanque ≥ 10.000 L"]);
  });
});

describe("essentials API schema", () => {
  it("accepts valid values and null to clear", () => {
    expect(essentialsSchema.safeParse({ powerBackup: "PARTIAL", ownWell: true, waterTankLiters: 5000, dockFeet: 40, viewSea: true }).success).toBe(true);
    expect(essentialsSchema.safeParse({ powerBackup: null, waterTankLiters: null, dockFeet: null }).success).toBe(true);
  });
  it("rejects bad values", () => {
    expect(essentialsSchema.safeParse({ powerBackup: "HALF" }).success).toBe(false);
    expect(essentialsSchema.safeParse({ waterTankLiters: -1 }).success).toBe(false);
    expect(essentialsSchema.safeParse({ waterTankLiters: 2.5 }).success).toBe(false);
    expect(essentialsSchema.safeParse({ dockFeet: 10_000 }).success).toBe(false);
    expect(essentialsSchema.safeParse({ ownWell: "yes" }).success).toBe(false);
  });
});
