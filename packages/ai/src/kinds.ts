/**
 * Property kind classes for PlaceEstimate: comparables only come from the same class, and zone m² prices
 * (quoted for built homes) are scaled per class — land ≈ 7 %, warehouses ≈ 65 %, retail/offices ≈ 110 %.
 */
export type KindClass = "residential" | "land" | "warehouse" | "commercial";

const KIND_CLASS: Record<string, KindClass> = { land: "land", warehouse: "warehouse", retail: "commercial", office: "commercial" };
export const RESIDENTIAL_KINDS = ["apartment", "penthouse", "house", "townhouse", "studio", "villa", "chalet"];
export const CLASS_FACTOR: Record<KindClass, number> = { residential: 1, land: 0.07, warehouse: 0.65, commercial: 1.1 };

export const kindClass = (kind: string): KindClass => KIND_CLASS[kind] ?? "residential";
export const kindsOfClass = (c: KindClass) => (c === "residential" ? RESIDENTIAL_KINDS : Object.entries(KIND_CLASS).filter(([, v]) => v === c).map(([k]) => k));
