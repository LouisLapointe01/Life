"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clientCache } from "@/lib/client-cache";

type LoadTask = { key: string; url: string; cacheKey: string };

const LOAD_TASKS: LoadTask[] = [
  { key: "appointments", url: "/api/appointments", cacheKey: "appointments" },
  { key: "types", url: "/api/appointments/types", cacheKey: "appointment_types" },
  { key: "contacts", url: "/api/contacts", cacheKey: "contacts" },
  { key: "conversations", url: "/api/conversations", cacheKey: "conversations" },
  { key: "google", url: "/api/google/sync", cacheKey: "google_sync" },
];

export function AppLoadingScreen({ userId, onReady }: { userId: string; onReady: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const preload = useCallback(async () => {
    clientCache.setUser(userId);
    let done = 0;

    const promises = LOAD_TASKS.map(async (task) => {
      try {
        const res = await fetch(task.url);
        if (res.ok) {
          const data = await res.json();
          // Normalize: conversations API returns { conversations: [...] }
          const payload = task.key === "conversations" ? (data.conversations || []) : (Array.isArray(data) ? data : data);
          clientCache.set(task.cacheKey, payload);
        }
      } catch {
        // Non-critical — continue
      }
      done++;
      setProgress(Math.round((done / LOAD_TASKS.length) * 100));
    });

    await Promise.all(promises);

    // Fade-out before signaling ready
    setFadeOut(true);
    setTimeout(onReady, 500);
  }, [userId, onReady]);

  useEffect(() => {
    preload();
  }, [preload]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mb-8"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-xl shadow-primary/10">
              <span className="text-3xl font-black tracking-tighter text-primary">L</span>
            </div>
          </motion.div>

          {/* App name */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-6 text-[18px] font-bold tracking-tight"
          >
            Life
          </motion.p>

          {/* Progress bar */}
          <div className="w-48 overflow-hidden rounded-full bg-foreground/[0.06] h-1.5">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 text-[12px] text-muted-foreground"
          >
            Chargement…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
