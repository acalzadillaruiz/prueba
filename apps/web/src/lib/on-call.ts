import { z } from "zod";
import { caracasWeekday } from "./caracas-time";

/** Guardia 24/7 rotation: weekday ("0" = Sunday … "6" = Saturday, Caracas time) → on-call user id, or null for "nobody". */
export const ON_CALL_DAYS = ["0", "1", "2", "3", "4", "5", "6"] as const;
export type OnCallDay = (typeof ON_CALL_DAYS)[number];
export type OnCallRotation = Record<OnCallDay, string | null>;

const userId = z.string().trim().min(1).max(64).regex(/^[\w-]+$/, "user id");
export const onCallSchema = z
  .object(Object.fromEntries(ON_CALL_DAYS.map((d) => [d, userId.nullable()])) as Record<OnCallDay, z.ZodNullable<typeof userId>>)
  .strict();

/** Reads whatever is stored in `Agency.onCall` (Json) as a full rotation; unknown keys and non-string values are dropped. */
export function parseRotation(raw: unknown): OnCallRotation {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(ON_CALL_DAYS.map((d) => [d, typeof src[d] === "string" && src[d] ? (src[d] as string) : null])) as OnCallRotation;
}

/** The user on call right now (Caracas weekday), or null. */
export function onCallUserId(raw: unknown, now: number | Date = Date.now()): string | null {
  return parseRotation(raw)[String(caracasWeekday(now)) as OnCallDay];
}

export const WEEKDAY_LABEL: Record<OnCallDay, [string, string]> = {
  "1": ["Lunes", "Monday"],
  "2": ["Martes", "Tuesday"],
  "3": ["Miércoles", "Wednesday"],
  "4": ["Jueves", "Thursday"],
  "5": ["Viernes", "Friday"],
  "6": ["Sábado", "Saturday"],
  "0": ["Domingo", "Sunday"],
};

/** Monday-first order for forms. */
export const WEEK_ORDER: OnCallDay[] = ["1", "2", "3", "4", "5", "6", "0"];

/** wa.me link for a phone number, or null when it has too few digits to be real. */
export function waLink(phone: string | null | undefined, text?: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Public projection of an on-call advisor (GET /api/v1/on-call): only what a listing's contact panel already shows. */
export type OnCallAdvisor = {
  agency: { id: string; name: string; initials: string; color: string };
  advisor: { name: string; initials: string; hue: number; verified: boolean; phone: string | null; tel: string | null; whatsapp: string | null };
};
