/** Alternative night style (toggle) (brief §10): water #1C1D1D, roads #2C2622, labels #B8B2AA. Used when no Map ID is set. */
export const NIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1C1D1D" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B8B2AA" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1C1D1D" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1C1D1D" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2C2622" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3E4650" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#13261F" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#343A40" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#27221E" }] },
];

/** Brand v4 default: light Mediterranean style (land Cal/arena, sea Egeo, sand roads, warm-grey labels). */
export const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#F1ECE4" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8F8370" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F6F2EC" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#ECE5DA" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5A534D" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#E3DACB" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ECE5DA" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#CDBFAC" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#E6E5D3" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#CDBFAC" }] },
];
