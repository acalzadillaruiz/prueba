import type { CaptureLead, EmailOutbox, Lead, MediaJob, Message, Offer, Tour } from "@/types/domain";
import { LISTINGS } from "./listings";
import { caracasAt, inMinutes, minutesAgo } from "./people";

const L = (i: number) => LISTINGS[i].id;

export const LEADS: Lead[] = [
  { id: "ld-01", name: "Gabriela Torres", email: "gabriela.torres@gmail.com", phone: "+58 414 555 0211", listingId: L(0), agentId: "u-agent", agencyId: "ag-andes", stage: "NEW", source: "TOUR_REQUEST", budget: 185000, message: "¿Se puede visitar el sábado en la mañana? Me interesa mucho la terraza.", createdAt: minutesAgo(4), messages: 1, toursRequested: 1 },
  { id: "ld-02", name: "Jorge Castillo", email: "jorge.castillo@gmail.com", phone: "+58 424 555 0290", listingId: L(5), agentId: "u-agent", agencyId: "ag-andes", stage: "NEW", source: "LISTING_FORM", budget: 120000, message: "¿El precio es negociable? Pago de contado.", createdAt: minutesAgo(11), messages: 1, toursRequested: 0 },
  { id: "ld-03", name: "María Fernanda Ruiz", email: "mfruiz@outlook.com", listingId: L(1), agentId: "u-agent", agencyId: "ag-andes", stage: "NEW", source: "ALERT", budget: 190000, message: "Vi la alerta. ¿Tiene puesto doble?", createdAt: minutesAgo(26), messages: 1, toursRequested: 0 },
  { id: "ld-04", name: "Carlos Medina", email: "cmedina@empresa.com.ve", phone: "+58 412 555 0245", listingId: L(41), agentId: "u-agent", agencyId: "ag-andes", stage: "CONTACTED", source: "REFERRAL", budget: 950000, message: "Referido por Ricardo. Busco penthouse con piscina para mudarme en enero.", createdAt: minutesAgo(95), firstResponseMin: 6, messages: 4, toursRequested: 0 },
  { id: "ld-05", name: "Ana Lucía Pérez", email: "analucia.p@gmail.com", phone: "+58 414 555 0277", listingId: L(16), agentId: "u-agent", agencyId: "ag-andes", stage: "TOUR", source: "TOUR_REQUEST", budget: 1200, message: "Visita confirmada para mañana 10:00.", createdAt: minutesAgo(60 * 20), firstResponseMin: 9, messages: 6, toursRequested: 1 },
  { id: "ld-06", name: "Ricardo Salazar", email: "rsalazar@gmail.com", phone: "+58 424 555 0233", listingId: L(10), agentId: "u-agent", agencyId: "ag-andes", stage: "OFFER", source: "LISTING_FORM", budget: 255000, message: "Oferta enviada por 252.000 USD.", createdAt: minutesAgo(60 * 50), firstResponseMin: 12, messages: 9, toursRequested: 2 },
  { id: "ld-07", name: "Paola Hernández", email: "paola.h@gmail.com", listingId: L(14), agentId: "u-agent", agencyId: "ag-andes", stage: "OFFER", source: "TOUR_REQUEST", budget: 150000, message: "Contraoferta en revisión.", createdAt: minutesAgo(60 * 72), firstResponseMin: 4, messages: 11, toursRequested: 1 },
  { id: "ld-08", name: "Luis Alberto Gómez", email: "lagomez@gmail.com", phone: "+58 416 555 0219", listingId: L(20), agentId: "u-agent", agencyId: "ag-andes", stage: "CONTACTED", source: "WHATSAPP_NOTE", budget: 480, message: "Busca estudio por 6 meses.", createdAt: minutesAgo(60 * 6), firstResponseMin: 22, messages: 3, toursRequested: 0 },
  { id: "ld-09", name: "Andreína Blanco", email: "andreina.b@gmail.com", phone: "+58 414 555 0254", listingId: L(8), agentId: "u-agent", agencyId: "ag-andes", stage: "WON", source: "LISTING_FORM", budget: 215000, message: "Firmó opción de compra.", createdAt: minutesAgo(60 * 24 * 12), firstResponseMin: 7, messages: 18, toursRequested: 2 },
  { id: "ld-10", name: "Héctor Villalba", email: "hvillalba@gmail.com", listingId: L(29), agentId: "u-agent", agencyId: "ag-andes", stage: "LOST", source: "ALERT", budget: 40, message: "Buscaba por noche menos de 45 USD.", createdAt: minutesAgo(60 * 24 * 4), firstResponseMin: 35, messages: 2, toursRequested: 0 },
  { id: "ld-11", name: "Daniela Quintero", email: "dquintero@gmail.com", phone: "+58 412 555 0282", listingId: L(4), agentId: "u-agent2", agencyId: "ag-andes", stage: "TOUR", source: "TOUR_REQUEST", budget: 370000, message: "Visita el jueves con su esposo.", createdAt: minutesAgo(60 * 30), firstResponseMin: 5, messages: 5, toursRequested: 1 },
  { id: "ld-12", name: "Samuel Rondón", email: "srondon@gmail.com", phone: "+58 424 555 0201", listingId: L(12), agentId: "u-agent2", agencyId: "ag-andes", stage: "NEW", source: "LISTING_FORM", budget: 200000, message: "¿El estudio tiene ventana?", createdAt: minutesAgo(38), messages: 1, toursRequested: 0 },
];

