import { create } from "zustand";

interface MobileUiState {
  isMobileNavVisible: boolean;
  setMobileNavVisible: (visible: boolean) => void;
}

export const useMobileUiStore = create<MobileUiState>((set) => ({
  isMobileNavVisible: true,
  setMobileNavVisible: (visible) => set({ isMobileNavVisible: visible }),
}));