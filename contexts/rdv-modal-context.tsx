"use client";

import { createContext, useContext, useState } from "react";

type RdvModalContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const RdvModalContext = createContext<RdvModalContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function RdvModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <RdvModalContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </RdvModalContext.Provider>
  );
}

export function useRdvModal() {
  return useContext(RdvModalContext);
}
