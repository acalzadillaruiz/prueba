import { CLASS_FACTOR, heuristicEstimate, kindClass } from "@newplace/ai";
import type { Amenity, Kind, Listing, ListingStatus, ListingType, PowerBackup, PriceEvent, Scene } from "@/types/domain";
import { minutesAgo } from "./people";
import { zoneByName } from "./zones";

type Seed = {
  z: string;
  t: ListingType;
  k: Kind;
  b: number;
  ba: number;
  p: number;
  m2: number;
  price: number;
  y: number;
  am: Amenity[];
  /** Venezuelan essentials (structured, filterable): power backup, own well, tank litres, dock feet, Ávila / sea views. Omitted = unknown / no. */
  es: { pw?: PowerBackup; well?: boolean; tank?: number; dock?: number; avila?: boolean; sea?: boolean };
  te: string;
  tn: string;
  he: string;
  hn: string;
  ag?: string;
  agent?: string;
  owner?: string;
  st?: ListingStatus;
  pub: number; // minutes since published
  upd: number; // minutes since updated
  lux?: boolean;
  plot?: number;
  street: string;
  d: [number, number]; // lat/lng offset *1e4
  drop?: number; // % price drop at some point
  priv?: boolean;
  sr?: { minNights: number; maxGuests: number; cleaningFee: number };
  com?: { ceilingHeight: number; loadingDock: boolean; zoning: string; capRate?: number };
  vt?: boolean;
};

const H = 60;
const D = 60 * 24;

