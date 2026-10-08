"use client";

import { useQuery } from "@tanstack/react-query";
import type { Listing } from "@/types/domain";
import { api } from "@/lib/api";

/**
 * Published listings for a list of ids, in that order, from the public API (`/api/v1/listings?ids=`, 10 per call).
 * `known` are listings already on the page (server-rendered): only the missing ones are fetched.
 */
export function useListingsByIds(ids: string[], known: Listing[] = []) {
  const missing = ids.filter((id) => !known.some((l) => l.id === id));
  const q = useQuery({
    queryKey: ["listings-by-ids", missing.join(",")],
    enabled: missing.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const chunks: string[][] = [];
      for (let i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10));
      const pages = await Promise.all(chunks.map((c) => api<{ items: Listing[] }>(`listings?ids=${c.map(encodeURIComponent).join(",")}`)));
      return pages.flatMap((p) => p.items);
    },
  });
  const pool = [...known, ...(q.data ?? [])];
  const items = ids.map((id) => pool.find((l) => l.id === id)).filter(Boolean) as Listing[];
  return { items, loading: missing.length > 0 && q.isLoading, error: q.isError, missing: q.isSuccess ? ids.filter((id) => !pool.some((l) => l.id === id)) : [] };
}
