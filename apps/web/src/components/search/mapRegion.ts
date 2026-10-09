export type MapRegion = "caracas" | "venezuela";

/** Share of results in Caracas from which the map opens on Caracas (otherwise on the whole country). */
export const CARACAS_MAJORITY = 0.6;

/**
 * Which map a result set opens on: Caracas only when most homes are there (≥ 60 %), otherwise Venezuela — so a
 * vacation search with one home in Caracas and seven on the coast doesn't hide seven of its eight pins.
 */
export function autoMapRegion(results: { city?: string | null }[]): MapRegion {
  if (results.length === 0) return "caracas";
  const inCaracas = results.filter((l) => l.city === "Caracas").length;
  return inCaracas / results.length >= CARACAS_MAJORITY ? "caracas" : "venezuela";
}

/** Homes the current map shows (the Caracas map only draws Caracas). */
export function onRegionMap<T extends { city?: string | null }>(results: T[], region: MapRegion): T[] {
  return region === "caracas" ? results.filter((l) => l.city === "Caracas") : results;
}
