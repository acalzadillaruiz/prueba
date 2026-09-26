import type { AIProvider, EstimateInput, EstimateResult, LeadContext, ListingBrief, Locale, NextAction, SearchQuery } from "./types";
import { heuristicEstimate, heuristicLeadScore, heuristicSearchParse, heuristicWriteListing } from "./heuristic";

export interface OpenAICompatibleConfig {
  baseUrl: string; // e.g. https://api.openai.com/v1, https://api.groq.com/openai/v1, https://api.x.ai/v1
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

/**
 * Any OpenAI-compatible chat-completions endpoint (OpenAI, Groq, xAI, OpenRouter, local vLLM…).
 * Every method falls back to the heuristic result if the call fails or returns invalid JSON,
 * so the UI never breaks (brief §6.9).
 */
export class OpenAICompatibleProvider implements AIProvider {
  id = "openai-compatible";
  constructor(private cfg: OpenAICompatibleConfig) {}

  private async json<T>(system: string, user: string): Promise<T> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.cfg.timeoutMs ?? 12000);
    try {
      const r = await fetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${this.cfg.apiKey}` },
        body: JSON.stringify({
          model: this.cfg.model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system + " Reply with a single JSON object only." },
            { role: "user", content: user },
          ],
        }),
      });
      if (!r.ok) throw new Error(`AI HTTP ${r.status}`);
      const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const txt = d.choices?.[0]?.message?.content ?? "";
      return JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1)) as T;
    } finally {
      clearTimeout(t);
    }
  }

  async estimate(input: EstimateInput): Promise<EstimateResult> {
    // Comparables and the range stay deterministic; the model only nudges the mid value within ±10 %.
    const base = heuristicEstimate(input);
    try {
      const r = await this.json<{ mid: number; reason?: string }>(
        "You are a Venezuelan real-estate appraiser. Prices in USD.",
        `Property: ${JSON.stringify({ zone: input.zone, areaM2: input.areaM2, beds: input.beds, baths: input.baths, parking: input.parking, yearBuilt: input.yearBuilt, amenities: input.amenities, luxury: input.luxury })}. Zone price per m2: ${input.zonePricePerM2}. Comparables: ${JSON.stringify(base.comparables)}. Heuristic mid: ${base.mid}. Return {"mid": number}.`,
      );
      const mid = Math.round(Math.min(base.mid * 1.1, Math.max(base.mid * 0.9, Number(r.mid))) / 1000) * 1000;
      if (!Number.isFinite(mid)) return base;
      const spread = (base.high - base.low) / 2;
      return { ...base, mid, low: Math.round((mid - spread) / 1000) * 1000, high: Math.round((mid + spread) / 1000) * 1000, method: `llm:${this.cfg.model}+comparables` };
    } catch {
      return base;
    }
  }

  async searchParse(nl: string, locale: Locale): Promise<SearchQuery> {
    const base = heuristicSearchParse(nl);
    try {
      const r = await this.json<SearchQuery>(
        `Convert a ${locale === "es" ? "Spanish" : "English"} real-estate search into filters. listingType one of SALE|LONG_RENT|SHORT_RENT|COMMERCIAL. zone = Venezuelan neighbourhood/city. propertyKind one of apartment|penthouse|house|land. keywords: short English tags.`,
        `Query: "${nl}". Return {"listingType"?, "zone"?, "maxPrice"?, "minPrice"?, "minBeds"?, "propertyKind"?, "luxury"?, "keywords": string[]}.`,
      );
      return { ...base, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null && v !== undefined)), keywords: r.keywords ?? base.keywords };
    } catch {
      return base;
    }
  }

  async writeListing(brief: ListingBrief) {
    const base = heuristicWriteListing(brief);
    try {
      const r = await this.json<typeof base>(
        "You write concise, factual real-estate listings for Venezuela. Direct, urban tone, no hype words. Spanish is neutral (no voseo).",
        `Facts: ${JSON.stringify(brief)}. Return {"title_es","title_en","body_es","body_en"}; titles ≤ 60 chars, bodies 60–110 words.`,
      );
      return r.title_es && r.body_es && r.title_en && r.body_en ? r : base;
    } catch {
      return base;
    }
  }

  async leadScore(lead: LeadContext) {
    const base = heuristicLeadScore(lead);
    try {
      const r = await this.json<{ score: number; nextAction: NextAction; reason: string }>(
        "Score a real-estate lead 0-100 and pick nextAction from CALL|WHATSAPP_NOTE|PROPOSE_TOUR|SEND_SIMILARS|NURSE. Reason in Spanish, ≤ 8 words.",
        JSON.stringify(lead),
      );
      const ok = ["CALL", "WHATSAPP_NOTE", "PROPOSE_TOUR", "SEND_SIMILARS", "NURSE"].includes(r.nextAction);
      return ok ? { score: Math.max(0, Math.min(100, Math.round(r.score))), nextAction: r.nextAction, reason: r.reason || base.reason } : base;
    } catch {
      return base;
    }
  }
}
