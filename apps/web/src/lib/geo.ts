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

/** Lat/lng bounding box enclosing a shape (south, west, north, east): a cheap indexed pre-filter before inShape. */
export function shapeBounds(s: Shape): [number, number, number, number] | null {
  if (!s) return null;
  if (s.type === "poly") {
    if (s.pts.length < 3) return null;
    const lats = s.pts.map((p) => p.lat);
    const lngs = s.pts.map((p) => p.lng);
    return [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)];
  }
  // 1° latitude ≈ 111.32 km; longitude degrees shrink with cos(lat). Padded 1 % so the exact haversine test decides.
  const dLat = (s.km / 111.32) * 1.01;
  const dLng = (s.km / (111.32 * Math.max(0.01, Math.cos((s.center.lat * Math.PI) / 180)))) * 1.01;
  return [s.center.lat - dLat, s.center.lng - dLng, s.center.lat + dLat, s.center.lng + dLng];
}
