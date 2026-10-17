/** Alternative night style (toggle) (brief §10): water #3A6A92, roads #2F5A7E, labels #B9C7D3 (043). Used when no Map ID is set. */
export const NIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#3A6A92" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B9C7D3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#3A6A92" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#3A6A92" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2F5A7E" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2C4A60" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#12231F" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2C4A60" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#101E31" }] },
];

/** Brand v4 default: light Mediterranean style (land Cal/arena, sea Egeo, sand roads, warm-grey labels). */
export const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#EEF2F5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8F8370" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FAF8F4" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#EFE6D8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5A534D" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#EFE6D8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#EFE6D8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#D6DEE5" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#E6E5D3" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#D6DEE5" }] },
];
