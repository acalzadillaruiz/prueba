/** Alternative night style (toggle) (brief §10): water #1F2328, roads #23272B, labels #A9AFB6. Used when no Map ID is set. */
export const NIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1F2328" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A9AFB6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1F2328" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1F2328" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#23272B" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#363C42" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#13261F" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2C3137" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#1F2326" }] },
];

/** Brand v4 default: light Mediterranean style (land Cal/arena, sea Egeo, sand roads, warm-grey labels). */
export const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#EAECEE" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#737F8C" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#EEF0F2" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#C7CCD2" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4B525A" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#DADEE1" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#CED2D7" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#BCC2C8" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#D9DCE0" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#BCC2C8" }] },
];
