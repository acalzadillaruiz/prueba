import type { FieldError } from "react-hook-form";
import type { Locale } from "@/types/domain";
import { tx } from "./i18n";

/** Localized message for a Zod/RHF field error. */
export function fieldError(e: FieldError | undefined, locale: Locale, field: string): string | undefined {
  if (!e) return undefined;
  const t = e.type;
  if (field === "email") return tx(locale, "Escribe un email válido.", "Enter a valid email.");
  if (field === "password") return tx(locale, "Usa al menos 8 caracteres.", "Use at least 8 characters.");
  if (t === "too_small") return tx(locale, "Demasiado corto.", "Too short.");
  if (t === "too_big") return tx(locale, "Demasiado largo.", "Too long.");
  return tx(locale, "Campo no válido.", "Invalid field.");
}
