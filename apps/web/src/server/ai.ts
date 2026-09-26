import "server-only";
import { HeuristicProvider, OpenAICompatibleProvider, type AIProvider } from "@newplace/ai";
import { getSetting } from "./data";

/** Active provider: platform setting (superadmin switch) + env keys. No key → HeuristicProvider. */
export async function aiProvider(): Promise<AIProvider> {
  const choice = await getSetting<string>("aiProvider", "heuristic");
  const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = process.env;
  if (choice === "openai-compatible" && AI_BASE_URL && AI_API_KEY && AI_MODEL) return new OpenAICompatibleProvider({ baseUrl: AI_BASE_URL, apiKey: AI_API_KEY, model: AI_MODEL });
  return new HeuristicProvider();
}

export const aiKeyConfigured = () => !!(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL);
