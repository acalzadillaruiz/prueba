import type { Zone } from "@/types/domain";

/** Fictional market figures for the prototype. USD / m². rentPpm = USD / m² / month. */
export const ZONES: Zone[] = [
  { name: "Los Palos Grandes", slug: "los-palos-grandes", city: "Caracas", state: "Miranda", lat: 10.4995, lng: -66.8435, salePpm: 1480, rentPpm: 11.5, activeListings: 214, daysOnMarket: 71, trend12m: 6.2 },
  { name: "Altamira", slug: "altamira", city: "Caracas", state: "Miranda", lat: 10.4965, lng: -66.8505, salePpm: 1520, rentPpm: 11.2, activeListings: 268, daysOnMarket: 64, trend12m: 5.4 },
  { name: "La Castellana", slug: "la-castellana", city: "Caracas", state: "Miranda", lat: 10.4985, lng: -66.8585, salePpm: 1650, rentPpm: 12.0, activeListings: 176, daysOnMarket: 69, trend12m: 7.1 },
  { name: "Country Club", slug: "country-club", city: "Caracas", state: "Miranda", lat: 10.5015, lng: -66.8665, salePpm: 2150, rentPpm: 13.5, activeListings: 42, daysOnMarket: 132, trend12m: 3.8 },
  { name: "Chacao", slug: "chacao", city: "Caracas", state: "Miranda", lat: 10.4925, lng: -66.8545, salePpm: 1260, rentPpm: 9.8, activeListings: 331, daysOnMarket: 58, trend12m: 4.9 },
  { name: "Las Mercedes", slug: "las-mercedes", city: "Caracas", state: "Miranda", lat: 10.4815, lng: -66.8605, salePpm: 1420, rentPpm: 12.8, activeListings: 197, daysOnMarket: 77, trend12m: 8.3 },
  { name: "Sabana Grande", slug: "sabana-grande", city: "Caracas", state: "Distrito Capital", lat: 10.4955, lng: -66.8765, salePpm: 840, rentPpm: 6.9, activeListings: 289, daysOnMarket: 92, trend12m: 2.1 },
  { name: "El Hatillo", slug: "el-hatillo", city: "Caracas", state: "Miranda", lat: 10.4275, lng: -66.8255, salePpm: 1010, rentPpm: 7.4, activeListings: 158, daysOnMarket: 101, trend12m: 3.3 },
  { name: "La Boyera", slug: "la-boyera", city: "Caracas", state: "Miranda", lat: 10.4435, lng: -66.8385, salePpm: 930, rentPpm: 6.8, activeListings: 96, daysOnMarket: 88, trend12m: 2.7 },
  { name: "La Trinidad", slug: "la-trinidad", city: "Caracas", state: "Miranda", lat: 10.4395, lng: -66.8705, salePpm: 690, rentPpm: 5.1, activeListings: 61, daysOnMarket: 118, trend12m: 1.9 },
  { name: "Lomas de San Román", slug: "lomas-de-san-roman", city: "Caracas", state: "Miranda", lat: 10.4705, lng: -66.8525, salePpm: 1700, rentPpm: 11.0, activeListings: 38, daysOnMarket: 141, trend12m: 4.4 },
  { name: "Lechería", slug: "lecheria", city: "Lechería", state: "Anzoátegui", lat: 10.1905, lng: -64.6905, salePpm: 900, rentPpm: 8.0, activeListings: 143, daysOnMarket: 84, trend12m: 5.0 },
  { name: "Pampatar", slug: "pampatar", city: "Isla de Margarita", state: "Nueva Esparta", lat: 11.0005, lng: -63.7955, salePpm: 820, rentPpm: 7.5, activeListings: 121, daysOnMarket: 96, trend12m: 6.6 },
  { name: "Playa El Agua", slug: "playa-el-agua", city: "Isla de Margarita", state: "Nueva Esparta", lat: 11.1455, lng: -63.8625, salePpm: 1150, rentPpm: 9.0, activeListings: 54, daysOnMarket: 123, trend12m: 7.8 },
  { name: "Mérida", slug: "merida", city: "Mérida", state: "Mérida", lat: 8.5945, lng: -71.1445, salePpm: 520, rentPpm: 4.2, activeListings: 118, daysOnMarket: 99, trend12m: 2.4 },
  { name: "Los Roques", slug: "los-roques", city: "Los Roques", state: "Dependencias Federales", lat: 11.9505, lng: -66.6745, salePpm: 1300, rentPpm: 15.0, activeListings: 9, daysOnMarket: 160, trend12m: 0 },
  { name: "Choroní", slug: "choroni", city: "Choroní", state: "Aragua", lat: 10.4975, lng: -67.6085, salePpm: 610, rentPpm: 6.0, activeListings: 27, daysOnMarket: 130, trend12m: 3.0 },
  { name: "El Viñedo", slug: "el-vinedo", city: "Valencia", state: "Carabobo", lat: 10.1935, lng: -68.0055, salePpm: 740, rentPpm: 6.1, activeListings: 176, daysOnMarket: 87, trend12m: 3.9 },
  { name: "Zona Industrial Sur", slug: "zona-industrial-sur", city: "Valencia", state: "Carabobo", lat: 10.1305, lng: -67.9905, salePpm: 480, rentPpm: 3.2, activeListings: 64, daysOnMarket: 139, trend12m: 2.2 },
  { name: "Tierra Negra", slug: "tierra-negra", city: "Maracaibo", state: "Zulia", lat: 10.6725, lng: -71.6205, salePpm: 610, rentPpm: 4.6, activeListings: 133, daysOnMarket: 104, trend12m: 1.6 },
  { name: "Del Este", slug: "del-este", city: "Barquisimeto", state: "Lara", lat: 10.0725, lng: -69.2815, salePpm: 560, rentPpm: 4.1, activeListings: 92, daysOnMarket: 97, trend12m: 2.0 },
];

export const zoneByName = (name: string) => ZONES.find((z) => z.name === name)!;
