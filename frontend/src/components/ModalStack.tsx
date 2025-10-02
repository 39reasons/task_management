import { createContext, useContext, useState, ReactNode } from "react";

interface ModalContextType {
  openModal: (name: string) => void;
  closeModal: (name: string) => void;
  modals: string[];
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<string[]>([]);

  const openModal = (name: string) => {
    setModals((prev) => [...prev, name]);
  };

  const closeModal = (name: string) => {
    setModals((prev) => prev.filter((m) => m !== name));
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal, modals }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside ModalProvider");
  return ctx;
}
