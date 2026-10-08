/** Alternative night style (toggle) (brief §10): water #1E1A18, roads #2C2622, labels #B5AAA0. Used when no Map ID is set. */
export const NIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1E1A18" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B5AAA0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1E1A18" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1E1A18" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2C2622" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#433B35" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#13261F" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#3A322D" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#27221E" }] },
];

/** Brand v4 default: light Mediterranean style (land Cal/arena, sea Egeo, sand roads, warm-grey labels). */
export const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#F3EEE5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8F8370" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F1EBE3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#DECFBB" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5A514B" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#EAE1D1" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#E3D7C2" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#D8C8AC" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#E6E5D3" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#D8C8AC" }] },
];
