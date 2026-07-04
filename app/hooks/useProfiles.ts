"use client";

import { create } from "zustand";
import { useRelays } from "@/app/hooks/useRelays";
import type { SimplePool } from "nostr-tools";

export interface Profile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
}

interface ProfileStore {
  profiles: Map<string, Profile>;
  fetching: Set<string>;
  fetchProfiles: (pool: SimplePool, pubkeys: string[]) => void;
}

export const useProfiles = create<ProfileStore>((set, get) => ({
  profiles: new Map(),
  fetching: new Set(),

  fetchProfiles: (pool: SimplePool, pubkeys: string[]) => {
    const { profiles, fetching } = get();
    const missing = pubkeys.filter((pk) => !profiles.has(pk) && !fetching.has(pk));
    if (missing.length === 0) return;

    set((s) => {
      const next = new Set(s.fetching);
      missing.forEach((pk) => next.add(pk));
      return { fetching: next };
    });

    console.log("[useProfiles] fetching", missing.length, "profiles");

    const sub = pool.subscribeMany(useRelays.getState().relays, [{ kinds: [0], authors: missing }], {
      onevent(event) {
        try {
          const profile: Profile = JSON.parse(event.content);
          set((s) => {
            const next = new Map(s.profiles);
            next.set(event.pubkey, profile);
            return { profiles: next };
          });
        } catch {
          // malformed profile content
        }
      },
      oneose() {
        set((s) => {
          const next = new Set(s.fetching);
          missing.forEach((pk) => next.delete(pk));
          return { fetching: next };
        });
        sub.close();
      },
    });
  },
}));
