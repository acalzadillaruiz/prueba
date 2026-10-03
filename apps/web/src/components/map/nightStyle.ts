/** Alternative night style (toggle) (brief §10): water #162638, roads #1a2740, labels #A9B4C2. Used when no Map ID is set. */
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

/** Brand v4 default: light Mediterranean style (land Cal/arena, sea Egeo, sand roads, warm-grey labels). */
export const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#F3EEE5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8F8370" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F8F5EF" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#BFD5E2" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3E6A86" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#EAE1D1" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#E3D7C2" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#D8C8AC" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#E6E5D3" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#D8C8AC" }] },
];
