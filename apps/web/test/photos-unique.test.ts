// Seed photos (apps/web/public/photos, assigned in packages/db/prisma/seed-data/photos.ts): every photo belongs to exactly
// one listing — no identical or near-identical image (dHash Hamming <= 6) across listings or within one listing,
// at least 3 photos per listing that has photos, and no flat-colour placeholders.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LISTINGS } from "../../../packages/db/prisma/seed-data/listings";
import { MIN_SEED_PHOTOS, SEED_PHOTO_DIR, seedPhotoAssignment } from "../../../packages/db/prisma/seed-data/photos";
import { dHash, DUPLICATE_MAX_DISTANCE, hammingDistance, imageSignature, isFlatColour } from "@/lib/dhash";

const sets = seedPhotoAssignment(LISTINGS.map((l) => l.id));
const assigned = [...sets].flatMap(([listingId, files]) => files.map((file) => ({ listingId, file, path: join(SEED_PHOTO_DIR, file) })));

describe("seed listing photos", () => {
  it("every photo file in public/photos is assigned to a listing (no orphans or short sets)", () => {
    const files = readdirSync(SEED_PHOTO_DIR).filter((f) => f.endsWith(".jpg")).sort();
    expect(files).toEqual(assigned.map((a) => a.file).sort());
  });

  it(`every listing with photos has at least ${MIN_SEED_PHOTOS}`, () => {
    for (const [id, files] of sets) expect(files.length, id).toBeGreaterThanOrEqual(MIN_SEED_PHOTOS);
    expect(sets.size).toBeGreaterThan(0);
  });

  it("no duplicate or near-duplicate photos (across or within listings) and no flat-colour placeholders", async () => {
    const hashed = await Promise.all(assigned.map(async (a) => ({ ...a, ...(await imageSignature(a.path)) })));
    expect(hashed.filter((h) => h.flat).map((h) => h.file)).toEqual([]);
    const dups: string[] = [];
    for (let i = 0; i < hashed.length; i++)
      for (let j = i + 1; j < hashed.length; j++) {
        const d = hammingDistance(hashed[i].hash, hashed[j].hash);
        if (d <= DUPLICATE_MAX_DISTANCE) dups.push(`${hashed[i].file} ~ ${hashed[j].file} (distance ${d})`);
      }
    expect(dups).toEqual([]);
  });
});

describe("dHash", () => {
  it("matches a re-encoded copy and separates different photos", async () => {
    const sharp = (await import("sharp")).default;
    const [a, b] = assigned;
    const copy = await sharp(a.path).resize(320).jpeg({ quality: 50 }).toBuffer();
    expect(hammingDistance(await dHash(a.path), await dHash(copy))).toBeLessThanOrEqual(DUPLICATE_MAX_DISTANCE);
    expect(hammingDistance(await dHash(a.path), await dHash(b.path))).toBeGreaterThan(DUPLICATE_MAX_DISTANCE);
  });

  it("flags a flat single-colour image", async () => {
    const sharp = (await import("sharp")).default;
    const flat = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#d9cbb5" } }).jpeg().toBuffer();
    expect(await isFlatColour(flat)).toBe(true);
    expect(await isFlatColour(assigned[0].path)).toBe(false);
  });
});
