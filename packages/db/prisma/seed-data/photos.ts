/**
 * Seed photo assignment: apps/web/public/photos/<listingId>-<n>.jpg → that listing's ListingPhoto rows (in n order).
 * Every file belongs to exactly one listing (the id prefix), and a listing gets photos only if it has at least
 * MIN_SEED_PHOTOS of them — a listing without a full set shows the brand illustration instead of 1–2 lone shots.
 * apps/web/test/photos-unique.test.ts checks the files: no duplicate/near-duplicate (dHash) across or within listings,
 * no flat-colour placeholders. Never copy one listing's photos to another: remove the set instead.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const MIN_SEED_PHOTOS = 3;
export const SEED_PHOTO_DIR = join(__dirname, "../../../../apps/web/public/photos");
const FILE = /^([a-z0-9]+)-(\d+)\.jpg$/;

/** listingId → its photo filenames in order (only listings with >= MIN_SEED_PHOTOS). */
export function seedPhotoAssignment(listingIds: readonly string[], dir = SEED_PHOTO_DIR): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!existsSync(dir)) return out;
  const ids = new Set(listingIds);
  const byListing = new Map<string, { f: string; n: number }[]>();
  for (const f of readdirSync(dir)) {
    const m = FILE.exec(f);
    if (!m || !ids.has(m[1])) continue;
    byListing.set(m[1], [...(byListing.get(m[1]) ?? []), { f, n: Number(m[2]) }]);
  }
  for (const [id, files] of byListing) {
    if (files.length >= MIN_SEED_PHOTOS) out.set(id, files.sort((a, b) => a.n - b.n).map((x) => x.f));
  }
  return out;
}
