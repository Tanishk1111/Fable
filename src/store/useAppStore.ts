import { create } from "zustand";

export type AppView = "intro" | "main" | "pager" | "setlist";

interface AppState {
  currentView: AppView;
  audioUnlocked: boolean;
  setView: (view: AppView) => void;
  unlockAudio: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "intro",
  audioUnlocked: false,
  setView: (view) => set({ currentView: view }),
  unlockAudio: () => set({ audioUnlocked: true }),
}));
