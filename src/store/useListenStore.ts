import { create } from "zustand";
import type { ListenSession } from "@/lib/listen-sync";

interface ListenStore {
  session: ListenSession | null;
  jamEnabled: boolean;
  expanded: boolean;
  playerReady: boolean;
  hasUserGesture: boolean;
  setSession: (session: ListenSession | null) => void;
  setJamEnabled: (enabled: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setPlayerReady: (ready: boolean) => void;
  toggleExpanded: () => void;
  markUserGesture: () => void;
  consumeUserGesture: () => boolean;
}

export const useListenStore = create<ListenStore>((set, get) => ({
  session: null,
  jamEnabled: false,
  expanded: false,
  playerReady: false,
  hasUserGesture: false,
  setSession: (session) => set({ session }),
  setJamEnabled: (jamEnabled) => set({ jamEnabled }),
  setExpanded: (expanded) => set({ expanded }),
  setPlayerReady: (playerReady) => set({ playerReady }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  markUserGesture: () => set({ hasUserGesture: true }),
  consumeUserGesture: () => {
    const had = get().hasUserGesture;
    if (had) set({ hasUserGesture: false });
    return had;
  },
}));