const SEEDS: Seed[] = [
  // ───────── 16 venta residencial Caracas
  { z: "Los Palos Grandes", t: "SALE", k: "penthouse", b: 3, ba: 2, p: 2, m2: 118, price: 178000, y: 1998, am: ["terrace", "view", "generator", "waterTank", "elevator", "security"], es: { pw: "PARTIAL", tank: 5000, avila: true }, te: "Ático luminoso con terraza a El Ávila", tn: "Bright penthouse with Ávila-facing terrace", he: "Terraza de 28 m² orientada al norte y luz natural todo el día.", hn: "28 m² north-facing terrace and daylight all day long.", ag: "ag-andes", agent: "u-agent", pub: 18 * D, upd: 12, street: "3ra Transversal, Res. Mirador del Parque, PH-B", d: [4, 6], drop: 4, vt: true },
  { z: "Altamira", t: "SALE", k: "apartment", b: 3, ba: 2, p: 2, m2: 142, price: 235000, y: 2006, am: ["pool", "gym", "generator", "waterTank", "security", "elevator"], es: { pw: "FULL", tank: 10000 }, te: "Apartamento familiar a dos cuadras de la plaza", tn: "Family apartment two blocks from the plaza", he: "Edificio con planta eléctrica total, piscina y gimnasio.", hn: "Full-building generator, pool and gym.", ag: "ag-andes", agent: "u-agent", pub: 26 * H, upd: 40, street: "Av. San Juan Bosco, Torre Alba, piso 9", d: [-3, 2], vt: true },
  { z: "La Castellana", t: "SALE", k: "apartment", b: 2, ba: 2, p: 1, m2: 98, price: 168000, y: 2012, am: ["generator", "waterTank", "security", "elevator", "gym"], es: { pw: "PARTIAL", tank: 3000, avila: true }, te: "2 habitaciones remodelado en calle tranquila", tn: "Renovated 2-bed on a quiet street", he: "Cocina abierta, pisos de porcelanato y closets empotrados.", hn: "Open kitchen, porcelain floors and built-in closets.", ag: "ag-night", agent: "u-agent3", pub: 4 * D, upd: 5 * H, street: "Calle José Ángel Lamas, Res. Castell, piso 4", d: [-2, -3] },
  { z: "Las Mercedes", t: "SALE", k: "apartment", b: 2, ba: 2, p: 2, m2: 85, price: 139000, y: 2015, am: ["pool", "gym", "security", "generator", "elevator"], es: { pw: "PARTIAL" }, te: "Apartamento moderno cerca del bulevar", tn: "Modern apartment near the boulevard", he: "Caminable a restaurantes, cafés y oficinas.", hn: "Walk to restaurants, cafés and offices.", ag: "ag-night", agent: "u-agent4", pub: 9 * D, upd: 2 * D, street: "Calle Madrid, Res. Mercedes Park, piso 6", d: [3, 4], drop: 6 },
  { z: "El Hatillo", t: "SALE", k: "house", b: 4, ba: 4, p: 3, m2: 320, plot: 600, price: 385000, y: 2001, am: ["garden", "bbq", "security", "waterTank", "generator", "view"], es: { pw: "FULL", well: true, tank: 20000 }, te: "Casa con jardín y vista al valle", tn: "House with garden and valley views", he: "Jardín de 280 m², kiosko con parrillera y tanque de 20.000 L.", hn: "280 m² garden, covered BBQ area and 20,000 L water tank.", ag: "ag-andes", agent: "u-agent2", pub: 16 * D, upd: 3 * D, street: "Urb. La Lagunita, Calle Los Mangos", d: [12, 25] },
  { z: "Chacao", t: "SALE", k: "apartment", b: 2, ba: 1, p: 1, m2: 76, price: 118000, y: 1992, am: ["elevator", "waterTank", "security"], es: { pw: "NONE", tank: 2000 }, te: "Apartamento práctico a pasos del metro", tn: "Practical apartment steps from the metro", he: "A 3 minutos a pie del Metro de Chacao.", hn: "3-minute walk to Chacao metro station.", ag: "ag-andes", agent: "u-agent", pub: 30, upd: 12, street: "Av. Francisco de Miranda, Edif. Chacao Sur, piso 7", d: [1, -2] },
  { z: "Chacao", t: "SALE", k: "apartment", b: 3, ba: 2, p: 2, m2: 110, price: 172000, y: 2004, am: ["generator", "waterTank", "security", "elevator", "gym"], es: { pw: "PARTIAL", tank: 5000 }, te: "3 habitaciones con balcón en Chacao", tn: "3-bed with balcony in Chacao", he: "Balcón corrido, cuarto de servicio y maletero.", hn: "Full-width balcony, service room and storage unit.", ag: "ag-andes", agent: "u-agent2", pub: 6 * D, upd: 20 * H, street: "Calle Elice, Res. Aurora, piso 11", d: [-4, 3], drop: 5 },
  { z: "Sabana Grande", t: "SALE", k: "apartment", b: 2, ba: 1, p: 0, m2: 70, price: 62000, y: 1978, am: ["elevator", "waterTank"], es: { pw: "NONE", tank: 2000 }, te: "Primer hogar en el corazón de Sabana Grande", tn: "First home in the heart of Sabana Grande", he: "Ideal para inversión o primera vivienda. Sin puesto.", hn: "Great first home or investment. No parking.", owner: "u-priv", pub: 11 * D, upd: 4 * D, street: "Calle Villaflor, Edif. Galipán, piso 3", d: [2, 5] },
  { z: "La Boyera", t: "SALE", k: "house", b: 3, ba: 3, p: 2, m2: 180, plot: 320, price: 210000, y: 1996, am: ["garden", "security", "waterTank", "bbq"], es: { pw: "NONE", well: true, tank: 8000 }, te: "Casa en conjunto cerrado con vigilancia", tn: "Gated-community house with 24/7 security", he: "Conjunto de 12 casas, vigilancia 24 h y área verde común.", hn: "Community of 12 homes, 24/7 security and shared green space.", ag: "ag-andes", agent: "u-agent", pub: 21 * D, upd: 6 * D, street: "Conj. Res. Los Samanes, Casa 7", d: [4, -6] },
  { z: "Altamira", t: "SALE", k: "studio", b: 1, ba: 1, p: 1, m2: 55, price: 89000, y: 2010, am: ["gym", "security", "elevator", "generator"], es: { pw: "PARTIAL" }, te: "Estudio amoblado listo para renta", tn: "Furnished studio, rent-ready", he: "Se entrega amoblado. Rentabilidad estimada 7 % anual.", hn: "Sold furnished. Estimated 7% annual yield.", ag: "ag-night", agent: "u-agent3", pub: 20 * H, upd: 3 * H, street: "5ta Transversal, Res. Altavista, piso 2", d: [6, -1] },
  { z: "Los Palos Grandes", t: "SALE", k: "apartment", b: 3, ba: 3, p: 2, m2: 160, price: 265000, y: 2009, am: ["pool", "gym", "generator", "waterTank", "security", "elevator", "view"], es: { pw: "PARTIAL", tank: 10000, avila: true }, te: "Planta alta con vista despejada", tn: "High floor with open views", he: "Piso 14, vista despejada y doble fachada.", hn: "14th floor, open views, dual aspect.", ag: "ag-andes", agent: "u-agent", pub: 2 * D, upd: 2 * H, street: "Av. Andrés Bello, Res. Cumbre Alta, piso 14", d: [-3, -4], st: "UNDER_OFFER" },
  { z: "La Castellana", t: "SALE", k: "apartment", b: 4, ba: 4, p: 3, m2: 210, price: 420000, y: 2018, am: ["pool", "gym", "generator", "waterTank", "security", "elevator", "terrace"], es: { pw: "FULL", tank: 10000, avila: true }, te: "4 habitaciones de obra reciente", tn: "Recently built 4-bed", he: "Obra de 2018, un apartamento por piso y ascensor privado.", hn: "Built 2018, one unit per floor and private elevator lobby.", ag: "ag-night", agent: "u-agent4", pub: 35 * D, upd: 8 * D, street: "Av. Mohedano, Res. Monteverde, piso 8", d: [3, 1] },
  { z: "Las Mercedes", t: "SALE", k: "apartment", b: 3, ba: 2, p: 2, m2: 130, price: 198000, y: 2008, am: ["pool", "security", "generator", "waterTank", "elevator"], es: { pw: "PARTIAL", tank: 6000 }, te: "3 habitaciones con estudio", tn: "3-bed plus home office", he: "Estudio independiente ideal para trabajo remoto.", hn: "Separate study, ideal for remote work.", ag: "ag-andes", agent: "u-agent2", pub: 14 * D, upd: 1 * D, street: "Calle París, Res. Villa Mercedes, piso 5", d: [-4, -3] },
  { z: "El Hatillo", t: "SALE", k: "townhouse", b: 3, ba: 3, p: 2, m2: 190, price: 245000, y: 2013, am: ["garden", "security", "pool", "bbq"], es: { pw: "NONE" }, te: "Townhouse con piscina comunal", tn: "Townhouse with community pool", he: "Tres niveles, patio privado y piscina comunal.", hn: "Three levels, private patio and shared pool.", ag: "ag-night", agent: "u-agent3", pub: 5 * D, upd: 9 * H, street: "Urb. Los Naranjos, TH 14", d: [-10, 16] },
  { z: "Chacao", t: "SALE", k: "apartment", b: 2, ba: 2, p: 1, m2: 88, price: 149000, y: 2011, am: ["generator", "waterTank", "security", "elevator"], es: { pw: "PARTIAL", tank: 4000 }, te: "2 habitaciones con puesto techado", tn: "2-bed with covered parking", he: "Puesto techado y maletero en sótano.", hn: "Covered parking spot and basement storage.", ag: "ag-andes", agent: "u-agent", pub: 45 * H, upd: 5 * H, street: "Calle Páez, Res. Los Cedros, piso 5", d: [5, 1], st: "UNDER_OFFER" },
  { z: "Sabana Grande", t: "SALE", k: "apartment", b: 3, ba: 2, p: 1, m2: 95, price: 85000, y: 1983, am: ["elevator", "waterTank", "security"], es: { pw: "NONE", tank: 2500 }, te: "3 habitaciones cerca del bulevar", tn: "3-bed near the boulevard", he: "Salón amplio y cocina independiente.", hn: "Spacious living room and separate kitchen.", ag: "ag-night", agent: "u-agent4", pub: 2 * H, upd: 2 * H, street: "Av. Casanova, Edif. Libertador, piso 9", d: [-2, -6], st: "COMING_SOON" },

  // ───────── 8 alquiler largo plazo Caracas
  { z: "Altamira", t: "LONG_RENT", k: "apartment", b: 2, ba: 2, p: 1, m2: 90, price: 1100, y: 2005, am: ["generator", "waterTank", "security", "elevator", "furnished"], es: { pw: "PARTIAL", tank: 5000, avila: true }, te: "Alquiler amoblado de 2 habitaciones", tn: "Furnished 2-bed for rent", he: "Contrato mínimo 12 meses. Incluye condominio.", hn: "12-month minimum lease. HOA fees included.", ag: "ag-andes", agent: "u-agent", pub: 8 * H, upd: 12, street: "Av. Luis Roche, Res. Roche Plaza, piso 6", d: [2, 3] },
  { z: "Los Palos Grandes", t: "LONG_RENT", k: "apartment", b: 3, ba: 2, p: 2, m2: 135, price: 1800, y: 2002, am: ["pool", "gym", "generator", "waterTank", "security", "pets"], es: { pw: "PARTIAL", tank: 8000, avila: true }, te: "3 habitaciones pet friendly", tn: "Pet-friendly 3-bed", he: "Se aceptan mascotas. Parque Los Palos Grandes a una cuadra.", hn: "Pets welcome. Los Palos Grandes park one block away.", ag: "ag-andes", agent: "u-agent2", pub: 3 * D, upd: 1 * D, street: "4ta Transversal, Res. Parque Real, piso 3", d: [-1, 7] },
  { z: "La Castellana", t: "LONG_RENT", k: "studio", b: 1, ba: 1, p: 1, m2: 52, price: 750, y: 2014, am: ["furnished", "wifi", "ac", "security", "generator"], es: { pw: "PARTIAL" }, te: "Estudio ejecutivo con servicios", tn: "Executive studio, all bills in", he: "Internet de fibra y aire acondicionado incluidos.", hn: "Fibre internet and A/C included.", ag: "ag-night", agent: "u-agent3", pub: 22 * H, upd: 4 * H, street: "Calle La Guairita, Res. Castellana 21", d: [-3, 2] },
  { z: "Las Mercedes", t: "LONG_RENT", k: "apartment", b: 2, ba: 2, p: 2, m2: 100, price: 1300, y: 2016, am: ["pool", "gym", "security", "generator", "elevator"], es: { pw: "FULL" }, te: "2 habitaciones con piscina", tn: "2-bed with pool", he: "Edificio con piscina y gimnasio.", hn: "Building with pool and gym.", ag: "ag-night", agent: "u-agent4", pub: 12 * D, upd: 2 * D, street: "Calle Orinoco, Res. Mercedes Suites, piso 10", d: [1, -4] },
  { z: "Chacao", t: "LONG_RENT", k: "studio", b: 1, ba: 1, p: 0, m2: 38, price: 520, y: 1995, am: ["furnished", "wifi"], es: {}, te: "Estudio compacto junto al metro", tn: "Compact studio by the metro", he: "Perfecto para estudiante o profesional joven.", hn: "Ideal for a student or young professional.", ag: "ag-andes", agent: "u-agent", pub: 6 * D, upd: 3 * D, street: "Av. Tamanaco, Edif. Centro Chacao, piso 2", d: [-2, 4] },
  { z: "El Hatillo", t: "LONG_RENT", k: "house", b: 4, ba: 3, p: 3, m2: 280, price: 2400, y: 1999, am: ["garden", "pets", "bbq", "security", "waterTank"], es: { pw: "NONE", well: true, tank: 15000 }, te: "Casa en alquiler con jardín", tn: "House for rent with garden", he: "Jardín grande, acepta mascotas.", hn: "Large garden, pets allowed.", owner: "u-priv", pub: 9 * D, upd: 5 * D, street: "Urb. Oripoto, Calle 3", d: [15, 8] },
  { z: "Sabana Grande", t: "LONG_RENT", k: "apartment", b: 2, ba: 1, p: 0, m2: 68, price: 480, y: 1980, am: ["elevator", "waterTank"], es: { pw: "NONE", tank: 2000 }, te: "2 habitaciones céntrico", tn: "Central 2-bed", he: "Transporte en la puerta.", hn: "Transit at your doorstep.", ag: "ag-night", agent: "u-agent3", pub: 40 * D, upd: 20 * D, street: "Calle Lima, Edif. Santa Ana, piso 4", d: [4, 2], st: "RENTED" },
  { z: "La Boyera", t: "LONG_RENT", k: "townhouse", b: 3, ba: 3, p: 2, m2: 170, price: 1200, y: 2007, am: ["security", "garden", "pets"], es: {}, te: "Townhouse en conjunto cerrado", tn: "Townhouse in a gated community", he: "Conjunto con vigilancia y parque infantil.", hn: "Gated with security and a playground.", ag: "ag-andes", agent: "u-agent2", pub: 18 * D, upd: 6 * D, street: "Conj. Villa Boyera, TH 3", d: [-5, 2] },

  // ───────── 6 alquiler vacacional
  { z: "Lechería", t: "SHORT_RENT", k: "apartment", b: 2, ba: 2, p: 1, m2: 85, price: 95, y: 2012, am: ["pool", "ac", "wifi", "view", "furnished"], es: { pw: "PARTIAL", tank: 3000, sea: true }, te: "Frente al mar en El Morro", tn: "Seafront apartment in El Morro", he: "Vista al mar, piscina y acceso a la playa.", hn: "Sea view, pool and beach access.", ag: "ag-night", agent: "u-agent3", pub: 10 * H, upd: 30, street: "Av. Principal de El Morro, Res. Marina Bay", d: [0, 0], sr: { minNights: 2, maxGuests: 5, cleaningFee: 25 } },
  { z: "Pampatar", t: "SHORT_RENT", k: "villa", b: 3, ba: 3, p: 2, m2: 210, price: 180, y: 2010, am: ["pool", "ac", "wifi", "bbq", "garden", "furnished"], es: { well: true, tank: 10000 }, te: "Villa con piscina privada en Pampatar", tn: "Villa with private pool in Pampatar", he: "Piscina privada a 5 minutos de la playa.", hn: "Private pool, 5 minutes from the beach.", ag: "ag-night", agent: "u-agent4", pub: 4 * D, upd: 1 * D, street: "Urb. Jorge Coll, Calle El Faro", d: [0, 0], sr: { minNights: 3, maxGuests: 8, cleaningFee: 40 } },
  { z: "Mérida", t: "SHORT_RENT", k: "chalet", b: 2, ba: 1, p: 1, m2: 90, price: 70, y: 2004, am: ["view", "wifi", "furnished", "garden", "pets"], es: { pw: "NONE" }, te: "Chalet de montaña con chimenea", tn: "Mountain chalet with fireplace", he: "Chimenea, vista a la Sierra Nevada y jardín.", hn: "Fireplace, Sierra Nevada views and garden.", owner: "u-priv", pub: 7 * D, upd: 2 * D, street: "Vía Los Nevados, sector La Mucuy", d: [0, 0], sr: { minNights: 2, maxGuests: 4, cleaningFee: 15 } },
  { z: "Los Roques", t: "SHORT_RENT", k: "house", b: 4, ba: 4, p: 0, m2: 160, price: 220, y: 2000, am: ["ac", "wifi", "view", "furnished"], es: { tank: 5000, sea: true }, te: "Posada en Gran Roque (demo)", tn: "Guesthouse on Gran Roque (demo)", he: "Listing de demostración. Desayuno opcional.", hn: "Demo listing. Breakfast optional.", ag: "ag-night", agent: "u-agent3", pub: 15 * D, upd: 7 * D, street: "Gran Roque, Calle La Plaza", d: [0, 0], sr: { minNights: 3, maxGuests: 8, cleaningFee: 50 } },
  { z: "Choroní", t: "SHORT_RENT", k: "house", b: 3, ba: 2, p: 1, m2: 140, price: 110, y: 1990, am: ["garden", "wifi", "bbq", "furnished"], es: { pw: "NONE", well: true }, te: "Casa colonial a 5 min de Playa Grande", tn: "Colonial house 5 min from Playa Grande", he: "Patio central y hamacas.", hn: "Central courtyard with hammocks.", ag: "ag-andes", agent: "u-agent2", pub: 12 * D, upd: 5 * D, street: "Puerto Colombia, Calle Morillo", d: [0, 0], sr: { minNights: 2, maxGuests: 7, cleaningFee: 20 } },
  { z: "Altamira", t: "SHORT_RENT", k: "studio", b: 1, ba: 1, p: 1, m2: 45, price: 65, y: 2014, am: ["ac", "wifi", "furnished", "gym", "security"], es: { pw: "PARTIAL", avila: true }, te: "Loft para estancias cortas en Altamira", tn: "Short-stay loft in Altamira", he: "Check-in autónomo y fibra óptica.", hn: "Self check-in and fibre internet.", ag: "ag-andes", agent: "u-agent", pub: 5 * H, upd: 45, street: "Av. Sur Altamira, Res. Loft 7", d: [-6, 5], sr: { minNights: 1, maxGuests: 2, cleaningFee: 12 } },

  // ───────── 8 comercial
  { z: "Las Mercedes", t: "COMMERCIAL_SALE", k: "office", b: 0, ba: 2, p: 3, m2: 120, price: 190000, y: 2010, am: ["ac", "generator", "security", "elevator"], es: { pw: "FULL" }, te: "Oficina con recepción y sala de juntas", tn: "Office with reception and boardroom", he: "Planta eléctrica y 3 puestos.", hn: "Backup generator and 3 parking spots.", ag: "ag-orinoco", agent: "u-agent6", pub: 20 * D, upd: 4 * D, street: "Av. Principal de Las Mercedes, Torre Nova, piso 12", d: [2, 2], com: { ceilingHeight: 2.8, loadingDock: false, zoning: "C-3 Comercial", capRate: 7.5 } },
  { z: "Las Mercedes", t: "COMMERCIAL_RENT", k: "retail", b: 0, ba: 1, p: 2, m2: 140, price: 2800, y: 2012, am: ["ac", "security"], es: { pw: "NONE" }, te: "Local a pie de calle en el bulevar", tn: "Street-level retail on the boulevard", he: "Doble fachada de vidrio, alto tránsito peatonal.", hn: "Double glass frontage, heavy foot traffic.", ag: "ag-night", agent: "u-agent4", pub: 30 * H, upd: 6 * H, street: "Calle Veracruz con Calle Madrid, Local PB-3", d: [-2, 3], com: { ceilingHeight: 4.2, loadingDock: false, zoning: "C-2 Comercial" } },
  { z: "La Trinidad", t: "COMMERCIAL_RENT", k: "warehouse", b: 0, ba: 2, p: 6, m2: 900, price: 4500, y: 1998, am: ["loadingDock", "security"], es: {}, te: "Galpón con andén de carga", tn: "Warehouse with loading dock", he: "Altura libre 9 m y andén para 2 camiones.", hn: "9 m clear height, dock for 2 trucks.", ag: "ag-orinoco", agent: "u-agent6", pub: 10 * D, upd: 3 * D, street: "Calle Hans Neumann, Galpón 14", d: [2, -3], com: { ceilingHeight: 9, loadingDock: true, zoning: "I-1 Industrial liviana" } },
  { z: "La Trinidad", t: "COMMERCIAL_SALE", k: "warehouse", b: 0, ba: 2, p: 10, m2: 1300, price: 620000, y: 2003, am: ["loadingDock", "security", "generator"], es: { pw: "FULL" }, te: "Galpón en venta con oficinas", tn: "Warehouse for sale with offices", he: "Incluye 180 m² de oficinas en mezzanina.", hn: "Includes 180 m² mezzanine offices.", ag: "ag-orinoco", agent: "u-agent7", pub: 44 * D, upd: 10 * D, street: "Av. Principal de La Trinidad, Galpón Norte", d: [-3, 2], drop: 8, com: { ceilingHeight: 10, loadingDock: true, zoning: "I-1 Industrial liviana", capRate: 8.9 } },
  { z: "Zona Industrial Sur", t: "COMMERCIAL_SALE", k: "warehouse", b: 0, ba: 3, p: 12, m2: 1500, price: 750000, y: 2007, am: ["loadingDock", "security", "generator"], es: { pw: "FULL", well: true }, te: "Nave industrial de 1.500 m²", tn: "1,500 m² industrial unit", he: "Acceso directo a la Autopista Regional del Centro.", hn: "Direct access to the Autopista Regional del Centro.", ag: "ag-orinoco", agent: "u-agent6", pub: 28 * D, upd: 9 * D, street: "Av. Henry Ford, Parcela 22", d: [0, 0], com: { ceilingHeight: 11, loadingDock: true, zoning: "I-2 Industrial", capRate: 9.4 } },
  { z: "El Viñedo", t: "COMMERCIAL_RENT", k: "office", b: 0, ba: 1, p: 2, m2: 95, price: 1600, y: 2015, am: ["ac", "security", "elevator"], es: { pw: "NONE" }, te: "Oficina amoblada en El Viñedo", tn: "Furnished office in El Viñedo", he: "Lista para operar: 8 puestos de trabajo.", hn: "Move-in ready: 8 workstations.", ag: "ag-orinoco", agent: "u-agent7", pub: 5 * D, upd: 1 * D, street: "Av. Bolívar Norte, Torre Stratos, piso 6", d: [3, 3], com: { ceilingHeight: 2.7, loadingDock: false, zoning: "C-3 Comercial" } },
  { z: "Las Mercedes", t: "COMMERCIAL_SALE", k: "retail", b: 0, ba: 2, p: 4, m2: 220, price: 340000, y: 2009, am: ["ac", "security", "generator"], es: { pw: "PARTIAL" }, te: "Local esquina con inquilino", tn: "Corner retail with tenant in place", he: "Arrendado a restaurante hasta 2028.", hn: "Leased to a restaurant until 2028.", ag: "ag-night", agent: "u-agent4", pub: 60 * D, upd: 15 * D, street: "Calle Trinidad, Local Esquina", d: [4, -2], com: { ceilingHeight: 4.5, loadingDock: false, zoning: "C-2 Comercial", capRate: 8.2 } },
  { z: "El Viñedo", t: "COMMERCIAL_RENT", k: "retail", b: 0, ba: 1, p: 1, m2: 60, price: 1100, y: 2011, am: ["ac"], es: { pw: "FULL" }, te: "Local en centro comercial", tn: "Mall retail unit", he: "Nivel feria, alta afluencia.", hn: "Food-court level, high footfall.", ag: "ag-orinoco", agent: "u-agent6", pub: 16 * D, upd: 8 * D, street: "C.C. Viñedo Plaza, Local F-12", d: [-2, -2], com: { ceilingHeight: 3.5, loadingDock: false, zoning: "C-2 Comercial" } },

  // ───────── 6 lujo
  { z: "Lomas de San Román", t: "SALE", k: "house", b: 6, ba: 7, p: 6, m2: 850, plot: 1600, price: 1450000, y: 2016, am: ["pool", "gym", "view", "garden", "security", "generator", "waterTank", "bbq", "terrace"], es: { pw: "FULL", well: true, tank: 30000, avila: true }, te: "Residencia contemporánea con vista a la ciudad", tn: "Contemporary residence with city views", he: "Piscina infinita, cine privado y vista 180° de Caracas.", hn: "Infinity pool, private cinema and 180° views over Caracas.", ag: "ag-night", agent: "u-agent3", pub: 8 * D, upd: 1 * D, lux: true, street: "Calle Las Lomas, Quinta Horizonte", d: [3, 4], vt: true },
  { z: "Country Club", t: "SALE", k: "house", b: 5, ba: 6, p: 5, m2: 1100, plot: 2400, price: 2300000, y: 1958, am: ["pool", "garden", "security", "generator", "waterTank", "terrace"], es: { pw: "FULL", well: true, tank: 25000, avila: true }, te: "Quinta clásica frente al campo de golf", tn: "Classic estate facing the golf course", he: "Arquitectura de los 50 restaurada, 2.400 m² de terreno.", hn: "Restored 1950s architecture on 2,400 m² of land.", ag: "ag-night", agent: "u-agent4", pub: 50 * D, upd: 6 * D, lux: true, street: "Av. Los Pinos, Quinta Mirasol", d: [2, 2] },
  { z: "Country Club", t: "SALE", k: "house", b: 4, ba: 5, p: 4, m2: 620, plot: 1100, price: 1250000, y: 2004, am: ["pool", "garden", "security", "generator", "gym"], es: { pw: "FULL", well: true }, te: "Casa privada — solo con enlace", tn: "Private home — link only", he: "Publicación privada. Visitas solo con precalificación.", hn: "Private listing. Viewings for pre-qualified buyers only.", ag: "ag-night", agent: "u-agent3", pub: 12 * D, upd: 2 * D, lux: true, priv: true, street: "Calle Chivacoa, Quinta Los Robles", d: [-3, -2] },
  { z: "Los Palos Grandes", t: "SALE", k: "penthouse", b: 4, ba: 5, p: 4, m2: 380, price: 890000, y: 2019, am: ["pool", "gym", "view", "terrace", "security", "generator", "waterTank", "elevator"], es: { pw: "FULL", tank: 15000, avila: true }, te: "Penthouse dúplex con piscina en terraza", tn: "Duplex penthouse with rooftop pool", he: "Piscina privada en terraza y ascensor directo.", hn: "Private rooftop pool and direct elevator access.", ag: "ag-andes", agent: "u-agent", pub: 3 * D, upd: 5 * H, lux: true, street: "Av. Francisco de Miranda, Torre Ávila Sky, PH", d: [6, -3], vt: true },
  { z: "Lomas de San Román", t: "SALE", k: "house", b: 5, ba: 5, p: 4, m2: 700, plot: 1300, price: 1100000, y: 2011, am: ["pool", "garden", "view", "security", "generator", "bbq"], es: { pw: "FULL", well: true, avila: true }, te: "Casa de autor entre jardines", tn: "Architect-designed home among gardens", he: "Diseño de autor, doble altura y jardín tropical.", hn: "Architect-designed, double-height living and tropical garden.", ag: "ag-andes", agent: "u-agent2", pub: 25 * D, upd: 4 * D, lux: true, street: "Calle El Mirador, Quinta Aura", d: [-4, -2], drop: 5 },
  { z: "Playa El Agua", t: "SALE", k: "villa", b: 5, ba: 5, p: 3, m2: 520, plot: 900, price: 980000, y: 2017, am: ["pool", "view", "garden", "ac", "security", "bbq"], es: { pw: "FULL", well: true, tank: 20000, sea: true }, te: "Villa frente al mar en Playa El Agua", tn: "Beachfront villa at Playa El Agua", he: "Acceso directo a la playa y piscina desbordante.", hn: "Direct beach access and overflow pool.", ag: "ag-night", agent: "u-agent3", pub: 18 * D, upd: 3 * D, lux: true, street: "Calle Miragua, Villa Coral", d: [0, 0] },

  // ───────── 4 otras ciudades / terreno
  { z: "Tierra Negra", t: "SALE", k: "apartment", b: 3, ba: 2, p: 2, m2: 120, price: 78000, y: 2003, am: ["pool", "ac", "security", "generator"], es: { pw: "PARTIAL" }, te: "3 habitaciones con A/A central en Maracaibo", tn: "3-bed with central A/C in Maracaibo", he: "Aire acondicionado central y planta eléctrica.", hn: "Central A/C and backup generator.", ag: "ag-orinoco", agent: "u-agent6", pub: 13 * D, upd: 3 * D, street: "Calle 72 con Av. 3H, Res. Lago Mar, piso 7", d: [0, 0] },
  { z: "Del Este", t: "SALE", k: "house", b: 4, ba: 3, p: 2, m2: 240, plot: 400, price: 110000, y: 1995, am: ["garden", "security", "waterTank"], es: { pw: "NONE", well: true, tank: 6000 }, te: "Casa amplia en Barquisimeto Este", tn: "Spacious house in east Barquisimeto", he: "Terreno de 400 m² con árboles frutales.", hn: "400 m² plot with fruit trees.", owner: "u-priv", pub: 19 * D, upd: 11 * D, street: "Urb. Santa Elena, Calle 4", d: [0, 0] },
  { z: "Mérida", t: "SALE", k: "land", b: 0, ba: 0, p: 0, m2: 2400, plot: 2400, price: 85000, y: 2026, am: ["view"], es: {}, te: "Terreno con vista a la Sierra Nevada", tn: "Plot with Sierra Nevada views", he: "Uso residencial, servicios en la vía.", hn: "Residential zoning, utilities at the road.", ag: "ag-andes", agent: "u-agent2", pub: 33 * D, upd: 12 * D, street: "Vía La Culata, Km 6", d: [30, 40] },
  { z: "El Viñedo", t: "SALE", k: "apartment", b: 3, ba: 2, p: 2, m2: 135, price: 98000, y: 2008, am: ["pool", "security", "generator", "elevator"], es: { pw: "PARTIAL" }, te: "Apartamento familiar en El Viñedo", tn: "Family apartment in El Viñedo", he: "Cerca de colegios y centros comerciales.", hn: "Close to schools and malls.", ag: "ag-orinoco", agent: "u-agent7", pub: 7 * D, upd: 2 * D, street: "Av. Monseñor Adams, Res. Las Viñas, piso 4", d: [-3, 4], st: "SOLD" },

  // ───────── 14 oriente, Margarita y Valencia (zonas nuevas: 2 por zona)
  { z: "Cerro El Morro", t: "SALE", k: "penthouse", b: 4, ba: 5, p: 3, m2: 340, price: 690000, y: 2015, am: ["pool", "view", "terrace", "security", "generator", "waterTank", "elevator", "ac"], es: { pw: "FULL", tank: 15000, sea: true }, te: "Penthouse en el Cerro El Morro con vista 360° al mar", tn: "Cerro El Morro penthouse with 360° sea views", he: "Terraza envolvente sobre la bahía de Pozuelos y planta eléctrica para todo el edificio.", hn: "Wraparound terrace over Pozuelos Bay and a full-building generator.", ag: "ag-night", agent: "u-agent3", pub: 3 * D, upd: 8 * H, lux: true, vt: true, street: "Cerro El Morro, Res. Mirador del Morro, PH", d: [0, 0] },
  { z: "Cerro El Morro", t: "LONG_RENT", k: "apartment", b: 3, ba: 3, p: 2, m2: 160, price: 1600, y: 2010, am: ["pool", "view", "security", "generator", "waterTank", "elevator", "ac"], es: { pw: "PARTIAL", tank: 5000, sea: true }, te: "3 habitaciones con balcón al mar en El Morro", tn: "3-bed with sea-facing balcony in El Morro", he: "Balcón corrido frente al mar y piscina en el conjunto.", hn: "Full-width balcony facing the sea and a community pool.", ag: "ag-andes", agent: "u-agent2", pub: 26 * H, upd: 5 * H, street: "Cerro El Morro, Res. Vista Mar, piso 7", d: [-8, 9] },
  { z: "Canales de El Morro", t: "SALE", k: "villa", b: 5, ba: 6, p: 4, m2: 520, plot: 800, price: 1150000, y: 2018, am: ["pool", "view", "garden", "terrace", "security", "generator", "waterTank", "ac", "bbq"], es: { pw: "FULL", tank: 20000, dock: 60, sea: true }, te: "Villa sobre el canal con muelle de 60 pies", tn: "Canal-front villa with a 60 ft private dock", he: "Muelle propio con salida directa al mar, piscina y planta eléctrica 100 %.", hn: "Private dock with direct sea access, pool and a 100% backup generator.", ag: "ag-night", agent: "u-agent4", pub: 6 * D, upd: 1 * D, lux: true, vt: true, street: "Canales de El Morro, Isla Paraíso, Villa Marea", d: [0, 0] },
  { z: "Canales de El Morro", t: "SALE", k: "townhouse", b: 3, ba: 3, p: 2, m2: 210, plot: 260, price: 295000, y: 2006, am: ["pool", "terrace", "security", "generator", "waterTank", "ac"], es: { pw: "PARTIAL", tank: 8000, dock: 32 }, te: "Townhouse en los canales con muelle para lancha", tn: "Canal townhouse with a boat dock", he: "Muelle de 32 pies frente a la terraza y piscina comunal.", hn: "32 ft dock right off the terrace, plus a shared pool.", ag: "ag-andes", agent: "u-agent", pub: 11 * D, upd: 2 * D, street: "Canales de El Morro, Conj. Puerto Viejo, TH 14", d: [7, -6], drop: 6 },
  { z: "Av. Américo Vespucio", t: "SALE", k: "apartment", b: 2, ba: 2, p: 1, m2: 95, price: 118000, y: 2008, am: ["pool", "view", "security", "generator", "waterTank", "elevator"], es: { pw: "PARTIAL", tank: 4000, sea: true }, te: "Apartamento frente a la playa en la Américo Vespucio", tn: "Beachfront apartment on Américo Vespucio", he: "Cruzas la avenida y estás en la playa de Lechería.", hn: "Cross the avenue and you’re on Lechería beach.", ag: "ag-andes", agent: "u-agent5", pub: 2 * D, upd: 14 * H, street: "Av. Américo Vespucio, Res. Playa Lido, piso 5", d: [0, 0] },
  { z: "Av. Américo Vespucio", t: "SHORT_RENT", k: "apartment", b: 2, ba: 2, p: 1, m2: 88, price: 85, y: 2013, am: ["pool", "view", "ac", "wifi", "furnished", "generator", "waterTank"], es: { pw: "FULL", tank: 5000, sea: true }, te: "Vacacional con vista al mar en Lechería", tn: "Sea-view holiday apartment in Lechería", he: "Planta eléctrica total: el aire nunca se apaga.", hn: "Full backup power: the A/C never goes off.", ag: "ag-night", agent: "u-agent3", pub: 9 * H, upd: 2 * H, street: "Av. Américo Vespucio, Res. Costa Real, piso 9", d: [9, -5], sr: { minNights: 2, maxGuests: 5, cleaningFee: 30 } },
  { z: "Barcelona", t: "SALE", k: "house", b: 4, ba: 3, p: 2, m2: 230, plot: 350, price: 98000, y: 1998, am: ["garden", "security", "waterTank", "bbq"], es: { pw: "NONE", well: true, tank: 10000 }, te: "Casa con pozo propio en Barcelona", tn: "House with its own well in Barcelona", he: "Pozo de agua propio, tanque de 10.000 L y patio con parrillera.", hn: "Private water well, 10,000 L tank and a patio with BBQ.", ag: "ag-andes", agent: "u-agent2", pub: 15 * D, upd: 4 * D, street: "Urb. Las Garzas, Calle 4, Casa 22", d: [0, 0] },
  { z: "Barcelona", t: "LONG_RENT", k: "apartment", b: 3, ba: 2, p: 1, m2: 105, price: 450, y: 2005, am: ["security", "generator", "waterTank", "elevator"], es: { pw: "PARTIAL", tank: 3000 }, te: "3 habitaciones en alquiler cerca del centro", tn: "3-bed for rent near the city centre", he: "A minutos de la Av. Intercomunal y centros comerciales.", hn: "Minutes from Av. Intercomunal and shopping centres.", ag: "ag-orinoco", agent: "u-agent6", pub: 5 * D, upd: 1 * D, street: "Av. 5 de Julio, Res. Neverí, piso 3", d: [10, 12] },
  { z: "Puerto La Cruz · Paseo Colón", t: "SALE", k: "apartment", b: 3, ba: 2, p: 2, m2: 125, price: 115000, y: 2009, am: ["pool", "view", "security", "generator", "waterTank", "elevator"], es: { pw: "PARTIAL", tank: 6000, sea: true }, te: "Apartamento con vista a la bahía en el Paseo Colón", tn: "Bay-view apartment on Paseo Colón", he: "Atardeceres sobre la bahía de Pozuelos desde la sala.", hn: "Sunsets over Pozuelos Bay from the living room.", ag: "ag-night", agent: "u-agent4", pub: 4 * D, upd: 20 * H, street: "Paseo Colón, Edif. Bahía Azul, piso 10", d: [0, 0] },
  { z: "Puerto La Cruz · Paseo Colón", t: "COMMERCIAL_RENT", k: "retail", b: 0, ba: 1, p: 1, m2: 80, price: 1200, y: 2001, am: ["ac", "security"], es: { pw: "NONE" }, te: "Local frente al Paseo Colón", tn: "Retail unit facing Paseo Colón", he: "Fachada al malecón con alto tránsito turístico.", hn: "Seafront frontage with heavy tourist footfall.", ag: "ag-orinoco", agent: "u-agent6", pub: 21 * D, upd: 6 * D, street: "Paseo Colón, C.C. Paseo Mar, local 3", d: [-6, 14], com: { ceilingHeight: 4, loadingDock: false, zoning: "C-2 Comercial" } },
  { z: "Costa Azul", t: "SALE", k: "apartment", b: 3, ba: 2, p: 2, m2: 140, price: 135000, y: 2011, am: ["pool", "view", "security", "generator", "waterTank", "elevator", "ac"], es: { pw: "FULL", tank: 10000, sea: true }, te: "Apartamento en Costa Azul con vista al mar", tn: "Costa Azul apartment with sea views", he: "Planta eléctrica 100 % y tanque de 10.000 L: clave en la isla.", hn: "100% backup power and a 10,000 L tank: key on the island.", ag: "ag-night", agent: "u-agent3", pub: 7 * D, upd: 2 * D, street: "Av. Bolívar, Res. Costa Azul Suites, piso 8", d: [0, 0] },
  { z: "Costa Azul", t: "SHORT_RENT", k: "townhouse", b: 3, ba: 3, p: 2, m2: 170, price: 140, y: 2014, am: ["pool", "ac", "wifi", "furnished", "bbq", "generator", "waterTank"], es: { pw: "PARTIAL", well: true, tank: 15000 }, te: "Townhouse vacacional con pozo propio en Costa Azul", tn: "Holiday townhouse with its own well in Costa Azul", he: "Pozo propio y piscina comunal a dos cuadras del mar.", hn: "Private well and shared pool two blocks from the sea.", ag: "ag-night", agent: "u-agent4", pub: 30 * H, upd: 6 * H, street: "Calle Los Uveros, Conj. Brisas de Costa Azul, TH 6", d: [-9, 11], sr: { minNights: 3, maxGuests: 6, cleaningFee: 45 } },
  { z: "El Trigaleño", t: "SALE", k: "house", b: 5, ba: 4, p: 4, m2: 420, plot: 900, price: 320000, y: 2003, am: ["pool", "garden", "security", "generator", "waterTank", "bbq"], es: { pw: "FULL", well: true, tank: 20000 }, te: "Quinta con piscina y pozo en El Trigaleño", tn: "Family home with pool and well in El Trigaleño", he: "Planta eléctrica 100 %, pozo propio y tanque de 20.000 L.", hn: "100% backup generator, private well and a 20,000 L tank.", ag: "ag-orinoco", agent: "u-agent6", pub: 10 * D, upd: 3 * D, street: "Urb. El Trigaleño, Calle 137, Quinta Los Samanes", d: [0, 0] },
  { z: "El Trigaleño", t: "LONG_RENT", k: "apartment", b: 3, ba: 2, p: 2, m2: 130, price: 900, y: 2012, am: ["pool", "security", "generator", "waterTank", "elevator", "pets"], es: { pw: "PARTIAL", tank: 5000 }, te: "3 habitaciones pet friendly en El Trigaleño", tn: "Pet-friendly 3-bed in El Trigaleño", he: "Conjunto con piscina, cerca de la Av. Bolívar Norte.", hn: "Gated complex with pool, close to Av. Bolívar Norte.", ag: "ag-andes", agent: "u-agent", pub: 3 * D, upd: 10 * H, street: "Av. 137, Res. Trigal Plaza, piso 4", d: [8, -10] },

];

