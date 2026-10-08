import { z } from "zod";

/** Shared Zod schemas: the same rules validate forms (React Hook Form) and API bodies. */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  agencyName: z.string().trim().min(2).max(80).optional(),
  agencyCity: z.string().max(60).optional(),
  /** Team invitation token from the email link (/register?invite=…) */
  invite: z.string().max(100).optional(),
});

export const leadSchema = z.object({
  listingId: z.string(),
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(2).max(1000),
  budget: z.number().int().positive().optional(),
  tourStart: z.string().datetime().optional(),
  virtual: z.boolean().optional(),
  /** FSBO without a free slot: when the visitor would like to come (the owner then proposes a time). */
  visitPrefs: z.array(z.enum(["WEEKDAY_AM", "WEEKDAY_PM", "WEEKEND"])).max(3).optional(),
  visitNote: z.string().trim().max(200).optional(),
  /** Vacation rentals (SHORT_RENT): the stay asked about, as calendar days ("YYYY-MM-DD"), and the party size. */
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.number().int().min(1).max(50).optional(),
});

export const captureSchema = z.object({
  address: z.string().trim().min(5).max(200),
  zone: z.string().min(2).max(80),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  kind: z.string().max(30).default("apartment"),
  areaM2: z.number().int().positive().max(1_000_000),
  askingPrice: z.number().int().positive().max(1_000_000_000),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type CaptureInput = z.input<typeof captureSchema>;

/** Homebuyer Hub pre-qualification (mock) persisted in User.prequal. */
export const prequalSchema = z.object({
  price: z.number().int().min(10_000).max(10_000_000),
  downPct: z.number().min(0).max(100),
  years: z.number().int().min(1).max(40),
  ratePct: z.number().min(0).max(50),
});

/** Offer made by a seeker from the Hub (same bounds the API enforces). */
export const offerSchema = z.object({
  amount: z.number().int().positive().max(1_000_000_000),
  note: z.string().trim().max(500).optional(),
});

export type PrequalInput = z.infer<typeof prequalSchema>;
export type OfferInput = z.infer<typeof offerSchema>;

/** Type-specific listing fields (brief §5). Same bounds in the wizard, the editor and the listings API. */
export const shortRentSchema = z.object({
  minNights: z.number().int().min(1).max(365),
  maxGuests: z.number().int().min(1).max(50),
  cleaningFee: z.number().int().min(0).max(10_000),
});

export const commercialSchema = z.object({
  /** Clear height in metres */
  ceilingHeight: z.number().min(2).max(40),
  loadingDock: z.boolean(),
  zoning: z.string().trim().min(1).max(60),
  /** % yield, optional */
  capRate: z.number().min(0).max(30).optional(),
});

/** Luxury brochure: absolute http(s) link to a PDF. */
export const brochurePdfSchema = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((u) => /^https?:\/\//i.test(u), { message: "http(s) only" });

export type ShortRentInput = z.infer<typeof shortRentSchema>;
export type CommercialInput = z.infer<typeof commercialSchema>;
