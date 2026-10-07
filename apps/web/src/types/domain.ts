import type { EstimateResult } from "@newplace/ai";
import type { Role } from "@newplace/config";

export type Locale = "es" | "en";
export type ListingType = "SALE" | "LONG_RENT" | "SHORT_RENT" | "COMMERCIAL_SALE" | "COMMERCIAL_RENT";
export type Category = "RESIDENTIAL" | "COMMERCIAL" | "LAND" | "LUXURY";
export type ListingStatus =
  | "DRAFT"
  | "COMING_SOON"
  | "ACTIVE"
  | "UNDER_OFFER"
  | "SOLD"
  | "RENTED"
  | "WITHDRAWN"
  | "EXPIRED";
export type Currency = "USD" | "VES" | "EUR";
export type Kind = "apartment" | "penthouse" | "house" | "townhouse" | "studio" | "office" | "retail" | "warehouse" | "land" | "villa" | "chalet";

export type Scene =
  | "tower-dusk"
  | "tower-day"
  | "house-dusk"
  | "villa-pool"
  | "beach"
  | "chalet"
  | "living"
  | "kitchen"
  | "bedroom"
  | "bath"
  | "terrace"
  | "office"
  | "retail"
  | "warehouse"
  | "land"
  | "lobby";

/** Backup power: "FULL" = planta eléctrica 100 %, "PARTIAL" = parcial (áreas comunes / algunos circuitos), "NONE" = no tiene. */
export type PowerBackup = "FULL" | "PARTIAL" | "NONE";

export type Amenity =
  | "pool"
  | "gym"
  | "security"
  | "generator"
  | "waterTank"
  | "view"
  | "terrace"
  | "elevator"
  | "garden"
  | "bbq"
  | "furnished"
  | "pets"
  | "ac"
  | "wifi"
  | "loadingDock";

export interface Zone {
  name: string;
  slug: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  salePpm: number;
  rentPpm: number;
  activeListings: number;
  daysOnMarket: number;
  trend12m: number;
}

export interface PriceEvent {
  date: string;
  amount: number;
  kind: "LISTED" | "DROP" | "RAISE" | "UNDER_OFFER" | "SOLD";
}

export interface Listing {
  id: string;
  slug: string;
  title_es: string;
  title_en: string;
  body_es: string;
  body_en: string;
  address: string;
  zone: string;
  city: string;
  state: string;
  countryCode: "VE";
  lat: number;
  lng: number;
  kind: Kind;
  listingType: ListingType;
  category: Category;
  luxury: boolean;
  furnished: boolean;
  pets: boolean;
  priceAmount: number;
  priceCurrency: Currency;
  pricePeriod?: "month" | "night";
  areaM2: number;
  plotM2?: number;
  beds: number;
  baths: number;
  parking: number;
  yearBuilt: number;
  amenities: Amenity[];
  /** Venezuelan essentials as data (source of truth for filters; the generator/waterTank/view tags stay for compatibility). null = unknown. */
  powerBackup?: PowerBackup | null;
  ownWell: boolean;
  /** Water tank capacity in litres; null = unknown / none declared. */
  waterTankLiters?: number | null;
  /** Private dock length in feet (Lechería canals, marinas); null = no dock. */
  dockFeet?: number | null;
  viewAvila: boolean;
  viewSea: boolean;
  status: ListingStatus;
  publishedAt: string;
  updatedAt: string;
  agencyId?: string;
  agentId?: string;
  ownerUserId?: string;
  scenes: Scene[];
  /** Uploaded photo URLs (ordered, cover first). */
  photos?: string[];
  review?: "PENDING" | "APPROVED" | "REJECTED";
  agency?: { id: string; name: string; verified: boolean; color: string; initials: string; phone: string; whatsapp: string };
  agent?: { id: string; name: string; hue: number; verified: boolean; phone?: string };
  takedownReason?: string | null;
  hasFloorplan: boolean;
  hasVideo: boolean;
  hasVirtualTour: boolean;
  /** External 360° tour (https only, validated by the listing API). */
  virtualTourUrl?: string | null;
  estimate: EstimateResult;
  priceHistory: PriceEvent[];
  daysOnMarket: number;
  /** avgTimeSec: measured average dwell time on the public page, null until a visit has been measured. */
  stats: { impressions: number; saves: number; leads: number; avgTimeSec: number | null; interactions: number };
  quality: number;
  privateListing?: boolean;
  shortRent?: { minNights: number; maxGuests: number; cleaningFee: number };
  commercial?: { ceilingHeight: number; loadingDock: boolean; zoning: string; capRate?: number };
  /** Luxury brochure (PDF URL). */
  brochurePdf?: string | null;
  fingerprint: string;
}

export interface Agency {
  id: string;
  name: string;
  slug: string;
  verified: boolean;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  city: string;
  phone: string;
  whatsapp: string;
  color: string;
  initials: string;
  commissionPct: number;
  agentSplitPct: number;
  createdAt: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  agencyId?: string;
  initials: string;
  hue: number;
  verified?: boolean;
  phone?: string;
  lastSeen: string;
}

export type LeadStage = "NEW" | "CONTACTED" | "TOUR" | "OFFER" | "WON" | "LOST";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  listingId: string;
  agentId: string;
  agencyId: string;
  stage: LeadStage;
  source: "LISTING_FORM" | "TOUR_REQUEST" | "WHATSAPP_NOTE" | "ALERT" | "REFERRAL";
  budget?: number;
  message: string;
  createdAt: string;
  firstResponseMin?: number;
  messages: number;
  toursRequested: number;
}

export interface Tour {
  id: string;
  listingId: string;
  leadId?: string;
  agentId: string;
  seekerName: string;
  start: string;
  status: "REQUESTED" | "CONFIRMED" | "DONE" | "CANCELLED";
}

export interface CaptureLead {
  id: string;
  address: string;
  zone: string;
  ownerName: string;
  phone: string;
  kind: Kind;
  areaM2: number;
  askingPrice: number;
  result: "PENDING" | "CAPTURED" | "REJECTED" | "DUPLICATE";
  duplicateOf?: string;
  createdAt: string;
  captorId: string;
}

export interface MediaJob {
  id: string;
  listingId: string;
  photographerId: string;
  date: string;
  status: "SCHEDULED" | "SHOOTING" | "UPLOADING" | "DELIVERED";
  checklist: { photos: number; cover: boolean; floorplan: boolean; video: boolean };
}

export interface Offer {
  id: string;
  listingId: string;
  bidder: string;
  amount: number;
  createdAt: string;
  status: "RECEIVED" | "COUNTERED" | "ACCEPTED" | "REJECTED";
  note: string;
}

export interface Message {
  id: string;
  from: string;
  body: string;
  at: string;
  mine?: boolean;
}

export interface EmailOutbox {
  id: string;
  to: string;
  subject: string;
  at: string;
  kind: "ALERT" | "TOUR" | "INVITE" | "VERIFY";
  status: "QUEUED" | "SENT" | "SIMULATED" | "FAILED";
}