const SLUG_ZONE = (z: string) =>
  z.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seafront zones whose apartments open on the beach scene. */
const COASTAL = ["Cerro El Morro", "Av. Américo Vespucio", "Puerto La Cruz · Paseo Colón", "Costa Azul"];

function scenesFor(s: Seed): Scene[] {
  if (s.k === "land") return ["land", "chalet", "land"];
  if (s.k === "warehouse") return ["warehouse", "office", "warehouse", "lobby"];
  if (s.k === "office") return ["office", "lobby", "office", "tower-day", "kitchen"];
  if (s.k === "retail") return ["retail", "tower-day", "retail", "office"];
  if (s.k === "villa" && s.z === "Playa El Agua") return ["beach", "villa-pool", "living", "bedroom", "terrace", "kitchen", "bath", "beach", "living", "bedroom"];
  if (s.k === "villa") return ["villa-pool", "living", "bedroom", "kitchen", "terrace", "bath", "bedroom", "beach"];
  if (s.k === "chalet") return ["chalet", "living", "bedroom", "kitchen", "terrace", "bath"];
  if (s.z === "Lechería" || s.z === "Los Roques" || (COASTAL.includes(s.z) && (s.k === "apartment" || s.k === "studio"))) return ["beach", "living", "bedroom", "terrace", "kitchen", "bath"];
  if (s.k === "house" || s.k === "townhouse")
    return s.lux
      ? ["villa-pool", "house-dusk", "living", "kitchen", "bedroom", "terrace", "bath", "living", "bedroom", "lobby"]
      : ["house-dusk", "living", "kitchen", "bedroom", "terrace", "bath", "bedroom", "living"];
  if (s.k === "penthouse") return ["terrace", "tower-dusk", "living", "kitchen", "bedroom", "bath", "terrace", "living", "bedroom", "lobby"];
  const h = hash(s.street);
  const tower: Scene = h % 2 ? "tower-dusk" : "tower-day";
  const rest: Scene[] = ["kitchen", "bedroom", "bath", "bedroom", "lobby", "terrace", "living"];
  return h % 3 === 0 ? ["living", tower, ...rest] : h % 3 === 1 ? [tower, "living", ...rest] : ["bedroom", "living", tower, "kitchen", "bath", "lobby", "terrace", "bedroom"];
}

