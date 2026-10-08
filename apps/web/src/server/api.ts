import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { can, type Action, type Role } from "@newplace/config";
import { auth } from "@/auth";
import { liveIdentity } from "./identity";

export type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "RATE_LIMIT" | "INTERNAL";

const MESSAGES: Record<ErrorCode, { es: string; en: string; status: number }> = {
  UNAUTHORIZED: { es: "Inicia sesión para continuar.", en: "Sign in to continue.", status: 401 },
  FORBIDDEN: { es: "Tu cuenta no tiene acceso a esto.", en: "Your account doesn’t have access to this.", status: 403 },
  NOT_FOUND: { es: "No encontramos lo que buscas.", en: "We couldn’t find what you’re looking for.", status: 404 },
  VALIDATION: { es: "Revisa lo que escribiste: hay un dato que no cuadra.", en: "Something needs a second look. Check the details and try again.", status: 422 },
  CONFLICT: { es: "Esto ya estaba registrado.", en: "This is already on file.", status: 409 },
  RATE_LIMIT: { es: "Vas muy rápido. Espera un momento y vuelve a intentarlo.", en: "You’re going a little fast. Wait a moment and try again.", status: 429 },
  INTERNAL: { es: "Algo no salió bien de nuestro lado. Inténtalo otra vez en un momento.", en: "Something went wrong on our side. Please try again in a moment.", status: 500 },
};

export class ApiError extends Error {
  constructor(public code: ErrorCode, public details?: unknown) {
    super(code);
  }
}

export function locale(req: NextRequest | Request): "es" | "en" {
  const h = req.headers.get("accept-language") ?? "";
  const q = new URL(req.url).searchParams.get("locale");
  return q === "en" || (!q && h.startsWith("en")) ? "en" : "es";
}

export function fail(code: ErrorCode, loc: "es" | "en" = "es", details?: unknown) {
  const m = MESSAGES[code];
  return NextResponse.json({ error: { code, message: m[loc], ...(details ? { details } : {}) } }, { status: m.status });
}

export const ok = <T,>(data: T, init?: number) => NextResponse.json(data, { status: init ?? 200 });

export type SessionUser = { id: string; role: Role; agencyId: string | null; name?: string | null; email?: string | null };

export async function currentUser(): Promise<SessionUser | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  const u = await liveIdentity(s.user.id, s.user.agencyId ?? null);
  return u ? { id: u.id, role: u.role, agencyId: u.agencyId, name: u.name, email: u.email } : null;
}

export function requireUser(u: SessionUser | null): SessionUser {
  if (!u) throw new ApiError("UNAUTHORIZED");
  return u;
}

export function requireCan(u: SessionUser | null, action: Action) {
  const user = requireUser(u);
  const scope = can(user.role, action);
  if (!scope) throw new ApiError("FORBIDDEN");
  return { user, scope };
}

export async function body<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("VALIDATION", { body: "invalid JSON" });
  }
  return schema.parse(raw);
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defense-in-depth (on top of SameSite=Lax session cookies): a state-changing request whose `Origin`
 * names another host is rejected. A missing Origin is allowed (server-to-server callers such as the cron
 * with its Bearer secret, Playwright's APIRequestContext, curl); browsers always send it on cross-site writes.
 */
export function isCrossOrigin(req: Request): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host; // "null" (sandboxed iframes, data: URLs) throws → cross-origin
  } catch {
    return true;
  }
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host") || new URL(req.url).host;
  return originHost.toLowerCase() !== host.toLowerCase();
}

/** Wraps a route handler: maps ApiError / ZodError / unknown errors to `{ error: { code, message } }`. */
export function handler<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    const loc = locale(req);
    if (isCrossOrigin(req)) return fail("FORBIDDEN", loc, { origin: "cross-origin request" });
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.code, loc, e.details);
      if (e instanceof ZodError) return fail("VALIDATION", loc, e.flatten().fieldErrors);
      // Prisma "record to update/delete not found" (e.g. an unknown id in the URL) is a 404, not a 500.
      if ((e as { code?: unknown })?.code === "P2025") return fail("NOT_FOUND", loc);
      console.error("[api]", e);
      return fail("INTERNAL", loc);
    }
  };
}
