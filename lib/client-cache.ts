/**
 * Cache client persistant (stale-while-revalidate).
 *
 * - Couche primaire : Map en mémoire (accès instantané)
 * - Couche secondaire : sessionStorage (persiste entre rechargements de page)
 * - Scopé par utilisateur : appeler `setUser(id)` au login
 * - `get()` retourne TOUJOURS les données en cache (même stales)
 *   car les hooks refetchent systématiquement en arrière-plan (SWR).
 */

const memStore = new Map<string, { data: unknown; ts: number }>();
const STORAGE_PREFIX = "lc:";

export const clientCache = {
  /** Associe le cache à un utilisateur. Si l'ID change, tout est purgé. */
  setUser(userId: string) {
    if (typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem(`${STORAGE_PREFIX}__uid__`);
      if (stored && stored !== userId) {
        this.clear();
      }
      sessionStorage.setItem(`${STORAGE_PREFIX}__uid__`, userId);
    } catch {
      // sessionStorage indisponible
    }
  },

  /**
   * Retourne les données en cache ou null.
   * Ne vérifie PAS le TTL — les hooks gèrent la fraîcheur via refetch.
   */
  get<T>(key: string): T | null {
    // Mémoire d'abord (le plus rapide)
    const mem = memStore.get(key);
    if (mem) return mem.data as T;

    // Fallback : sessionStorage
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (raw) {
          const entry = JSON.parse(raw) as { data: T; ts: number };
          memStore.set(key, entry); // hydrate la mémoire
          return entry.data;
        }
      } catch {
        // JSON invalide ou storage indisponible
      }
    }

    return null;
  },

  /** Écrit dans les deux couches (mémoire + sessionStorage). */
  set<T>(key: string, data: T): void {
    const entry = { data, ts: Date.now() };
    memStore.set(key, entry);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `${STORAGE_PREFIX}${key}`,
          JSON.stringify(entry),
        );
      } catch {
        // sessionStorage plein — on garde juste la mémoire
      }
    }
  },

  /** Supprime une clé spécifique. */
  del(key: string): void {
    memStore.delete(key);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      } catch {
        // ignore
      }
    }
  },

  /** Purge tout le cache (mémoire + sessionStorage préfixé). */
  clear(): void {
    memStore.clear();
    if (typeof window !== "undefined") {
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k?.startsWith(STORAGE_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
  },
};
