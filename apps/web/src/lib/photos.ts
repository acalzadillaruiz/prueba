import { PHOTO_KEYS } from "@/mock/photos.manifest";

const SET = new Set(PHOTO_KEYS);

/** URL of the AI-generated photo for a key, or undefined → caller falls back to the brand illustration. */
export function photo(key: string): string | undefined {
  return SET.has(key) ? `/photos/${key}.jpg` : undefined;
}

/** Uploaded photo (DB) first, then AI-generated photo from the manifest, else undefined (illustration). */
export const listingPhoto = (l: { id: string; photos?: string[] }, index: number) => l.photos?.[index] ?? photo(`${l.id}-${index}`);

export function photoCount(listingId: string): number {
  let n = 0;
  while (SET.has(`${listingId}-${n}`)) n++;
  return n;
}
