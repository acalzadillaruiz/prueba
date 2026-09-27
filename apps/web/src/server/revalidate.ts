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
