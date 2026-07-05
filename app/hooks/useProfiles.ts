"use client";

import { create } from "zustand";
import { useRelays } from "@/app/hooks/useRelays";
import type { SimplePool } from "nostr-tools";

export interface Profile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  banner?: string;
  website?: string;
}

interface ProfileStore {
  profiles: Map<string, Profile>;
  fetching: Set<string>;
  fetchProfiles: (pool: SimplePool, pubkeys: string[]) => void;
  setProfile: (pubkey: string, profile: Profile) => void;
}

// Batch pubkeys arriving within 150ms into a single subscription
let pendingPubkeys: string[] = [];
let batchPool: SimplePool | null = null;
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let storeSet: ((fn: (s: ProfileStore) => Partial<ProfileStore>) => void) | null = null;

function flushBatch() {
  batchTimer = null;
  const toFetch = pendingPubkeys.splice(0);
  const pool = batchPool;
  batchPool = null;
  if (toFetch.length === 0 || !pool || !storeSet) return;

  const set = storeSet;
  const sub = pool.subscribeMany(useRelays.getState().relays, [{ kinds: [0], authors: toFetch }], {
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
        toFetch.forEach((pk) => next.delete(pk));
        return { fetching: next };
      });
      sub.close();
    },
  });
}

export const useProfiles = create<ProfileStore>((set, get) => {
  storeSet = set;

  return {
    profiles: new Map(),
    fetching: new Set(),

    setProfile: (pubkey: string, profile: Profile) => {
      set((s) => {
        const next = new Map(s.profiles);
        next.set(pubkey, profile);
        return { profiles: next };
      });
    },

    fetchProfiles: (pool: SimplePool, pubkeys: string[]) => {
      const { profiles, fetching } = get();
      const missing = pubkeys.filter((pk) => !profiles.has(pk) && !fetching.has(pk));
      if (missing.length === 0) return;

      // Mark as fetching immediately to prevent duplicate requests
      set((s) => {
        const next = new Set(s.fetching);
        missing.forEach((pk) => next.add(pk));
        return { fetching: next };
      });

      pendingPubkeys.push(...missing);
      batchPool = pool;

      if (!batchTimer) {
        batchTimer = setTimeout(flushBatch, 150);
      }
    },
  };
});
