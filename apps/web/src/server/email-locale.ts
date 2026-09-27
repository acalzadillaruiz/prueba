import "server-only";
import { prisma } from "@newplace/db";
import { locale as headerLocale } from "./api";

export type Loc = "es" | "en";

/** Locale of the person making this request: NEXT_LOCALE cookie (next-intl), then the page it came from, then Accept-Language. */
export function requestLocale(req: Request): Loc {
  const cookie = /(?:^|;\s*)NEXT_LOCALE=(es|en)\b/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (cookie) return cookie as Loc;
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      const seg = new URL(ref).pathname.split("/")[1];
      if (seg === "es" || seg === "en") return seg;
    } catch {}
  }
  return headerLocale(req);
}

/** Language for an email to `email`: the account's saved locale when it has one, else `fallback`. */
export async function recipientLocale(email: string | null | undefined, fallback: Loc = "es"): Promise<Loc> {
  if (!email) return fallback;
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { locale: true } });
  return u?.locale === "en" ? "en" : u?.locale === "es" ? "es" : fallback;
}

/** Date/time of a tour as the recipient reads it (always Caracas time). */
export function tourWhen(d: Date, loc: Loc) {
  return d.toLocaleString(loc === "en" ? "en-US" : "es-VE", { timeZone: "America/Caracas", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
