/** Caracas Night map style (brief §10): water #162638, roads #1a2740, labels #A9B4C2. Used when no Map ID is set. */
export const NIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#111B2E" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A9B4C2" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#162638" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#162638" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1A2740" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2F4670" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#13261F" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2A3E55" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#15233A" }] },
];
