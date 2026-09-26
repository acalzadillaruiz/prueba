/**
 * Generates AI photos for every listing (max 6 each) + wizard/auth extras.
 *   PROVIDER=pollinations npx tsx scripts/gen-photos.ts        (no key; needs image.pollinations.ai allowed)
 *   PROVIDER=gemini GEMINI_API_KEY=… npx tsx scripts/gen-photos.ts
 * Options: ONLY=<listingId>  LIMIT=<n>  CONCURRENCY=3  DRY=1 (print prompts)
 * Resumable: existing files in public/photos are skipped. Writes src/mock/photos.manifest.ts at the end.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { LISTINGS } from "../src/mock/listings";
import type { Listing, Scene } from "../src/types/domain";

const OUT = join(__dirname, "../public/photos");
const MANIFEST = join(__dirname, "../src/mock/photos.manifest.ts");
const PER_LISTING = 6;
const PROVIDER = process.env.PROVIDER ?? (process.env.GEMINI_API_KEY ? "gemini" : "pollinations");
const CONCURRENCY = Number(process.env.CONCURRENCY ?? (PROVIDER === "gemini" ? 2 : 3));
mkdirSync(OUT, { recursive: true });

const STYLE =
  "professional real estate photography, photorealistic, wide-angle lens, natural colors, sharp focus, no people, no text, no watermark, no logos";

const KIND: Record<string, string> = {
  apartment: "apartment",
  penthouse: "penthouse",
  house: "house",
  townhouse: "townhouse",
  studio: "studio apartment",
  office: "office",
  retail: "retail space",
  warehouse: "warehouse",
  land: "plot of land",
  villa: "villa",
  chalet: "chalet",
};

function place(l: Listing) {
  if (l.city === "Caracas") return `${l.zone}, Caracas, Venezuela`;
  return `${l.zone === l.city ? l.city : `${l.zone}, ${l.city}`}, Venezuela`;
}

function view(l: Listing) {
  if (l.city === "Caracas") return "the lush green El Ávila mountain";
  if (["Lechería", "Isla de Margarita", "Los Roques", "Choroní"].includes(l.city)) return "the turquoise Caribbean sea";
  if (l.city === "Mérida") return "the Andes mountains of the Sierra Nevada";
  return "a green tropical skyline";
}

const an = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);

function scenePrompt(l: Listing, s: Scene, i: number, repeat = 0): string {
  const k = KIND[l.kind] ?? "home";
  const ak = an(k);
  const lux = l.luxury ? "ultra-luxury, high-end architectural design, magazine quality, " : "";
  const tone = ["warm afternoon light", "soft morning light", "golden hour light", "bright midday light"][i % 4];
  const p = place(l);
  const m: Record<Scene, string> = {
    "tower-dusk": `exterior of a modern residential apartment tower in ${p} at blue hour, warm lit windows, ${view(l)} in the background, royal palm trees`,
    "tower-day": `exterior of a modern residential apartment building in ${p}, clear blue sky, balconies with plants, ${view(l)} in the background, tropical trees`,
    "house-dusk": `exterior of a contemporary ${k} in ${p} at dusk, large glass windows glowing with warm light, tropical garden, palm trees`,
    "villa-pool": `modern ${k} with a swimming pool and wooden deck in ${p}, tropical garden, lounge chairs, ${tone}`,
    beach: `Caribbean beachfront ${k} in ${p}, white sand, palm trees, turquoise water, ${tone}`,
    chalet: `cozy mountain chalet in ${p}, wooden balcony, stone chimney, pine trees and the Andes mountains behind`,
    living: `bright living room of ${ak} in ${p}, large windows with a view of ${view(l)}, modern tropical furniture, wooden floor, indoor plants, ${tone}`,
    kitchen: `modern open kitchen with an island and bar stools in ${ak} in ${p}, quartz countertops, pendant lights, ${tone}`,
    bedroom: `master bedroom of ${ak} in ${p}, linen bedding, wooden headboard, window with ${view(l)}, ${tone}`,
    bath: `modern bathroom in ${ak}, porcelain tiles, walk-in glass shower, floating vanity, plants, ${tone}`,
    terrace: `terrace of ${ak} in ${p} overlooking the city and ${view(l)}, outdoor lounge furniture, potted plants, ${tone}`,
    office: `modern office space in ${p}, open workstations, glass meeting room, city view through floor-to-ceiling windows`,
    retail: `empty street-level retail space with a glass storefront in ${p}, polished concrete floor, ready to lease`,
    warehouse: `industrial warehouse in ${p}, high ceilings, loading dock with roll-up doors, clean concrete floor`,
    land: `empty residential plot of land in ${p}, green grass, wooden fence posts, mountains in the background, ${tone}`,
    lobby: `elegant lobby of a residential building in ${p}, marble floor, reception desk, warm lighting, tropical plants`,
  };
  const again: Partial<Record<Scene, string>> = {
    bedroom: `second bedroom of ${ak} in ${p} with a small desk and built-in wardrobe, ${tone}`,
    living: `dining area next to the living room of ${ak} in ${p}, wooden table for six, pendant lamp, ${tone}`,
    terrace: `balcony of ${ak} in ${p} with hammock and plants, view of ${view(l)}`,
  };
  const body = repeat > 0 && again[s] ? again[s] : m[s];
  return `${lux}${body}. ${STYLE}`;
}

type Job = { key: string; prompt: string; seed: number };

function jobs(): Job[] {
  const out: Job[] = [];
  const only = process.env.ONLY;
  for (const l of LISTINGS) {
    if (only && l.id !== only) continue;
    const seen: Partial<Record<Scene, number>> = {};
    l.scenes.slice(0, PER_LISTING).forEach((s, i) => {
      const rep = seen[s] ?? 0;
      seen[s] = rep + 1;
      out.push({ key: `${l.id}-${i}`, prompt: scenePrompt(l, s, i, rep), seed: (parseInt(l.id, 36) + i * 97) % 100000 });
    });
  }
  if (!only) {
    const alt = LISTINGS.find((l) => l.zone === "Altamira" && l.listingType === "SALE" && l.beds === 3)!;
    (["living", "kitchen", "bedroom", "bath", "terrace", "tower-day", "bedroom", "lobby", "living"] as Scene[]).forEach((s, i) =>
      out.push({ key: `upload-${i}`, prompt: scenePrompt(alt, s, i + 1), seed: 4242 + i }),
    );
    out.push({ key: "auth", prompt: `rooftop terrace in Caracas at dusk overlooking the city lights and the El Ávila mountain, lounge chairs. ${STYLE}`, seed: 777 });
  }
  const limit = Number(process.env.LIMIT ?? 0);
  return limit ? out.slice(0, limit) : out;
}

async function pollinations(j: Job): Promise<Buffer> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(j.prompt)}?width=1200&height=900&seed=${j.seed}&nologo=true&model=flux`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`pollinations ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function gemini(j: Job): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
  const base = "https://generativelanguage.googleapis.com/v1beta/models";
  if (model.startsWith("imagen")) {
    const r = await fetch(`${base}/${model}:predict`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ instances: [{ prompt: j.prompt }], parameters: { sampleCount: 1, aspectRatio: "4:3" } }),
    });
    const d = (await r.json()) as { predictions?: { bytesBase64Encoded: string }[]; error?: { message: string } };
    if (!r.ok || !d.predictions?.[0]) throw new Error(`imagen ${r.status} ${d.error?.message ?? ""}`);
    return Buffer.from(d.predictions[0].bytesBase64Encoded, "base64");
  }
  const r = await fetch(`${base}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: j.prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:3" } },
    }),
  });
  const d = (await r.json()) as { candidates?: { content: { parts: { inlineData?: { data: string } }[] } }[]; error?: { message: string } };
  const part = d.candidates?.[0]?.content.parts.find((p) => p.inlineData);
  if (!r.ok || !part?.inlineData) throw new Error(`gemini ${r.status} ${d.error?.message ?? "no image"}`);
  return Buffer.from(part.inlineData.data, "base64");
}

async function run(j: Job) {
  const file = join(OUT, `${j.key}.jpg`);
  if (existsSync(file)) return "skip";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const raw = PROVIDER === "gemini" ? await gemini(j) : await pollinations(j);
      await sharp(raw).resize(1200, 900, { fit: "cover" }).jpeg({ quality: 78, mozjpeg: true }).toFile(file);
      return "ok";
    } catch (e) {
      const msg = (e as Error).message;
      if (attempt === 4) return `fail: ${msg}`;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt + (msg.includes("429") ? 20000 : 0)));
    }
  }
  return "fail";
}

function writeManifest() {
  const keys = readdirSync(OUT).filter((f) => f.endsWith(".jpg")).map((f) => f.replace(/\.jpg$/, "")).sort();
  writeFileSync(
    MANIFEST,
    `// Generated by scripts/gen-photos.ts — do not edit by hand.\n// Keys are \`\${listingId}-\${index}\` (or extras like \`upload-0\`, \`auth\`). Photos live in /public/photos/<key>.jpg\nexport const PHOTO_KEYS: string[] = ${JSON.stringify(keys, null, 0)};\n`,
  );
  return keys.length;
}

async function main() {
  const list = jobs();
  if (process.env.MANIFEST_ONLY) return console.log(`manifest: ${writeManifest()} photos`);
  if (process.env.DRY) {
    list.slice(0, 20).forEach((j) => console.log(j.key, "→", j.prompt));
    console.log(`… ${list.length} photos total`);
    return;
  }
  console.log(`provider=${PROVIDER} photos=${list.length} concurrency=${CONCURRENCY}`);
  let i = 0;
  let done = 0;
  const fails: string[] = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < list.length) {
        const j = list[i++];
        const r = await run(j);
        done++;
        if (r.startsWith("fail")) fails.push(`${j.key} ${r}`);
        if (done % 10 === 0 || r.startsWith("fail")) console.log(`${done}/${list.length} ${j.key} ${r}`);
      }
    }),
  );
  console.log(`manifest: ${writeManifest()} photos · failed: ${fails.length}`);
  fails.slice(0, 10).forEach((f) => console.log("  ", f));
}

main();
