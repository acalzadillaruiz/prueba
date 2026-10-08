"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/types/domain";
import { DEMO_ENABLED } from "@/lib/demo";

/** The floating demo switch, fetched only when demo mode is on (NEXT_PUBLIC_DEMO_AUTH="true", inlined at build time):
 *  with it off, no DemoBar code is ever downloaded; with it on, it arrives after hydration (never on the critical path). */
const DemoBar = dynamic(() => import("./DemoBar").then((m) => m.DemoBar), { ssr: false });

const DemoSidebarItem = dynamic(() => import("./DemoBar").then((m) => m.DemoSidebarItem), { ssr: false });

const DemoSheetItem = dynamic(() => import("./DemoBar").then((m) => m.DemoSheetItem), { ssr: false });

export function DemoBarSlot({ locale }: { locale: Locale }) {
  return DEMO_ENABLED ? <DemoBar locale={locale} /> : null;
}

/** Back-office sidebar footer (lg+): the docked demo switch, same on-demand loading as the floating one. */
export function DemoSidebarSlot({ locale }: { locale: Locale }) {
  return DEMO_ENABLED ? <DemoSidebarItem locale={locale} /> : null;
}

/** Agency "Más" sheet (below lg): the demo switch as a sheet row instead of a tab floating over the cards. */
export function DemoSheetSlot({ locale, rowClass, onDone }: { locale: Locale; rowClass: string; onDone?: () => void }) {
  return DEMO_ENABLED ? <DemoSheetItem locale={locale} rowClass={rowClass} onDone={onDone} /> : null;
}
