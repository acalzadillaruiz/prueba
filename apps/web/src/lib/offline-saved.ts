/** Minimal cards of the user's saved homes, kept on the device so they can be browsed offline. */
export type OfflineCard = { slug: string; title_es: string; title_en: string; price: string; zone: string; city: string };
const KEY = "np-saved-offline-v1";

export function storeSavedOffline(cards: OfflineCard[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards.slice(0, 50)));
  } catch {}
}

export function readSavedOffline(): OfflineCard[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as OfflineCard[];
  } catch {
    return [];
  }
}

export function clearSavedOffline() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
