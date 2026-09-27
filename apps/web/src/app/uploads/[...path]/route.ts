import { readLocal } from "@/server/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", pdf: "application/pdf", mp4: "video/mp4" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  try {
    const buf = await readLocal(key);
    return new Response(new Uint8Array(buf), { headers: { "content-type": TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
