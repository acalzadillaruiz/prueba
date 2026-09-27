import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

/** Brief §3: StorageProvider (Local | Vercel Blob | S3). Local writes to UPLOAD_DIR and is served by /uploads/[...path]. */
export interface StorageProvider {
  id: string;
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  remove(key: string): Promise<void>;
}

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "../../uploads");

class LocalStorage implements StorageProvider {
  id = "local";
  async put(key: string, data: Buffer) {
    const file = join(UPLOAD_DIR, normalize(key).replace(/^(\.\.[/\\])+/, ""));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
    return `/uploads/${key}`;
  }
  async remove(key: string) {
    await unlink(join(UPLOAD_DIR, normalize(key))).catch(() => {});
  }
}

/** S3-compatible (AWS, R2, MinIO) using a pre-signed-less PUT with the bucket's public-write policy disabled by default.
 * Enable by setting STORAGE=s3, S3_PUBLIC_URL and S3_UPLOAD_URL (a proxy/presign endpoint). Kept dependency-free for v1. */
class S3Storage implements StorageProvider {
  id = "s3";
  async put(key: string, data: Buffer, contentType: string) {
    const up = process.env.S3_UPLOAD_URL;
    if (!up) throw new Error("S3_UPLOAD_URL missing");
    const r = await fetch(`${up.replace(/\/$/, "")}/${key}`, { method: "PUT", body: new Uint8Array(data), headers: { "content-type": contentType } });
    if (!r.ok) throw new Error(`S3 PUT ${r.status}`);
    return `${process.env.S3_PUBLIC_URL?.replace(/\/$/, "")}/${key}`;
  }
  async remove() {}
}

/** Vercel Blob: used automatically when BLOB_READ_WRITE_TOKEN is set (serverless hosts have no persistent disk). */
class BlobStorage implements StorageProvider {
  id = "blob";
  async put(key: string, data: Buffer, contentType: string) {
    const { put } = await import("@vercel/blob");
    const r = await put(key, data, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true });
    return r.url;
  }
  async remove(key: string) {
    const { del } = await import("@vercel/blob");
    await del(key).catch(() => {});
  }
}

function pick(): StorageProvider {
  const kind = process.env.STORAGE ?? (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local");
  if (kind === "blob") return new BlobStorage();
  if (kind === "s3") return new S3Storage();
  return new LocalStorage();
}

export const storage: StorageProvider = pick();

export async function readLocal(key: string) {
  const safe = normalize(key).replace(/^(\.\.[/\\])+/, "");
  return readFile(join(UPLOAD_DIR, safe));
}
