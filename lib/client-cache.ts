/**
 * Cache client-side simple (stale-while-revalidate).
 * Vit en mémoire le temps que l'onglet est ouvert.
 * TTL : 2 minutes. Données stales affichées instantanément,
 * données fraîches chargées en arrière-plan.
 */
const store = new Map<string, { data: unknown; ts: number }>();
const TTL = 120_000; // 2 minutes

export const clientCache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (entry && Date.now() - entry.ts < TTL) return entry.data as T;
    return null;
  },
  set<T>(key: string, data: T): void {
    store.set(key, { data, ts: Date.now() });
  },
};
