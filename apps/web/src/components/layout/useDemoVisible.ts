"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DEMO_ENABLED } from "@/lib/demo";

/**
 * Private areas (back-office, owner area, the seeker's hub, staff previews) may show the demo "sign in as…" switch.
 * Public pages never do: there the only way in is the discreet footer link "Vista previa privada" (/login?preview=1).
 */
export const PRIVATE_AREA = /^\/(es|en)\/(agency|platform|owner|app|preview)(\/|$)/;

/** Screenshots (`?shot`) leave the demo controls out; public pages never show them. */
export function useDemoVisible() {
  const [shot, setShot] = useState(false);
  const path = usePathname() ?? "";
  useEffect(() => setShot(new URLSearchParams(window.location.search).has("shot")), []);
  return DEMO_ENABLED && !shot && PRIVATE_AREA.test(path);
}
