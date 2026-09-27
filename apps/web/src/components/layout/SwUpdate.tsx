"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";

/** Shows "New version available" when a new service worker is waiting; applies it only when the user accepts. */
export function SwUpdate({ locale }: { locale: Locale }) {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;
    const track = (r: ServiceWorkerRegistration) => {
      if (r.waiting && navigator.serviceWorker.controller) setWaiting(r.waiting);
      r.addEventListener("updatefound", () => {
        const sw = r.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
        });
      });
    };
    // `ready` (not getRegistration) so a first visit, where the worker registers after load, is tracked too.
    navigator.serviceWorker.ready.then((r) => {
      reg = r;
      track(r);
    });
    // Reload only when an updated worker replaces the one already serving this page (accepted here or in another
    // tab). On a first visit the new worker claims the page (clientsClaim) and fires "controllerchange" as well:
    // reloading then would load every first page twice.
    let previous = navigator.serviceWorker.controller;
    let reloaded = false;
    const onChange = () => {
      const replaced = previous !== null;
      previous = navigator.serviceWorker.controller;
      if (reloaded || !replaced) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    const check = () => reg?.update().catch(() => {});
    const iv = window.setInterval(check, 30 * 60 * 1000);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      window.clearInterval(iv);
    };
  }, []);

  if (!waiting) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-np border border-navy-line bg-navy px-4 py-3 text-sm text-ivory shadow-np sm:left-auto sm:right-4" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <span className="flex-1">{tx(locale, "Hay una nueva versión de New Place.", "A new version of New Place is available.")}</span>
      <button onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })} className="flex min-h-11 items-center gap-1.5 rounded-full bg-coral-cta px-4 font-display font-semibold text-white">
        <RefreshCw size={14} aria-hidden /> {tx(locale, "Actualizar", "Update")}
      </button>
    </div>
  );
}
