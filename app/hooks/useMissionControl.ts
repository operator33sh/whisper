"use client";

import { create } from "zustand";

type View = "feed" | "mission-control" | "hashtag-feeds";

interface MissionControlStore {
  activeView: View;
  setView: (view: View) => void;
  hasPendingMentions: boolean;
  setHasPendingMentions: (value: boolean) => void;
}

export const useMissionControl = create<MissionControlStore>((set) => ({
  activeView: "feed",
  setView: (view) => set({ activeView: view }),
  hasPendingMentions: false,
  setHasPendingMentions: (value) => set({ hasPendingMentions: value }),
}));
