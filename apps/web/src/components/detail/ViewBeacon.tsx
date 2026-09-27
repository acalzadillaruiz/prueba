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
  // Dwell time (visible time only), sent once when the page is left; feeds the listing's "tiempo medio".
  useEffect(() => {
    const start = Date.now();
    let hiddenMs = 0;
    let hiddenAt: number | null = null;
    let sent = false;
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt) {
        hiddenMs += Date.now() - hiddenAt;
        hiddenAt = null;
      }
    };
    const send = () => {
      if (sent) return;
      sent = true;
      const s = Math.round((Date.now() - start - hiddenMs - (hiddenAt ? Date.now() - hiddenAt : 0)) / 1000);
      if (s >= 1) navigator.sendBeacon?.(`/api/v1/listings/${id}/dwell`, JSON.stringify({ s }));
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", send);
    return () => {
      send();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", send);
    };
  }, [id]);
  return null;
}
