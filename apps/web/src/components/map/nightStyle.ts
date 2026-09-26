/** Caracas Night map style (brief §10): water #0B1220, roads #1a2740, labels #8AA4B5. Used when no Map ID is set. */
export const NIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#111B2E" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8AA4B5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B1220" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0B1220" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1A2740" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2F4670" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#13261F" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#22304A" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#15233A" }] },
];
