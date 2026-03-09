import { create } from "zustand";

type UnreadMessagesStore = {
  totalUnread: number;
  setTotalUnread: (count: number) => void;
  markConversationRead: (count: number) => void;
  increment: () => void;
};

export const useUnreadMessages = create<UnreadMessagesStore>((set) => ({
  totalUnread: 0,
  setTotalUnread: (count) => set({ totalUnread: count }),
  markConversationRead: (count) =>
    set((s) => ({ totalUnread: Math.max(0, s.totalUnread - count) })),
  increment: () => set((s) => ({ totalUnread: s.totalUnread + 1 })),
}));
