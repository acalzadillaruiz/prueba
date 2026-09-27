"use client";

import { useEffect } from "react";

/** Counts a listing view from the browser (the page itself is cached, so the server can't count renders). */
export function ViewBeacon({ id }: { id: string }) {
  useEffect(() => {
    const key = `np-viewed-${id}`;
    try {
      if (sessionStorage.getItem(key)) return; // one view per tab session
      sessionStorage.setItem(key, "1");
    } catch {}
    const url = `/api/v1/listings/${id}/view`;
    if (!navigator.sendBeacon?.(url)) fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [id]);
  return null;
}