export const TOURS: Tour[] = [
  { id: "tr-1", listingId: L(16), leadId: "ld-05", agentId: "u-agent", seekerName: "Ana Lucía Pérez", start: caracasAt(1, 10), status: "CONFIRMED" },
  { id: "tr-2", listingId: L(0), leadId: "ld-01", agentId: "u-agent", seekerName: "Gabriela Torres", start: caracasAt(2, 11), status: "REQUESTED" },
  { id: "tr-3", listingId: L(1), agentId: "u-agent", seekerName: "Daniel Ortega", start: caracasAt(1, 15), status: "CONFIRMED" },
  { id: "tr-4", listingId: L(41), leadId: "ld-04", agentId: "u-agent", seekerName: "Carlos Medina", start: caracasAt(3, 16), status: "CONFIRMED" },
  { id: "tr-5", listingId: L(4), leadId: "ld-11", agentId: "u-agent2", seekerName: "Daniela Quintero", start: caracasAt(2, 9), status: "CONFIRMED" },
  { id: "tr-6", listingId: L(10), leadId: "ld-06", agentId: "u-agent", seekerName: "Ricardo Salazar", start: caracasAt(-1, 11), status: "DONE" },
  { id: "tr-7", listingId: L(14), leadId: "ld-07", agentId: "u-agent", seekerName: "Paola Hernández", start: caracasAt(-2, 17), status: "DONE" },
  { id: "tr-8", listingId: L(5), agentId: "u-agent", seekerName: "Jorge Castillo", start: caracasAt(4, 14), status: "REQUESTED" },
];

/** Weekly availability of the agent (slots). Hours are local. */
export const AGENT_SLOTS = [
  { day: 0, hours: [9, 10, 11, 15, 16] },
  { day: 1, hours: [9, 10, 14, 15, 16, 17] },
  { day: 2, hours: [10, 11, 15, 16] },
  { day: 3, hours: [9, 10, 11, 14, 15] },
  { day: 4, hours: [9, 10, 11] },
];

