"use client";

import type { LatLng } from "@/lib/geo";
import { GOOGLE_MAPS_KEY } from "./config";
import dynamic from "next/dynamic";
import { NightMap, type NightMapProps } from "./NightMap";

// Loaded only when a Maps key exists, so the Google Maps SDK wrapper never ships to users of the illustrated map.
const GoogleMapView = dynamic(() => import("./GoogleMapView").then((m) => m.GoogleMapView), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-[#BFD5E2]" /> });

export type MapViewProps = NightMapProps & { pin?: LatLng; onPick?: (p: LatLng) => void };

/** Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_KEY is set; otherwise the illustrated Caracas/Venezuela map (never a blank screen). */
export function MapView(props: MapViewProps) {
  return GOOGLE_MAPS_KEY ? <GoogleMapView {...props} /> : <NightMap {...props} />;
}
