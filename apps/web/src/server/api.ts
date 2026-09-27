import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { can, type Action, type Role } from "@newplace/config";
import { auth } from "@/auth";
import { liveIdentity } from "./identity";

export type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "RATE_LIMIT" | "INTERNAL";

const MESSAGES: Record<ErrorCode, { es: string; en: string; status: number }> = {
  UNAUTHORIZED: { es: "Inicia sesión para continuar.", en: "Sign in to continue.", status: 401 },
  FORBIDDEN: { es: "No tienes permiso para esta acción.", en: "You don’t have permission to do this.", status: 403 },
  NOT_FOUND: { es: "No encontrado.", en: "Not found.", status: 404 },
  VALIDATION: { es: "Revisa los datos enviados.", en: "Please check the submitted data.", status: 422 },
  CONFLICT: { es: "Ya existe un registro igual.", en: "A matching record already exists.", status: 409 },
  RATE_LIMIT: { es: "Demasiadas solicitudes. Intenta en un momento.", en: "Too many requests. Try again shortly.", status: 429 },
  INTERNAL: { es: "Algo salió mal. Inténtalo de nuevo.", en: "Something went wrong. Please try again.", status: 500 },
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

/** Wraps a route handler: maps ApiError / ZodError / unknown errors to `{ error: { code, message } }`. */
export function handler<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    const loc = locale(req);
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.code, loc, e.details);
      if (e instanceof ZodError) return fail("VALIDATION", loc, e.flatten().fieldErrors);
      console.error("[api]", e);
      return fail("INTERNAL", loc);
    }
  };
}
