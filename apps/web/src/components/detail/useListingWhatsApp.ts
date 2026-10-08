"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Appends this page's URL (origin + pathname, no query) to a wa.me link's prefilled text, so the advisor knows which
 * listing the visitor means. On the server / first paint the link is returned unchanged (no hydration mismatch).
 */
export function useListingWhatsApp(href: string | null | undefined): string | null {
  const here = useSyncExternalStore(noop, () => window.location.origin + window.location.pathname, () => "");
  if (!href) return null;
  if (!here) return href;
  const [base, query = ""] = href.split("?");
  const text = new URLSearchParams(query).get("text") ?? "";
  if (text.includes(here)) return href;
  return `${base}?text=${encodeURIComponent(text ? `${text}\n${here}` : here)}`;
}
