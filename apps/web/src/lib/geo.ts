import { haversineKm } from "@newplace/ai";

export type LatLng = { lat: number; lng: number };
export type Shape = { type: "poly"; pts: LatLng[] } | { type: "radius"; center: LatLng; km: number } | null;

/** Ray casting point-in-polygon on lat/lng (fine at city scale). */
export function pointInPolygon(p: LatLng, poly: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const hit = a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (hit) inside = !inside;
  }
  return inside;
}

export function inShape(p: LatLng, s: Shape): boolean {
  if (!s) return true;
  if (s.type === "poly") return s.pts.length < 3 || pointInPolygon(p, s.pts);
  return haversineKm(p, s.center) <= s.km;
}
