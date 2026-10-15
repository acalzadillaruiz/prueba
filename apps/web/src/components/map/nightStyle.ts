/** Alternative night style (toggle) (brief §10): water #0E1A2B, roads #14243A, labels #A9B1BC (043). Used when no Map ID is set. */
export const NIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0E1A2B" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A9B1BC" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0E1A2B" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0E1A2B" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#14243A" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1E3049" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#12231F" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1E3049" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#101E31" }] },
];

/** Brand v4 default: light Mediterranean style (land Cal/arena, sea Egeo, sand roads, warm-grey labels). */
export const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#F1ECE4" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8F8370" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F6F2EC" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#E9E1D3" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5A534D" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#E9E1D3" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#E9E1D3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#C9BFAE" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#E6E5D3" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#C9BFAE" }] },
];
