"use client";

import { create } from "zustand";
import { useRelays } from "@/app/hooks/useRelays";
import { getPubkey, signEvent } from "@/app/lib/signer";
import type { Event, SimplePool } from "nostr-tools";

const FOLLOWS_CACHE_PREFIX = "whisper:follows:";

interface FollowStore {
  follows: string[];
  loadingFollows: boolean;
  setFollows: (pubkeys: string[]) => void;
  loadFollows: (pool: SimplePool, pubkey: string) => void;
  follow: (pool: SimplePool, pubkey: string) => Promise<void>;
  unfollow: (pool: SimplePool, pubkey: string) => Promise<void>;
}

export const useFollows = create<FollowStore>((set, get) => ({
  follows: [],
  loadingFollows: true,

  setFollows: (pubkeys) => set({ follows: pubkeys }),

  loadFollows: (pool: SimplePool, pubkey: string) => {
    const cacheKey = FOLLOWS_CACHE_PREFIX + pubkey;

    // Use cached follows immediately so PrivateFeed starts without waiting
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ follows: parsed, loadingFollows: false });
        }
      }
    } catch {}

    // Fetch fresh from relays in background; update if list changed
    const sub = pool.subscribeMany(useRelays.getState().relays, [{ kinds: [3], authors: [pubkey], limit: 1 }], {
      onevent(event: Event) {
        const pubkeys = event.tags.filter((t) => t[0] === "p").map((t) => t[1]);
        try { localStorage.setItem(cacheKey, JSON.stringify(pubkeys)); } catch {}
        set({ follows: pubkeys, loadingFollows: false });
        sub.close();
      },
      oneose() {
        set({ loadingFollows: false });
      },
    });
  },

  follow: async (pool: SimplePool, pubkey: string) => {
    const currentFollows = get().follows;
    if (currentFollows.includes(pubkey)) return;

    const updatedFollows = [...currentFollows, pubkey];

    const event = await signEvent({
      kind: 3,
      created_at: Math.floor(Date.now() / 1000),
      tags: updatedFollows.map((pk) => ["p", pk]),
      content: "",
    });

    // Optimistic update before publish
    const pubkeyOwn = getNsecPubkey();
    if (pubkeyOwn) try { localStorage.setItem(FOLLOWS_CACHE_PREFIX + pubkeyOwn, JSON.stringify(updatedFollows)); } catch {}
    set({ follows: updatedFollows });

    console.log("[follow] publishing kind:3 event", event);

    try {
      await Promise.any(pool.publish(useRelays.getState().relays, event));
      console.log("[follow] relay acknowledged");
    } catch (e) {
      console.error("[follow] relay rejected or timed out:", e);
      throw e;
    }
  },

  unfollow: async (pool: SimplePool, pubkey: string) => {
    const updatedFollows = get().follows.filter((f) => f !== pubkey);

    const event = await signEvent({
      kind: 3,
      created_at: Math.floor(Date.now() / 1000),
      tags: updatedFollows.map((pk) => ["p", pk]),
      content: "",
    });

    // Optimistic update before publish
    const pubkeyOwn = getNsecPubkey();
    if (pubkeyOwn) try { localStorage.setItem(FOLLOWS_CACHE_PREFIX + pubkeyOwn, JSON.stringify(updatedFollows)); } catch {}
    set({ follows: updatedFollows });

    console.log("[unfollow] publishing kind:3 event", event);

    try {
      await Promise.any(pool.publish(useRelays.getState().relays, event));
      console.log("[unfollow] relay acknowledged");
    } catch (e) {
      console.error("[unfollow] relay rejected or timed out:", e);
      throw e;
    }
  },
}));

/** Returns the logged-in user's pubkey regardless of login method. */
export function getNsecPubkey(): string | null {
  return getPubkey();
}
