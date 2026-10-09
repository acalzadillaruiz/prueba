import "server-only";
import sharp from "sharp";

/**
 * Perceptual difference hash (dHash, 64 bits): grayscale 9×8, one bit per horizontal neighbour comparison.
 * Two images with hammingDistance <= DUPLICATE_MAX_DISTANCE are treated as the same photo (re-encodes, resizes,
 * small crops/colour tweaks). Shared by the seed-photo test and (later) upload moderation.
 */
export const DUPLICATE_MAX_DISTANCE = 6;
/** Max channel standard deviation (0–255) under which an image counts as a flat single-colour placeholder. */
export const FLAT_MAX_STDEV = 8;

// Decode once (JPEG shrink-on-load) to a small RGB thumbnail; dHash and the flatness check both read from it.
async function thumb(input: string | Buffer) {
  return sharp(input).removeAlpha().resize(64, 64, { fit: "fill" }).raw().toBuffer();
}

function hashThumb(rgb: Buffer): Promise<Buffer> {
  return sharp(rgb, { raw: { width: 64, height: 64, channels: 3 } }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
}

function bits(px: Buffer): bigint {
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  return h;
}

function maxChannelStdev(rgb: Buffer): number {
  let worst = 0;
  for (let c = 0; c < 3; c++) {
    let sum = 0;
    let sq = 0;
    const n = rgb.length / 3;
    for (let i = c; i < rgb.length; i += 3) {
      sum += rgb[i];
      sq += rgb[i] * rgb[i];
    }
    worst = Math.max(worst, Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2)));
  }
  return worst;
}

/** dHash + flat-colour check from a single decode. */
export async function imageSignature(input: string | Buffer): Promise<{ hash: bigint; flat: boolean }> {
  const rgb = await thumb(input);
  return { hash: bits(await hashThumb(rgb)), flat: maxChannelStdev(rgb) < FLAT_MAX_STDEV };
}

export async function dHash(input: string | Buffer): Promise<bigint> {
  return bits(await hashThumb(await thumb(input)));
}

export function hammingDistance(a: bigint, b: bigint): number {
  let v = a ^ b;
  let n = 0;
  while (v) {
    n += Number(v & 1n);
    v >>= 1n;
  }
  return n;
}

export const isNearDuplicate = (a: bigint, b: bigint) => hammingDistance(a, b) <= DUPLICATE_MAX_DISTANCE;

/** True when the image is (almost) one flat colour — a placeholder, not a photo. */
export async function isFlatColour(input: string | Buffer): Promise<boolean> {
  return maxChannelStdev(await thumb(input)) < FLAT_MAX_STDEV;
}
