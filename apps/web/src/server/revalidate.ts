import "server-only";
import { revalidatePath } from "next/cache";

/** Purge cached public pages after a listing changes (status, moderation, price, photos…). */
export function revalidateListing(slug?: string | null) {
  try {
    for (const l of ["es", "en"]) {
      if (slug) revalidatePath(`/${l}/listing/${slug}`);
      revalidatePath(`/${l}`);
      revalidatePath(`/${l}/luxury`);
    }
  } catch {
    // outside a request context (scripts): nothing cached to purge
  }
}

/** Purge every cached public listing page (e.g. an agency was suspended or reinstated). */
export function revalidateAllListings() {
  try {
    revalidatePath("/[locale]/listing/[slug]", "page");
    revalidateListing(null);
  } catch {
    // outside a request context
  }
}
