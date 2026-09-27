import { notFound } from "next/navigation";

// The layout's canonical/hreflang must not leak into a 404: no canonical, not indexable.
export const metadata = { title: "404", robots: { index: false, follow: false }, alternates: { canonical: null, languages: {} } };

/** Unknown paths under /es or /en render the localized, styled 404 (instead of the bare root one). */
export default function CatchAll() {
  notFound();
}
