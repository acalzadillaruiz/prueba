import type { Listing, Locale, PowerBackup } from "@/types/domain";
import { num, tx } from "./i18n";

/**
 * Venezuelan essentials (planta eléctrica, pozo, tanque, muelle, vistas) as structured, filterable data.
 * Pure helpers shared by the search API (URL ⇄ filters), the search UI chips, the detail page and the editors.
 */

export const POWER_BACKUPS: PowerBackup[] = ["FULL", "PARTIAL", "NONE"];
/** Search: "full" = planta 100 %; "partial" = at least partial (FULL or PARTIAL). */
export const POWER_FILTERS = ["full", "partial"] as const;
export type PowerFilter = (typeof POWER_FILTERS)[number];
/** Minimum tank sizes offered in the search panel (litres). */
export const TANK_STEPS = [1000, 5000, 10000];
/** Upper bounds shared by the UI and the API (zod). */
export const MAX_TANK_LITERS = 1_000_000;
export const MAX_DOCK_FEET = 500;

export interface EssentialsFilters {
  power?: PowerFilter;
  well?: boolean;
  tank?: number;
  dock?: boolean;
  avila?: boolean;
  sea?: boolean;
}

/** Defensive URL parsing: unknown values are dropped (never reach Prisma). */
export function essentialsFromParams(sp: URLSearchParams): EssentialsFilters {
  const power = sp.get("power");
  const tankRaw = sp.get("tank");
  const tank = tankRaw && /^\d{1,7}$/.test(tankRaw) ? Number(tankRaw) : undefined;
  const flag = (k: string) => sp.get(k) === "1";
  return {
    power: power && (POWER_FILTERS as readonly string[]).includes(power) ? (power as PowerFilter) : undefined,
    well: flag("well"),
    tank: tank && tank > 0 && tank <= MAX_TANK_LITERS ? tank : undefined,
    dock: flag("dock"),
    avila: flag("avila"),
    sea: flag("sea"),
  };
}

type Ess = Pick<Listing, "powerBackup" | "ownWell" | "waterTankLiters" | "dockFeet" | "viewAvila" | "viewSea">;

/** Whether a listing satisfies the essentials filters (same rule as the Prisma where clause). */
export function matchesEssentials(l: Ess, f: EssentialsFilters): boolean {
  if (f.power === "full" && l.powerBackup !== "FULL") return false;
  if (f.power === "partial" && l.powerBackup !== "FULL" && l.powerBackup !== "PARTIAL") return false;
  if (f.well && !l.ownWell) return false;
  if (f.tank && !((l.waterTankLiters ?? 0) >= f.tank)) return false;
  if (f.dock && !((l.dockFeet ?? 0) > 0)) return false;
  if (f.avila && !l.viewAvila) return false;
  if (f.sea && !l.viewSea) return false;
  return true;
}

export const powerLabel = (p: PowerBackup, locale: Locale) =>
  p === "FULL" ? tx(locale, "Planta eléctrica 100 %", "Full backup generator") : p === "PARTIAL" ? tx(locale, "Planta eléctrica parcial", "Partial backup generator") : tx(locale, "Sin planta eléctrica", "No backup generator");

export const tankLabel = (liters: number, locale: Locale) => tx(locale, `Tanque de ${num(liters, locale)} L`, `${num(liters, locale)} L water tank`);
export const dockLabel = (feet: number, locale: Locale) => tx(locale, `Muelle de ${num(feet, locale)} pies`, `${num(feet, locale)} ft private dock`);

/** Labels for the "Servicios esenciales" block: only known values (null / false = unknown or absent → omitted). */
export function essentialLabels(l: Partial<Ess>, locale: Locale): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  if (l.powerBackup) out.push({ key: "power", label: powerLabel(l.powerBackup, locale) });
  if (l.ownWell) out.push({ key: "well", label: tx(locale, "Pozo propio", "Private water well") });
  if (l.waterTankLiters) out.push({ key: "tank", label: tankLabel(l.waterTankLiters, locale) });
  if (l.dockFeet) out.push({ key: "dock", label: dockLabel(l.dockFeet, locale) });
  if (l.viewAvila) out.push({ key: "avila", label: tx(locale, "Vista al Ávila", "Ávila mountain view") });
  if (l.viewSea) out.push({ key: "sea", label: tx(locale, "Vista al mar", "Sea view") });
  return out;
}

/** Search chips (and alert names) for the active essentials filters, with the URL patch that removes each one. */
export function essentialChips(f: EssentialsFilters, locale: Locale): [string, string, Record<string, string | null>][] {
  const chips: [string, string, Record<string, string | null>][] = [];
  if (f.power) chips.push(["power", f.power === "full" ? tx(locale, "Planta 100 %", "Full generator") : tx(locale, "Planta (al menos parcial)", "Generator (at least partial)"), { power: null }]);
  if (f.well) chips.push(["well", tx(locale, "Pozo propio", "Own well"), { well: null }]);
  if (f.tank) chips.push(["tank", tx(locale, `Tanque ≥ ${num(f.tank, locale)} L`, `Tank ≥ ${num(f.tank, locale)} L`), { tank: null }]);
  if (f.dock) chips.push(["dock", tx(locale, "Con muelle", "With dock"), { dock: null }]);
  if (f.avila) chips.push(["avila", tx(locale, "Vista al Ávila", "Ávila view"), { avila: null }]);
  if (f.sea) chips.push(["sea", tx(locale, "Vista al mar", "Sea view"), { sea: null }]);
  return chips;
}