export const CAPTURES: CaptureLead[] = [
  { id: "cp-1", address: "Av. Andrés Bello, Res. Cumbre Alta, piso 14", zone: "Los Palos Grandes", ownerName: "Familia Urdaneta", phone: "+58 414 555 0301", kind: "apartment", areaM2: 160, askingPrice: 270000, result: "DUPLICATE", duplicateOf: L(10), createdAt: minutesAgo(35), captorId: "u-captor" },
  { id: "cp-2", address: "Calle Los Laboratorios, Qta. Mi Refugio", zone: "El Hatillo", ownerName: "Pedro Aguilera", phone: "+58 412 555 0322", kind: "house", areaM2: 290, askingPrice: 330000, result: "PENDING", createdAt: minutesAgo(80), captorId: "u-captor" },
  { id: "cp-3", address: "3ra Av. Los Palos Grandes, Res. Oasis, piso 2", zone: "Los Palos Grandes", ownerName: "Beatriz Lander", phone: "+58 424 555 0344", kind: "apartment", areaM2: 118, askingPrice: 185000, result: "CAPTURED", createdAt: minutesAgo(60 * 26), captorId: "u-captor" },
  { id: "cp-4", address: "Calle Sorocaima, Edif. Altamar, piso 5", zone: "Altamira", ownerName: "Rafael Ochoa", phone: "+58 414 555 0355", kind: "apartment", areaM2: 96, askingPrice: 158000, result: "PENDING", createdAt: minutesAgo(60 * 3), captorId: "u-captor" },
  { id: "cp-5", address: "Av. Principal de La Castellana, Torre Lux, piso 3", zone: "La Castellana", ownerName: "Mónica Rivas", phone: "+58 412 555 0366", kind: "office", areaM2: 70, askingPrice: 95000, result: "REJECTED", createdAt: minutesAgo(60 * 48), captorId: "u-captor" },
  { id: "cp-6", address: "Calle Madrid, Res. Mercedes Park, piso 6", zone: "Las Mercedes", ownerName: "Tomás Pacheco", phone: "+58 424 555 0377", kind: "apartment", areaM2: 85, askingPrice: 145000, result: "DUPLICATE", duplicateOf: L(3), createdAt: minutesAgo(60 * 50), captorId: "u-captor" },
  { id: "cp-7", address: "Urb. La Boyera, Calle Principal, Casa 21", zone: "La Boyera", ownerName: "Yolanda Mora", phone: "+58 414 555 0388", kind: "house", areaM2: 210, askingPrice: 225000, result: "CAPTURED", createdAt: minutesAgo(60 * 72), captorId: "u-captor" },
  { id: "cp-8", address: "Av. Francisco de Miranda, Edif. Easo, piso 10", zone: "Chacao", ownerName: "Alejandro Ibarra", phone: "+58 412 555 0399", kind: "apartment", areaM2: 102, askingPrice: 160000, result: "PENDING", createdAt: minutesAgo(60 * 5), captorId: "u-captor" },
];

export const MEDIA_JOBS: MediaJob[] = [
  { id: "mj-1", listingId: L(0), photographerId: "u-photo", date: minutesAgo(60 * 50), status: "DELIVERED", checklist: { photos: 22, cover: true, floorplan: true, video: true } },
  { id: "mj-2", listingId: L(41), photographerId: "u-photo", date: inMinutes(60 * 3), status: "SCHEDULED", checklist: { photos: 0, cover: false, floorplan: false, video: false } },
  { id: "mj-3", listingId: L(12), photographerId: "u-photo", date: minutesAgo(60 * 2), status: "UPLOADING", checklist: { photos: 14, cover: true, floorplan: false, video: false } },
  { id: "mj-4", listingId: L(8), photographerId: "u-photo", date: inMinutes(60 * 27), status: "SCHEDULED", checklist: { photos: 0, cover: false, floorplan: false, video: false } },
  { id: "mj-5", listingId: L(6), photographerId: "u-photo", date: minutesAgo(30), status: "SHOOTING", checklist: { photos: 9, cover: true, floorplan: true, video: false } },
  { id: "mj-6", listingId: L(46), photographerId: "u-photo", date: inMinutes(60 * 75), status: "SCHEDULED", checklist: { photos: 0, cover: false, floorplan: false, video: false } },
];

export const OFFERS: Offer[] = [
  { id: "of-1", listingId: L(7), bidder: "Comprador verificado #A-218", amount: 58000, createdAt: minutesAgo(60 * 5), status: "RECEIVED", note: "Pago de contado, firma en 30 días." },
  { id: "of-2", listingId: L(7), bidder: "Comprador verificado #A-221", amount: 60500, createdAt: minutesAgo(60 * 28), status: "COUNTERED", note: "Contraoferta enviada: 61.500 USD." },
];

export const OWNER_THREAD: Message[] = [
  { id: "m1", from: "Valentina Rojas", body: "¡Hola Isabel! Soy Valentina, de Andes Prime. Me asignaron tu casa en Barquisimeto.", at: minutesAgo(60 * 50) },
  { id: "m2", from: "Isabel Contreras", body: "Hola Valentina, gracias. ¿Cuándo pueden venir a hacer las fotos?", at: minutesAgo(60 * 49), mine: true },
  { id: "m3", from: "Valentina Rojas", body: "Miguel, nuestro fotógrafo, puede ir el lunes 10:00. Incluye plano y video.", at: minutesAgo(60 * 48) },
  { id: "m4", from: "Valentina Rojas", body: "Te comparto el PlaceEstimate: 104.000–118.000 USD. Tu precio está bien posicionado.", at: minutesAgo(60 * 3) },
  { id: "m5", from: "Isabel Contreras", body: "Perfecto. En cuanto estén las fotos, ¿lo publicamos?", at: minutesAgo(42), mine: true },
];

