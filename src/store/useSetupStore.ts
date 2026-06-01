import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SetupState {
  isSetupComplete: boolean;
  syncDirectory: string;
  setSetupComplete: (complete: boolean) => void;
  setSyncDirectory: (directory: string) => void;
  resetSetup: () => void;
}

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      isSetupComplete: false,
      syncDirectory: "",
      setSetupComplete: (complete: boolean) => set({ isSetupComplete: complete }),
      setSyncDirectory: (directory: string) => set({ syncDirectory: directory }),
      resetSetup: () => set({ isSetupComplete: false, syncDirectory: "" }),
    }),
    {
      name: "setup-storage",
    }
  )
);