function categoryFor(s: Seed): Listing["category"] {
  if (s.lux) return "LUXURY";
  if (s.k === "land") return "LAND";
  if (s.t.startsWith("COMMERCIAL")) return "COMMERCIAL";
  return "RESIDENTIAL";
}

const KIND_ES: Record<Kind, string> = { apartment: "Apartamento", penthouse: "Penthouse", house: "Casa", townhouse: "Townhouse", studio: "Estudio", office: "Oficina", retail: "Local comercial", warehouse: "Galpón", land: "Terreno", villa: "Villa", chalet: "Chalet" };
const KIND_EN: Record<Kind, string> = { apartment: "Apartment", penthouse: "Penthouse", house: "House", townhouse: "Townhouse", studio: "Studio", office: "Office", retail: "Retail unit", warehouse: "Warehouse", land: "Plot", villa: "Villa", chalet: "Chalet" };

function bodies(s: Seed) {
  const zone = zoneByName(s.z);
  const es: string[] = [];
  const en: string[] = [];
  if (s.k === "land") {
    es.push(`Terreno de ${s.m2.toLocaleString("es-VE")} m² en ${zone.city}.`, s.he, "Documentación registrada y linderos levantados.");
    en.push(`${s.m2.toLocaleString("en-US")} m² plot in ${zone.city}.`, s.hn, "Registered title and surveyed boundaries.");
  } else if (s.t.startsWith("COMMERCIAL")) {
    es.push(`${KIND_ES[s.k]} de ${s.m2} m² en ${s.z}, ${zone.city}.`, s.he, `${s.p} puestos de estacionamiento. Zonificación ${s.com?.zoning}.`);
    en.push(`${s.m2} m² ${KIND_EN[s.k].toLowerCase()} in ${s.z}, ${zone.city}.`, s.hn, `${s.p} parking spaces. Zoning ${s.com?.zoning}.`);
  } else {
    es.push(
      `${KIND_ES[s.k]} de ${s.m2} m² en ${s.z}, ${zone.city}: ${s.b} habitaciones, ${s.ba} baños y ${s.p} puesto${s.p === 1 ? "" : "s"}.`,
      s.he,
      s.t === "SHORT_RENT"
        ? `Estancia mínima de ${s.sr?.minNights} noches, hasta ${s.sr?.maxGuests} huéspedes.`
        : s.y < 2026
          ? `Construido en ${s.y}. Documentos al día y listo para visitar.`
          : "",
    );
    en.push(
      `${s.m2} m² ${KIND_EN[s.k].toLowerCase()} in ${s.z}, ${zone.city}: ${s.b} bedrooms, ${s.ba} bathrooms and ${s.p} parking space${s.p === 1 ? "" : "s"}.`,
      s.hn,
      s.t === "SHORT_RENT" ? `Minimum stay ${s.sr?.minNights} nights, up to ${s.sr?.maxGuests} guests.` : `Built in ${s.y}. Paperwork in order, ready to view.`,
    );
  }
  return { body_es: es.filter(Boolean).join(" "), body_en: en.filter(Boolean).join(" ") };
}

