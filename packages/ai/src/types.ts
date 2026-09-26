export type Locale = "es" | "en";

export interface Comparable {
  id: string;
  title: string;
  zone: string;
  areaM2: number;
  priceAmount: number;
  pricePerM2: number;
  distanceKm: number;
}

export interface EstimateInput {
  zone: string;
  zonePricePerM2: number;
  areaM2: number;
  beds: number;
  baths: number;
  parking: number;
  yearBuilt: number;
  amenities: string[];
  luxury: boolean;
  lat: number;
  lng: number;
  /** Candidate comparables (same market). The provider picks 3–6. */
  pool: (Omit<Comparable, "distanceKm" | "pricePerM2"> & { lat: number; lng: number })[];
}

export interface EstimateResult {
  mid: number;
  low: number;
  high: number;
  confidence: number;
  comparables: Comparable[];
  method: string;
}

export interface SearchQuery {
  listingType?: "SALE" | "LONG_RENT" | "SHORT_RENT" | "COMMERCIAL";
  zone?: string;
  maxPrice?: number;
  minPrice?: number;
  minBeds?: number;
  propertyKind?: string;
  keywords: string[];
  luxury?: boolean;
}

export interface ListingBrief {
  kind: string;
  zone: string;
  city: string;
  areaM2: number;
  beds: number;
  baths: number;
  parking: number;
  amenities: string[];
  highlights?: string;
}

export interface LeadContext {
  createdMinutesAgo: number;
  budget?: number;
  listingPrice: number;
  source: "LISTING_FORM" | "TOUR_REQUEST" | "WHATSAPP_NOTE" | "ALERT" | "REFERRAL";
  messages: number;
  hasPhone: boolean;
  toursRequested: number;
}

export type NextAction = "CALL" | "WHATSAPP_NOTE" | "PROPOSE_TOUR" | "SEND_SIMILARS" | "NURSE";

export interface AIProvider {
  id: string;
  estimate(input: EstimateInput): Promise<EstimateResult>;
  searchParse(nl: string, locale: Locale): Promise<SearchQuery>;
  writeListing(brief: ListingBrief): Promise<{ title_es: string; title_en: string; body_es: string; body_en: string }>;
  leadScore(lead: LeadContext): Promise<{ score: number; nextAction: NextAction; reason: string }>;
}
