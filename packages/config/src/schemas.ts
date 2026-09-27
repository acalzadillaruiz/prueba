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
});

export const captureSchema = z.object({
  address: z.string().trim().min(5),
  zone: z.string().min(2),
  ownerName: z.string().trim().min(2),
  phone: z.string().trim().min(6),
  kind: z.string().default("apartment"),
  areaM2: z.number().int().positive(),
  askingPrice: z.number().int().positive(),
  lat: z.number().optional(),
  lng: z.number().optional(),
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
