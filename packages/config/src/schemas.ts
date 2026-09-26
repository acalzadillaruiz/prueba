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