function priceHistory(s: Seed, publishedAt: string, updatedAt: string): PriceEvent[] {
  if (!s.drop) {
    const ev: PriceEvent[] = [{ date: publishedAt, amount: s.price, kind: "LISTED" }];
    if (s.st === "UNDER_OFFER") ev.push({ date: updatedAt, amount: s.price, kind: "UNDER_OFFER" });
    if (s.st === "SOLD") ev.push({ date: updatedAt, amount: s.price, kind: "SOLD" });
    return ev;
  }
  const original = Math.round(s.price / (1 - s.drop / 100) / 1000) * 1000;
  const mid = new Date((new Date(publishedAt).getTime() + new Date(updatedAt).getTime()) / 2).toISOString();
  return [
    { date: publishedAt, amount: original, kind: "LISTED" },
    { date: mid, amount: s.price, kind: "DROP" },
  ];
}

function build(): Listing[] {
  const base = SEEDS.map((s, i) => {
    const zone = zoneByName(s.z);
    const r = rng(hash(s.street));
    const id = (hash(s.street + i).toString(36) + "xxxxxx").slice(0, 6);
    const lat = zone.lat + s.d[0] / 1e4;
    const lng = zone.lng + s.d[1] / 1e4;
    const publishedAt = minutesAgo(s.pub);
    const updatedAt = minutesAgo(s.upd);
    const slug = s.b > 0 ? `${SLUG_ZONE(s.z)}-${s.b}h-${s.m2}m-${id}` : `${SLUG_ZONE(s.z)}-${s.k}-${s.m2}m-${id}`;
    const scenes = scenesFor(s);
    const quality = Math.min(
      100,
      (scenes.length >= 8 ? 35 : scenes.length * 4) + 20 /* bilingual */ + 20 /* geo */ + (s.k === "land" ? 0 : 15) /* floorplan */ + (s.vt ? 10 : 4),
    );
    const listing: Omit<Listing, "estimate"> = {
      id,
      slug,
      title_es: s.te,
      title_en: s.tn,
      ...bodies(s),
      address: s.street,
      zone: s.z,
      city: zone.city,
      state: zone.state,
      countryCode: "VE",
      lat,
      lng,
      kind: s.k,
      listingType: s.t,
      category: categoryFor(s),
      luxury: !!s.lux,
      furnished: s.am.includes("furnished") || s.t === "SHORT_RENT",
      pets: s.am.includes("pets"),
      priceAmount: s.price,
      priceCurrency: "USD",
      pricePeriod: s.t === "SHORT_RENT" ? "night" : s.t === "LONG_RENT" || s.t === "COMMERCIAL_RENT" ? "month" : undefined,
      areaM2: s.m2,
      plotM2: s.plot,
      beds: s.b,
      baths: s.ba,
      parking: s.p,
      yearBuilt: s.y,
      amenities: s.am,
      powerBackup: s.es.pw ?? null,
      ownWell: !!s.es.well,
      waterTankLiters: s.es.tank ?? null,
      dockFeet: s.es.dock ?? null,
      viewAvila: !!s.es.avila,
      viewSea: !!s.es.sea,
      status: s.st ?? "ACTIVE",
      publishedAt,
      updatedAt,
      agencyId: s.ag,
      agentId: s.agent,
      ownerUserId: s.owner,
      scenes,
      hasFloorplan: s.k !== "land",
      hasVideo: !!s.vt || !!s.lux,
      hasVirtualTour: !!s.vt,
      priceHistory: priceHistory(s, publishedAt, updatedAt),
      daysOnMarket: Math.max(0, Math.round(s.pub / 1440)),
      stats: {
        impressions: Math.round(800 + r() * 9000 + (s.lux ? 6000 : 0)),
        saves: Math.round(8 + r() * 140),
        leads: 0, // seed.ts stores the real count of seeded leads (LEADS in ops.ts) as leadsCount
        avgTimeSec: Math.round(45 + r() * 160),
        interactions: Math.round(12 + r() * 9),
      },
      quality,
      privateListing: s.priv,
      shortRent: s.sr,
      commercial: s.com,
      fingerprint: `${lat.toFixed(4)}|${lng.toFixed(4)}|${s.m2}|${hash(s.street).toString(16)}`,
    };
    return listing;
  });

  return base.map((l) => {
    const zone = zoneByName(l.zone);
    const group = (x: typeof l) =>
      x.listingType === "SALE" || x.listingType === "COMMERCIAL_SALE" ? "sale" : x.listingType === "SHORT_RENT" ? "short" : "rent";
    const cls = kindClass(l.kind);
    const ppm = (group(l) === "sale" ? zone.salePpm : group(l) === "short" ? zone.rentPpm * 0.075 : zone.rentPpm) * CLASS_FACTOR[cls];
    const land = cls === "land";
    const pool = base
      .filter((o) => o.id !== l.id && group(o) === group(l) && o.city === l.city && kindClass(o.kind) === cls && (cls !== "residential" || o.luxury === l.luxury))
      .map((o) => ({ id: o.id, title: o.title_es, title_en: o.title_en, zone: o.zone, areaM2: o.areaM2, priceAmount: o.priceAmount, lat: o.lat, lng: o.lng }));
    const est = heuristicEstimate({
      zone: l.zone,
      zonePricePerM2: ppm,
      areaM2: l.areaM2,
      beds: land ? 0 : l.beds,
      baths: land ? 0 : l.baths,
      parking: land ? 0 : l.parking,
      yearBuilt: land ? 2016 : l.yearBuilt,
      amenities: land ? [] : l.amenities,
      luxury: l.luxury,
      lat: l.lat,
      lng: l.lng,
      pool,
    });
    if (group(l) !== "sale") {
      const round = (n: number) => Math.round(n / 5) * 5;
      est.mid = round(l.priceAmount * (0.96 + (hash(l.id) % 9) / 100));
      est.low = round(est.mid * 0.9);
      est.high = round(est.mid * 1.1);
    }
    return { ...l, estimate: est };
  });
}

export const LISTINGS: Listing[] = build();
export const listingBySlug = (slug: string) => LISTINGS.find((l) => l.slug === slug);
export const listingById = (id: string) => LISTINGS.find((l) => l.id === id);
export const publicListings = () => LISTINGS.filter((l) => !l.privateListing && !["DRAFT", "WITHDRAWN", "EXPIRED"].includes(l.status));
