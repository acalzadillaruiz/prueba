"use client";

import type { LatLng } from "@/lib/geo";
import { GOOGLE_MAPS_KEY } from "./config";
import { GoogleMapView } from "./GoogleMapView";
import { NightMap, type NightMapProps } from "./NightMap";

export type MapViewProps = NightMapProps & { pin?: LatLng; onPick?: (p: LatLng) => void };

/** Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_KEY is set; otherwise the illustrated Caracas/Venezuela map (never a blank screen). */
export function MapView(props: MapViewProps) {
  return GOOGLE_MAPS_KEY ? <GoogleMapView {...props} /> : <NightMap {...props} />;
}