export const LEAD_THREAD: Message[] = [
  { id: "l1", from: "Gabriela Torres", body: "Hola, ¿se puede visitar el sábado en la mañana? Me interesa mucho la terraza.", at: minutesAgo(4) },
];

export const EMAILS: EmailOutbox[] = [
  { id: "em-1", to: "seeker@gmail.com", subject: "3 nuevos en Chacao · 2+ hab · < 250.000 USD", at: minutesAgo(30), kind: "ALERT", status: "SIMULATED" },
  { id: "em-2", to: "seeker@gmail.com", subject: "Visita confirmada: Torre Alba, hoy 16:00", at: minutesAgo(60 * 3), kind: "TOUR", status: "SIMULATED" },
  { id: "em-3", to: "seeker@gmail.com", subject: "Bajó de precio: Ático luminoso en Los Palos Grandes (-4 %)", at: minutesAgo(60 * 20), kind: "ALERT", status: "SIMULATED" },
  { id: "em-4", to: "seeker@gmail.com", subject: "Nuevos hoy en Altamira · alquiler", at: minutesAgo(60 * 26), kind: "ALERT", status: "SIMULATED" },
  { id: "em-5", to: "seeker@gmail.com", subject: "Verifica tu correo en New Place", at: minutesAgo(60 * 24 * 30), kind: "VERIFY", status: "SIMULATED" },
];

export const SAVED_SEARCHES = [
  { id: "ss-1", name: { es: "Comprar · Chacao · 2+ hab · < 250k", en: "Buy · Chacao · 2+ bd · < 250k" }, query: "type=SALE&zone=Chacao&beds=2&max=250000", frequency: "instant" as const, newCount: 3, lastSent: minutesAgo(30) },
  { id: "ss-2", name: { es: "Alquiler · Altamira · amoblado", en: "Rent · Altamira · furnished" }, query: "type=LONG_RENT&zone=Altamira&furnished=1", frequency: "daily" as const, newCount: 1, lastSent: minutesAgo(60 * 26) },
  { id: "ss-3", name: { es: "Polígono · Los Palos Grandes + Altamira", en: "Polygon · Los Palos Grandes + Altamira" }, query: "poly=1", frequency: "weekly" as const, newCount: 0, lastSent: minutesAgo(60 * 24 * 4) },
];

export const FX_RATES = [
  { code: "VES", perUsd: 186.4, updatedAt: minutesAgo(60 * 6), source: "Tabla seed (manual)" },
  { code: "EUR", perUsd: 0.92, updatedAt: minutesAgo(60 * 6), source: "Tabla seed (manual)" },
];

export const AUDIT = [
  { at: minutesAgo(3), actor: "Valentina Rojas", action: "lead.stage", target: "ld-04 → CONTACTED" },
  { at: minutesAgo(12), actor: "Sofía Blanco", action: "listing.approve", target: "Apartamento práctico a pasos del metro" },
  { at: minutesAgo(40), actor: "Mariana Lugo", action: "ai.provider", target: "heuristic (default)" },
  { at: minutesAgo(95), actor: "Rosa Hernández", action: "capture.duplicate", target: "Res. Cumbre Alta, piso 14" },
  { at: minutesAgo(180), actor: "Mariana Lugo", action: "listing.takedown", target: "Oferta sospechosa · Sabana Grande (spam)" },
  { at: minutesAgo(300), actor: "Ricardo Andrade", action: "commission.rule", target: "5 % · split 50 %" },
];

export const MODERATION_QUEUE = [
  { id: "mod-1", listingId: "12q6lh", title: "Oficina 'económica' en Las Mercedes con fotos repetidas", reason: { es: "Fotos duplicadas de otro anuncio", en: "Photos duplicated from another listing" }, reporter: "Sistema · fingerprint", agency: "Orinoco Comercial", at: minutesAgo(25), severity: "high" as const },
  { id: "mod-2", listingId: "blh349", title: "Local en Las Mercedes — precio sospechoso", reason: { es: "Precio no realista", en: "Unrealistic price" }, reporter: "Usuario #u-8812", agency: "Caracas Night Realty", at: minutesAgo(140), severity: "medium" as const },
  { id: "mod-3", listingId: "1g0xf0", title: "Casa en El Hatillo", reason: { es: "Teléfono en la descripción", en: "Phone number in description" }, reporter: "Sistema · reglas", agency: "Particular", at: minutesAgo(400), severity: "low" as const },
];
