"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/types/domain";
import { DEMO_ENABLED } from "@/lib/demo";

/** The floating demo switch, fetched only when demo mode is on (NEXT_PUBLIC_DEMO_AUTH="true", inlined at build time):
 *  with it off, no DemoBar code is ever downloaded; with it on, it arrives after hydration (never on the critical path). */
const DemoBar = dynamic(() => import("./DemoBar").then((m) => m.DemoBar), { ssr: false });

export function DemoBarSlot({ locale }: { locale: Locale }) {
  return DEMO_ENABLED ? <DemoBar locale={locale} /> : null;
}
