"use client";

import { useEffect } from "react";

/**
 * Warns before the tab is closed or reloaded while `active` (unsaved changes): the browser shows its own
 * «¿Salir del sitio?» prompt. In-app links are not blocked; drafts that autosave can pass a narrower condition.
 */
export function useUnsavedGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);
}
