"use client";

import { create } from "zustand";
import { pool, RELAY_URL } from "@/app/lib/nostr";
import type { Event } from "nostr-tools";

interface FollowStore {
  follows: string[];
  setFollows: (pubkeys: string[]) => void;
  loadFollows: (pubkey: string) => Promise<void>;
}

export const useFollows = create<FollowStore>((set) => ({
  follows: [],

  setFollows: (pubkeys) => set({ follows: pubkeys }),

  loadFollows: async (pubkey: string) => {
    const event = await pool.get([RELAY_URL], {
      kinds: [3],
      authors: [pubkey],
    });

    if (event) {
      const pubkeys = (event as Event).tags
        .filter((t) => t[0] === "p")
        .map((t) => t[1]);
      set({ follows: pubkeys });
    }
  },
}));
