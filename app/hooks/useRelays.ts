"use client";

import { create } from "zustand";

const STORAGE_KEY = "whisper:relays";

export const DEFAULT_RELAYS = [
  "wss://relay.sovereignresonance.org",
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.snort.social",
];

interface RelayStore {
  relays: string[];
  initRelays: () => void;
  addRelay: (url: string) => void;
  removeRelay: (url: string) => void;
}

export const useRelays = create<RelayStore>((set, get) => ({
  relays: DEFAULT_RELAYS,

  initRelays: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ relays: parsed });
          return;
        }
      }
    } catch {
      // keep defaults
    }
  },

  addRelay: (url) => {
    const trimmed = url.trim();
    if (!trimmed || get().relays.includes(trimmed)) return;
    const relays = [...get().relays, trimmed];
    set({ relays });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relays));
  },

  removeRelay: (url) => {
    const relays = get().relays.filter((r) => r !== url);
    set({ relays });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relays));
  },
}));
