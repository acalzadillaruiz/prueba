"use client";

export class ApiClientError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

/** Fetch wrapper for /api/v1: JSON in/out, throws ApiClientError with the server's localized message. */
export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const lang = typeof document !== "undefined" ? document.documentElement.lang || "es" : "es";
  const r = await fetch(path.startsWith("/") ? path : `/api/v1/${path}`, {
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), "accept-language": lang, ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const ct = r.headers.get("content-type") ?? "";
  const data = ct.includes("json") ? await r.json() : await r.text();
  if (!r.ok) {
    const e = (data as { error?: { code: string; message: string; details?: unknown } })?.error;
    throw new ApiClientError(e?.code ?? "INTERNAL", e?.message ?? "Error", r.status, e?.details);
  }
  return data as T;
}
