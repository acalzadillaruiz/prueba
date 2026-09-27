import { notFound } from "next/navigation";

/** Unknown paths under /es or /en render the localized, styled 404 (instead of the bare root one). */
export default function CatchAll() {
  notFound();
}
