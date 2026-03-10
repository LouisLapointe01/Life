"use client";

import { create } from "zustand";

type PresenceState = {
  onlineUserIds: string[];
  setOnlineUserIds: (ids: string[]) => void;
  clearOnlineUserIds: () => void;
};

function normalizeIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUserIds: [],
  setOnlineUserIds: (ids) => set({ onlineUserIds: normalizeIds(ids) }),
  clearOnlineUserIds: () => set({ onlineUserIds: [] }),
}));

export function useIsUserOnline(userId: string | null | undefined) {
  return usePresenceStore((state) => (userId ? state.onlineUserIds.includes(userId) : false));
}